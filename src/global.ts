import * as path from "path";

import * as bslglobals from "./features/bslGlobals";
import * as oscriptStdLib from "./features/oscriptStdLib";

let loki = require("lokijs");
let Parser = require("onec-syntaxparser");
let FileQueue = require("filequeue");
let fq = new FileQueue(500);

export class Global {
    public cache: any;
    public db: any;
    public dbcalls: Map<string, Array<{}>>;
    public globalfunctions: any;
    public globalvariables: any;
    public keywords: any;
    public systemEnum: any;
    public classes: any;
    public toreplaced: any;
    public methodForDescription: any = undefined;
    public syntaxFilled: string = "";
    public hoverTrue: boolean = true;
    private cacheUpdates: boolean;

    public getCacheLocal(filename: string, word: string, source, update: boolean = false, allToEnd: boolean = true, fromFirst: boolean = true) {
        let suffix = allToEnd ? "" : "$";
        let prefix = fromFirst ? "^" : "";
        let querystring = { "name": { "$regex": new RegExp(prefix + word + suffix, "i") } };
        let entries = new Parser().parse(source).getMethodsTable().find(querystring);
        return entries;
    }

    public getRefsLocal(filename: string, source: string) {
        let parsesModule = new Parser().parse(source);
        let entries = parsesModule.getMethodsTable().find();
        let collection = this.cache.addCollection(filename);
        this.updateReferenceCallsOld(collection, parsesModule.context.CallsPosition, "GlobalModuleText", filename);
        for (let y = 0; y < entries.length; ++y) {
            let item = entries[y];
            this.updateReferenceCallsOld(collection, item._method.CallsPosition, item, filename);
        }
        return collection;
    }

