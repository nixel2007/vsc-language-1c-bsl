import * as fs from "fs";
import * as path from "path";

import * as bslglobals from "./features/bslGlobals";

let exec = require("child-process-promise").exec;
let iconv = require("iconv-lite");
let loki = require("lokijs");
let Parser = require("onec-syntaxparser");
let FileQueue = require("filequeue");
let fq = new FileQueue(500);

import * as vscode from "vscode";

export class Global {
    exec: string;
    cache: any;
    db: any;
    dblocal: any;
    dbcalls: any;
    globalfunctions: any;
    globalvariables: any;
    keywords: any;
    toreplaced: any;
    methodForDescription: any = undefined;
    private cacheUpdates: boolean;

    getCacheLocal(filename: string, word: string, source, update: boolean = false, allToEnd: boolean = true, fromFirst: boolean = true) {
        let suffix = allToEnd  ? "" : "$";
        let prefix = fromFirst ? "^" : "";
        let querystring = {"name": {"$regex": new RegExp(prefix + word + suffix, "i")}};
        let entries = new Parser().parse(source).getMethodsTable().find(querystring);
        return entries;
    }

    getRefsLocal(filename: string, source: string) {
        let parsesModule = new Parser().parse(source);
        let entries = parsesModule.getMethodsTable().find();
        let count = 0;
        let collection = this.cache.addCollection(filename);
        this.updateReferenceCalls(collection, parsesModule.context.CallsPosition, "GlobalModuleText", filename);
        for (let y = 0; y < entries.length; ++y) {
            let item = entries[y];
            this.updateReferenceCalls(collection, item._method.CallsPosition, item, filename);
        }
        return collection;
    }

    getReplaceMetadata () {
        return {
            "AccountingRegisters": "РегистрыБухгалтерии",
            "AccumulationRegisters": "РегистрыНакопления",
            "BusinessProcesses": "БизнесПроцессы",
            "CalculationRegisters": "РегистрыРасчета",
            "ChartsOfAccounts": "ПланыСчетов",
            "ChartsOfCalculationTypes": "ПланыВидовРасчета",
            "ChartsOfCharacteristicTypes": "ПланыВидовХарактеристик",
            "Constants": "Константы",
            "Catalogs": "Справочники",
            "DataProcessors": "Обработки",
            "DocumentJournals": "ЖурналыДокументов",
            "Documents": "Документы",
            "Enums": "Перечисления",
            "ExchangePlans": "ПланыОбмена",
            "InformationRegisters": "РегистрыСведений",
            "Reports": "Отчеты",
            "SettingsStorages": "ХранилищаНастроек",
            "Tasks": "Задачи"
        };
    }

    getModuleForPath(fullpath: string, rootPath: string): any {
        let splitsymbol = "/";
        let moduleArray: Array<string> = fullpath.substr(rootPath.length + (rootPath.slice(-1) === "\\" ? 0 : 1)).split(splitsymbol);
        let moduleStr: string = "";
            let hierarchy = moduleArray.length;
            if (hierarchy > 3) {
                if (moduleArray[hierarchy - 4].startsWith("CommonModules")) {
                    moduleStr = moduleArray[hierarchy - 3];
                } else if (hierarchy > 3 && this.toreplaced[moduleArray[hierarchy - 4]] !== undefined) {
                    moduleStr = this.toreplaced[moduleArray[hierarchy - 4]] + "." + moduleArray[hierarchy - 3];
                }
            }

        return moduleStr;
    }

    addtocachefiles(files: Array<string>, rootPath: any = null): any {
        if (!rootPath) {
            rootPath = this.getRootPath();
        }
        let filesLength = files.length;
        for (let i = 0; i < filesLength; ++i) {
            let fullpath = files[i].toString();
            fullpath = decodeURIComponent(fullpath);
            if (fullpath.startsWith("file:")) {
                if (process.platform === "win32") {
                    fullpath = fullpath.substr(8);
                } else {
                    fullpath = fullpath.substr(7);
                }
            }
            fq.readFile(fullpath, {encoding: "utf8"}, (err, source) => {
                if (err) {
                    throw err;
                }
                let moduleStr = "";
                if (fullpath.endsWith(".bsl")) {
                    moduleStr = this.getModuleForPath(fullpath, rootPath);
                }
                source = source.replace(/\r(?!\n)/g, "\r\n")
                let parsesModule = new Parser().parse(source);
                let entries = parsesModule.getMethodsTable().find();
                if (i % 100 === 0) {
                    this.postMessage("Обновляем кэш файла № " + i + " из " + filesLength, 2000);
                }
                this.updateReferenceCalls(this.dbcalls, parsesModule.context.CallsPosition, "GlobalModuleText", fullpath);
                for (let y = 0; y < entries.length; ++y) {
                    let item = entries[y];
                    this.updateReferenceCalls(this.dbcalls, item._method.CallsPosition, item, fullpath);
                    item["filename"] = fullpath;
                    let newItem: MethodValue = {
                        "name": String(item.name),
                        "isproc": Boolean(item.isproc),
                        "line": item.line,
                        "endline": item.endline,
                        "context": item.context,
                        "_method": item._method,
                        "filename": fullpath,
                        "module": moduleStr,
                        "description": item.description
                    };
                    this.db.insert(newItem);
                }
                if (i === filesLength - 1) {
                    this.postMessage("Обновление кэша завершено", 3000);
                    this.cacheUpdates = true;
                }
            });
        }
    }

    updateCache(): any {
        console.log("update cache");
        this.postMessage("Запущено заполнение кеша", 3000);
        let configuration = this.getConfiguration("language-1c-bsl");
        let basePath: string = String(this.getConfigurationKey(configuration, "rootPath"));
        let rootPath = this.getRootPath();
        if (rootPath) {
            rootPath = path.join(rootPath, basePath);
            this.db = this.cache.addCollection("ValueTable");
            this.dbcalls = this.cache.addCollection("Calls");

            let searchPattern = basePath !== "" ? basePath.substr(2) + "/**" : "**/*.{bsl,os}";
            this.findFilesForCache(searchPattern, rootPath);
        }
    };

    customUpdateCache(source: string, filename: string) {
        if (!this.cacheUpdates) {
            return;
        }
        let configuration = this.getConfiguration("language-1c-bsl");
        let basePath: string = String(this.getConfigurationKey(configuration, "rootPath"));
        let rootPath = path.join(this.getRootPath(), basePath);
        let fullpath = filename.replace(/\\/g, "/");
        let methodArray = this.db.find({ "filename": { "$eq": fullpath } });
        for (let index = 0; index < methodArray.length; index++) {
            let element = methodArray[index];
            this.db.remove(element["$loki"]);
        }
        let parsesModule = new Parser().parse(source);
        let moduleStr = this.getModuleForPath(fullpath, rootPath);
        let entries = parsesModule.getMethodsTable().find();
        this.updateReferenceCalls(this.dbcalls, parsesModule.context.CallsPosition, "GlobalModuleText", filename);
        for (let y = 0; y < entries.length; ++y) {
            let item = entries[y];
            this.updateReferenceCalls(this.dbcalls, item._method.CallsPosition, item, filename);
            item["filename"] = filename;
            let newItem = {
                "name": String(item.name),
                "isproc": Boolean(item.isproc),
                "line": item.line,
                "endline": item.endline,
                "context": item.context,
                "_method": item._method,
                "filename": fullpath,
                "module": moduleStr,
                "description": item.description
            };
            this.db.insert(newItem);
        }
    };


    queryref(word: string, collection: any, local: boolean = false ): any {
        if (!collection) {
            return new Array();
        }
        let prefix = local ? "" : ".";
        let querystring = {"call": {"$regex": new RegExp(prefix + word + "$", "i")}};
        let search = collection.chain().find(querystring).simplesort("name").data();
        return search;
    }

    private updateReferenceCalls(collection: any, calls: Array<any>, method: any, file: string): any {
        if (!collection) {
            collection = this.cache.addCollection("Calls");
        }
        let self = this;
        for (let index = 0; index < calls.length; index++) {
            let value = calls[index];
            if (value.call.startsWith(".")) {
                continue;
            }
            let newItem: MethodValue = {
                "name": String(method.name),
                "filename": file,
                "isproc": Boolean(method.isproc),
                "call": value.call,
                "context": method.context,
                "line": value.line,
                "character": value.character,
                "endline": method.endline
            };
            collection.insert(newItem);
        }
    }