    public getReplaceMetadata() {
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

    public getModuleForPath(fullpath: string, rootPath: string): any {
        let splitsymbol = "/";
        let moduleArray: Array<string> = fullpath.substr(rootPath.length + (rootPath.slice(-1) === "\\" ? 0 : 1)).split(splitsymbol);
        let moduleStr = "";
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

    public addtocachefiles(files: Array<string>, rootPath: string): any {
        let filesLength = files.length;
        let substrIndex = (process.platform === "win32") ? 8 : 7;
        for (let i = 0; i < filesLength; ++i) {
            let fullpath = files[i].toString();
            fullpath = decodeURIComponent(fullpath);
            if (fullpath.startsWith("file:")) {
                fullpath = fullpath.substr(substrIndex);
            }
            fq.readFile(fullpath, { encoding: "utf8" }, (err, source) => {
                if (err) {
                    throw err;
                }
                let moduleStr = fullpath.endsWith(".bsl") ? this.getModuleForPath(fullpath, rootPath) : "";
                source = source.replace(/\r\n?/g, "\n");
                let parsesModule = new Parser().parse(source);
                source = undefined;
                let entries = parsesModule.getMethodsTable().find();
                if (i % 100 === 0) {
                    this.postMessage("Обновляем кэш файла № " + i + " из " + filesLength, 2000);
                }
                if (parsesModule.context.CallsPosition.length > 0) {
                    this.updateReferenceCalls(parsesModule.context.CallsPosition, "GlobalModuleText", fullpath);
                }
                parsesModule = undefined;
                for (let y = 0; y < entries.length; ++y) {
                    let item = entries[y];
                    let method = { name: item.name, endline: item.endline, context: item.context, isproc: item.isproc };
                    if (item._method.CallsPosition.length > 0) {
                        this.updateReferenceCalls(item._method.CallsPosition, method, fullpath);
                    }
                    let _method = { Params: item._method.Params, IsExport: item._method.IsExport };
                    let newItem: IMethodValue = {
                        "name": String(item.name),
                        "isproc": Boolean(item.isproc),
                        "line": item.line,
                        "endline": item.endline,
                        "context": item.context,
                        "_method": _method,
                        "filename": fullpath,
                        "module": moduleStr,
                        "description": item.description
                    };
                    this.db.insert(newItem);
                }
                if (i === filesLength - 1) {
                    this.postMessage("Кэш обновлен");
                    this.cacheUpdates = true;
                }
            });
        }
    }

    public updateCache(): any {
        let configuration = this.getConfiguration("language-1c-bsl");
        let basePath: string = String(this.getConfigurationKey(configuration, "rootPath"));
        let rootPath = this.getRootPath();
        if (rootPath) {
            console.log("update cache");
            this.postMessage("Запущено заполнение кеша", 3000);
            rootPath = path.join(rootPath, basePath);
            if (this.cache.getCollection ("ValueTable")) {
                this.cache.removeCollection("ValueTable");
            }
            this.db = this.cache.addCollection("ValueTable");
            this.dbcalls = new Map();
            let searchPattern = basePath !== "" ? basePath.substr(2) + "/**" : "**/*.{bsl,os}";
            this.findFilesForCache(searchPattern, rootPath);
        }
    };

    public customUpdateCache(source: string, filename: string) {
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
        for (let index = 0; index < this.cache.getCollection(filename).data.length; index++) {
            let value = this.cache.getCollection(filename).data[index];
            if (value.call.startsWith(".")) {
                continue;
            }
            if (value.call.indexOf(".") === -1) {
                continue;
            }
            let arrCalls = this.dbcalls.get(value.call);
            if (arrCalls) {
                for (let k = arrCalls.length - 1; k >= 0; --k) {
                    let it = arrCalls[k];
                    if (it["filename"] === fullpath) {
                        arrCalls.splice(k, 1);
                    }
                }
            }
        }
        this.cache.removeCollection(filename);
        this.getRefsLocal(filename, source);
        this.updateReferenceCalls(parsesModule.context.CallsPosition, "GlobalModuleText", fullpath);
        for (let y = 0; y < entries.length; ++y) {
            let item = entries[y];
            this.updateReferenceCalls(item._method.CallsPosition, item, fullpath);
            let _method = { Params: item._method.Params, IsExport: item._method.IsExport };
            let newItem = {
                "name": String(item.name),
                "isproc": Boolean(item.isproc),
                "line": item.line,
                "endline": item.endline,
                "context": item.context,
                "_method": _method,
                "filename": fullpath,
                "module": moduleStr,
                "description": item.description
            };
            this.db.insert(newItem);
        }
    };

    public queryref(word: string, collection: any, local: boolean = false): any {
        if (!collection) {
            return new Array();
        }
        let prefix = local ? "" : ".";
        let querystring = { "call": { "$regex": new RegExp(prefix + word + "$", "i") } };
        let search = collection.chain().find(querystring).simplesort("name").data();
        return search;
    }


    public querydef(module: string, all: boolean = true, lazy: boolean = false): any {
        // Проверяем локальный кэш. 
        // Проверяем глобальный кэш на модули. 
        if (!this.cacheUpdates) {
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all ? "" : "$";
            let querystring = { "module": { "$regex": new RegExp(prefix + module + suffix, "i") } };
            let search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

    public query(word: string, module: string, all: boolean = true, lazy: boolean = false): any {
        let prefix = lazy ? "" : "^";
        let suffix = all ? "" : "$";
        let querystring = { "name": { "$regex": new RegExp(prefix + word + suffix, "i") } };
        if (module && module.length > 0) {
            querystring["module"] = { "$regex": new RegExp("^" + module + "", "i") };
        }
        let moduleRegexp = new RegExp("^" + module + "$", "i");
        function filterByModule(obj) {
            if (module && module.length > 0) {
                if (moduleRegexp.exec(obj.module) !== undefined) {
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

    public GetSignature(entry) {
        let description = entry.description.replace(/\/\//g, "");
        description = description.replace(new RegExp("[ ]+", "g"), " ");
        let retState = (new RegExp("^\\s*(Возвращаемое значение|Return value|Returns):?\\n\\s*([<\\wа-яА-Я\\.>]+)(.|\\n)*", "gm")).exec(description);
        let strRetState = undefined;
        if (retState) {
            strRetState = retState[2];
            description = description.substr(0, retState.index);
        }
        let paramsString = "(";
        for (let element in entry._method.Params) {
            let nameParam = entry._method.Params[element];
            paramsString = (paramsString === "(" ? paramsString : paramsString + ", ") + nameParam;
            let re = new RegExp("^\\s*(Параметры|Parameters)(.|\\n)*\\n\\s*" + nameParam + "\\s*(-|–)\\s*([<\\wа-яА-Я\\.>]+)", "gm");
            let match: RegExpExecArray = re.exec(description);
            if (match) {
                paramsString = paramsString + ": " + match[4];
            }
        }
        paramsString = paramsString + ")";
        if (strRetState) {
            paramsString = paramsString + ": " + strRetState;
        }
        return { description: description, paramsString: paramsString, strRetState: strRetState, fullRetState: (!retState) ? "" : retState[0] };
    }

    public GetDocParam(description: string, param) {
        let optional = false;
        let descriptionParam = "";
        let re = new RegExp("(Параметры|Parameters)(.|\\n)*\\n\\s*" + param + "\\s*(-|–)\\s*([<\\wа-яА-Я\\.>]+)\\s*-?\\s*((.|\\n)*)", "g");
        let match: RegExpExecArray = re.exec(description);
        if (match) {
            descriptionParam = match[5];
            let cast = (new RegExp("\\n\\s*[<\\wа-яА-Я\\.>]+\\s*(-|–)\\s*", "g")).exec(descriptionParam);
            if (cast) {
                descriptionParam = descriptionParam.substr(0, cast.index);
            }
        }
        let documentationParam = { optional: optional, descriptionParam: descriptionParam };
        return documentationParam;
    }

    public redefineMethods(adapter) {
        let methodsList = [
            "postMessage",
            "getConfiguration",
            "getConfigurationKey",
            "getRootPath",
            "fullNameRecursor",
            "findFilesForCache"
        ];
        methodsList.forEach(element => {
            if (adapter.hasOwnProperty(element)) {
                this[element] = adapter[element];
            }
        });
    }

    public postMessage(description: string, interval?: number) {}

    public getConfiguration(section: string) {}

    public getConfigurationKey(configuration, key: string) {}

    public getRootPath(): string {
        return "";
    }

    public fullNameRecursor(word: string, document, range, left: boolean): string {
        return "";
    }

    public findFilesForCache(searchPattern: string, rootPath: string) {}

    constructor(adapter?: any) {
        if (adapter) {
            this.redefineMethods(adapter);
        }
        let configuration = this.getConfiguration("language-1c-bsl");
        let autocompleteLanguage: any = this.getConfigurationKey(configuration, "languageAutocomplete");
        let postfix = (autocompleteLanguage === "en") ? "_en" : "";
        this.toreplaced = this.getReplaceMetadata();
        this.cache = new loki("gtags.json");
        this.cacheUpdates = false;
        this.globalfunctions = {};
        this.globalvariables = {};
        this.systemEnum = {};
        this. classes = {};
        let globalfunctions = bslglobals.globalfunctions();
        let globalvariables = bslglobals.globalvariables();
        this.keywords = bslglobals.keywords()[autocompleteLanguage];
        for (let element in globalfunctions) {
            let newName = globalfunctions[element]["name" + postfix];
            let newElement = {};
            newElement["name"] = newName;
            newElement["alias"] = (postfix === "_en") ? globalfunctions[element]["name"] : globalfunctions[element]["name_en"];
            newElement["description"] = globalfunctions[element].description;
            newElement["signature"] = globalfunctions[element].signature;
            newElement["returns"] = globalfunctions[element].returns;
            this.globalfunctions[newName.toLowerCase()] = newElement;
        }
        for (let element in oscriptStdLib.globalContextOscript()) {
            let segment = oscriptStdLib.globalContextOscript()[element];
            for (let key in segment["methods"]) {
                if (this.globalfunctions[segment["methods"][key]["name" + postfix].toLowerCase()]) {
                    let globMethod = this.globalfunctions[segment["methods"][key]["name" + postfix].toLowerCase()];
                    globMethod["oscript_signature"] = { "default": { "СтрокаПараметров": segment["methods"][key].signature, "Параметры": segment["methods"][key].params } };
                    globMethod["oscript_description"] = segment["methods"][key].description;
                } else {
                    let newElement = {};
                    let newName = segment["methods"][key]["name" + postfix];
                    newElement["name"] = newName;
                    newElement["alias"] = (postfix === "_en") ? segment["methods"][key]["name"] : segment["methods"][key]["name_en"];
                    newElement["description"] = undefined;
                    newElement["signature"] = undefined;
                    newElement["returns"] = segment["methods"][key].returns;
                    newElement["oscript_signature"] = { "default": { "СтрокаПараметров": segment["methods"][key].signature, "Параметры": segment["methods"][key].params } };
                    newElement["oscript_description"] = segment["methods"][key].description;
                    this.globalfunctions[newName.toLowerCase()] = newElement;
                }
            }
        }
        for (let element in globalvariables) {
            let newName = globalvariables[element]["name" + postfix];
            let newElement = {};
            newElement["name"] = newName;
            newElement["alias"] = (postfix === "_en") ? globalvariables[element]["name"] : globalvariables[element]["name_en"];
            newElement["description"] = globalvariables[element].description;
            this.globalvariables[newName.toLowerCase()] = newElement;
        }
        for (let element in oscriptStdLib.globalContextOscript()) {
            let segment = oscriptStdLib.globalContextOscript()[element];
            for (let key in segment["properties"]) {
                if (this.globalvariables[segment["properties"][key]["name" + postfix].toLowerCase()]) {
                    let globVar = this.globalvariables[segment["properties"][key]["name" + postfix].toLowerCase()];
                    globVar["oscript_description"] = segment["properties"][key].description;
                    globVar["oscript_access"] = segment["properties"][key].access;
                } else {
                    let newElement = {};
                    let newName = segment["properties"][key]["name" + postfix];
                    newElement["name"] = newName;
                    newElement["alias"] = (postfix === "_en") ? segment["properties"][key]["name"] : segment["properties"][key]["name_en"];
                    newElement["description"] = undefined;
                    newElement["oscript_description"] = segment["properties"][key].description;
                    newElement["oscript_access"] = segment["properties"][key].access;
                    this.globalvariables[newName.toLowerCase()] = newElement;
                }
            }
        }
        for (let element in bslglobals.systemEnum()) {
            let segment = bslglobals.systemEnum()[element];
            let newName = segment["name" + postfix];
            let newElement = {};
            newElement["name"] = newName;
            newElement["alias"] = (postfix === "_en") ? segment["name"] : segment["name_en"];
            newElement["description"] = segment.description;
            newElement["values"] = [];
            for (let key in segment["values"]) {
                let newNameValues = segment["values"][key]["name" + postfix];
                let elementValues = {};
                elementValues["name"] = newName;
                elementValues["alias"] = (postfix === "_en") ? segment["values"][key]["name"] : segment["values"][key]["name_en"];
                elementValues["description"] = segment.description;
                newElement["values"].push(elementValues);
            }
            this.systemEnum[newName.toLowerCase()] = newElement;
        }
        for (let element in oscriptStdLib.systemEnum()) {
            let segment = oscriptStdLib.systemEnum()[element];
            let newName = segment["name" + postfix];
            if (this.systemEnum[newName.toLowerCase()]) {
                let findEnum = this.systemEnum[newName.toLowerCase()];
                findEnum["oscript_description"] = segment.description;
            } else {
                let newElement = {};
                newElement["name"] = newName;
                newElement["alias"] = (postfix === "_en") ? segment["name"] : segment["name_en"];
                newElement["description"] = undefined;
                newElement["values"] = [];
                newElement["oscript_description"] = segment.description;
                for (let key in segment["values"]) {
                    let newNameValues = segment["values"][key]["name" + postfix];
                    let elementValues = {};
                    elementValues["name"] = newName;
                    elementValues["alias"] = (postfix === "_en") ? segment["values"][key]["name"] : segment["values"][key]["name_en"];
                    elementValues["description"] = segment.description;
                    newElement["values"].push(elementValues);
                }
                this.systemEnum[newName.toLowerCase()] = newElement;
            }
        }
        for (let element in bslglobals.classes()) {
            let segment = bslglobals.classes()[element];
            let newName = segment["name" + postfix];
            let newElement = {};
            newElement["name"] = newName;
            newElement["alias"] = (postfix === "_en") ? segment["name"] : segment["name_en"];
            newElement["description"] = segment.description;
            newElement["methods"] = (segment["methods"]) ? {} : undefined;
            for (let key in segment["methods"]) {
                let newNameMethod = segment["methods"][key]["name" + postfix];
                let newMethod = {};
                newMethod["name"] = newName;
                newMethod["alias"] = (postfix === "_en") ? segment["methods"][key]["name"] : segment["methods"][key]["name_en"];
                newMethod["description"] = segment["methods"][key].description;
                newElement["methods"][newNameMethod.toLowerCase()] = newMethod;
            }
            newElement["properties"] = (segment["properties"]) ? {} : undefined;
            for (let key in segment["properties"]) {
                let newNameProp = segment["properties"][key]["name" + postfix];
                let newProp = {};
                newProp["name"] = newName;
                newProp["alias"] = (postfix === "_en") ? segment["properties"][key]["name"] : segment["properties"][key]["name_en"];
                newProp["description"] = segment["properties"][key].description;
                newElement["properties"][newNameProp.toLowerCase()] = newProp;
            }
            newElement["constructors"] = (segment["constructors"]) ? {} : undefined;
            for (let key in segment["constructors"]) {
                let newCntr = {};
                newCntr["signature"] = segment["constructors"][key].signature;
                newCntr["description"] = segment["constructors"][key].description;
                newElement["constructors"][key.toLowerCase()] = newCntr;
            }
            this.classes[newName.toLowerCase()] = newElement;
        }
        for (let element in oscriptStdLib.classesOscript()) {
            let segment = oscriptStdLib.classesOscript()[element];
            let newName = segment["name" + postfix];
            if (this.classes[newName.toLowerCase()]) {
                let findClass = this.classes[newName.toLowerCase()];
                findClass["oscript_description"] = (segment.description) ? (segment.description) : findClass.description;
                for (let key in segment["methods"]) {
                    let findMethod = segment["methods"][key];
                    let nameMethod = findMethod["name" + postfix];
                    if (!findMethod) {
                        findMethod = {};
                        findMethod["name"] = nameMethod;
                        findMethod["alias"] = (postfix === "_en") ? segment["methods"][key]["name"] : segment["methods"][key]["name_en"];
                        findMethod["description"] = undefined;
                        findMethod["oscript_description"] = segment["methods"][key]["description"];
                        findClass["methods"][nameMethod.toLowerCase()] = findMethod;
                    } else {
                        findMethod["oscript_description"] = segment["methods"][key]["description"];
                    }
                }
                for (let key in segment["properties"]) {
                    let findProp = segment["properties"][key];
                    let nameProp = findProp["name" + postfix];
                    if (!findProp) {
                        findProp = {};
                        findProp["name"] = nameProp;
                        findProp["alias"] = (postfix === "_en") ? segment["properties"][key]["name"] : segment["properties"][key]["name_en"];
                        findProp["description"] = undefined;
                        findProp["oscript_description"] = segment["properties"][key]["description"];
                        findClass["properties"][nameProp.toLowerCase()] = findProp;
                    } else {
                        findProp["oscript_description"] = segment["properties"][key]["description"];
                    }
                }
                for (let key in segment["constructors"]) {
                    let findCntr = segment["constructors"][key];
                    if (!findCntr) {
                        findCntr = {};
                        findCntr["description"] = undefined;
                        findCntr["oscript_description"] = segment["constructors"][key]["description"];
                        findClass["constructors"][key.toLowerCase()] = findCntr;
                    } else {
                        findCntr["oscript_description"] = segment["constructors"][key]["description"];
                    }
                }
            } else {
                let newElement = {};
                newElement["name"] = newName;
                newElement["alias"] = (postfix === "_en") ? segment["name"] : segment["name_en"];
                newElement["description"] = undefined;
                newElement["oscript_description"] = segment.description;
                newElement["methods"] = (segment["methods"]) ? {} : undefined;
                for (let key in segment["methods"]) {
                    let newNameMethod = segment["methods"][key]["name" + postfix];
                    let newMethod = {};
                    newMethod["name"] = newName;
                    newMethod["alias"] = (postfix === "_en") ? segment["methods"][key]["name"] : segment["methods"][key]["name_en"];
                    newMethod["description"] = undefined;
                    newMethod["oscript_description"] = segment["methods"][key].description;
                    newElement["methods"][newNameMethod.toLowerCase()] = newMethod;
                }
                newElement["properties"] = (segment["properties"]) ? {} : undefined;
                for (let key in segment["properties"]) {
                    let newNameProp = segment["properties"][key]["name" + postfix];
                    let newProp = {};
                    newProp["name"] = newName;
                    newProp["alias"] = (postfix === "_en") ? segment["properties"][key]["name"] : segment["properties"][key]["name_en"];
                    newProp["description"] = undefined;
                    newProp["oscript_description"] = segment["properties"][key].description;
                    newElement["properties"][newNameProp.toLowerCase()] = newProp;
                }
                newElement["constructors"] = (segment["constructors"]) ? {} : undefined;
                for (let key in segment["constructors"]) {
                    let newCntr = {};
                    newCntr["signature"] = segment["constructors"][key].signature;
                    newCntr["description"] = undefined;
                    newCntr["oscript_description"] = segment["constructors"][key].description;
                    newElement["constructors"][key.toLowerCase()] = newCntr;
                }
                this.classes[newName.toLowerCase()] = newElement;
            }
        }
    }

    private updateReferenceCalls(calls: Array<any>, method: any, file: string): any {
        for (let index = 0; index < calls.length; index++) {
            let value = calls[index];
            if (value.call.startsWith(".")) {
                continue;
            }
            if (value.call.indexOf(".") === -1) {
                continue;
            }
            let arrCalls = this.dbcalls.get(value.call);
            if (!arrCalls) {
                this.dbcalls.set(value.call, []);
                arrCalls = this.dbcalls.get(value.call);
            }
            arrCalls.push({ filename: file, call: value.call, line: value.line, character: value.character, name: String(method.name) });
        }
    }

    private updateReferenceCallsOld(collection: any, calls: Array<any>, method: any, file: string): any {
        for (let index = 0; index < calls.length; index++) {
            let value = calls[index];
            if (value.call.startsWith(".")) {
                continue;
            }
            let newItem: IMethodValue = {
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
}

interface IMethodValue {
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