    querydef(module: string, all: boolean = true, lazy: boolean = false): any {
        // Проверяем локальный кэш. 
        // Проверяем глобальный кэш на модули. 
        if (!this.cacheUpdates) {
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all  ? "" : "$";
            let querystring = {"module": {"$regex": new RegExp(prefix + module + suffix, "i")}};
            let search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

    query(word: string, module: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all  ? "" : "$";
            let querystring = {"name": {"$regex": new RegExp(prefix + word + suffix, "i")}};
            if (module && module.length > 0) {
                querystring["module"] = {"$regex": new RegExp("^" + module + "", "i")};
            }
            let moduleRegexp = new RegExp("^" + module + "$", "i");
            function filterByModule(obj) {
                if (module && module.length > 0) {
                    if (moduleRegexp.exec(obj.module) != null) {
                        return true;
                    } else {
                        return false;
                    }
                }
                return true;
            }
            let search = this.db.chain().find(querystring).where(filterByModule).simplesort("name").data();
            return search;
        }
    }

    GetSignature(entry) {
        let description = entry.description.replace(/\/\//g, "");
        description = description.replace(new RegExp("[ ]+", "g"), " ");
        let retState = (new RegExp("^\\s*(Возвращаемое значение|Return value|Returns):?\\n\\s*([<\\wа-яА-Я\\.>]+)(.|\\n)*", "gm")).exec(description);
        let strRetState = null;
        if (retState) {
            strRetState = retState[2];
            description = description.substr(0, retState.index);
        }
        let paramsString = "(";
        for (let element in entry._method.Params) {
            let nameParam = entry._method.Params[element];
            paramsString = (paramsString === "(" ? paramsString : paramsString + ", ") + nameParam;
            let re = new RegExp("^\\s*(Параметры|Parameters)(.|\\n)*\\n\\s*" + nameParam + "\\s*(-|–)\\s*([<\\wа-яА-Я\\.>]+)", "gm");
            let match: RegExpExecArray = null;
            if ((match = re.exec(description)) !== null) {
                paramsString = paramsString + ": " + match[4];
            }
        }
        paramsString = paramsString + ")";
        if (strRetState) {
            paramsString = paramsString + ": " + strRetState;
        }

        return { description: description, paramsString: paramsString, strRetState: strRetState, fullRetState: (!retState) ? "" : retState[0]};
    }

    GetDocParam(description: string, param) {
        let optional = false;
        let descriptionParam = "";
        let re = new RegExp("(Параметры|Parameters)(.|\\n)*\\n\\s*" + param + "\\s*(-|–)\\s*([<\\wа-яА-Я\\.>]+)\\s*-?\\s*((.|\\n)*)", "g");
        let match: RegExpExecArray = null;
        if ((match = re.exec(description)) !== null) {
            descriptionParam = match[5];
            let cast = (new RegExp("\\n\\s*[<\\wа-яА-Я\\.>]+\\s*(-|–)\\s*", "g")).exec(descriptionParam);
            if (cast) {
                descriptionParam = descriptionParam.substr(0, cast.index);

            }
        }
        let documentationParam = { optional: optional, descriptionParam: descriptionParam };
        return documentationParam;
    }

    public postMessage(description: string, interval: number) {}

    public getConfiguration(section:string) {}

    public getConfigurationKey(configuration, key: string) {}
    
    public getRootPath(): string {
        return "";
    }
    
    public fullNameRecursor(word: string, document, range, left: boolean): string {
        return "";
    }
    
    public findFilesForCache(searchPattern: string, rootPath: string) {}
    
    constructor(exec: string) {
        let configuration = this.getConfiguration("language-1c-bsl");
        let autocompleteLanguage: any = this.getConfigurationKey(configuration, "languageAutocomplete");
        let postfix = "";
        if (autocompleteLanguage === "en") {
            postfix = "_en";
        }
        this.toreplaced = this.getReplaceMetadata();
        this.cache = new loki("gtags.json");
        this.cacheUpdates = false;
        this.globalfunctions = {};
        this.globalvariables = {};
        let globalfunctions = bslglobals.globalfunctions();
        let globalvariables = bslglobals.globalvariables();
        this.keywords = bslglobals.keywords()[autocompleteLanguage];
        for (let element in globalfunctions) {
            let new_name = globalfunctions[element]["name" + postfix];
            let new_element = {};
            new_element["name"] =  new_name;
            new_element["description"] = globalfunctions[element].description;
            new_element["signature"] = globalfunctions[element].signature;
            this.globalfunctions[new_name.toLowerCase()] = new_element;
        }
        for (let element in globalvariables) {
            let new_name = globalvariables[element]["name" + postfix];
            let new_element = {};
            new_element["name"] =  new_name;
            new_element["description"] = globalvariables[element].description;
            this.globalvariables[new_name.toLowerCase()] = new_element;
        }
    }
}

interface MethodValue {
    // Имя процедуры/функции'
    name: string;
    // Процедура = true, Функция = false
    isproc: boolean;
    // начало
    line: number;
    // конец процедуры
    endline: number;

    filename: string;
    // контекст НаСервере, НаКлиенте, НаСервереБезКонтекста
    context?: string;
    module?: string;
    description?: string;
    call?: string;
    character?: number;
    _method?: {};
}

/// <reference path="node.d.ts" />