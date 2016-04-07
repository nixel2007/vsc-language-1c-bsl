import * as fs from "fs";
import * as path from "path";

import * as bslglobals from "./features/bslGlobals";
// import keyword from "./features/bslGlobals";

let exec = require("child-process-promise").exec;
let iconv = require("iconv-lite");
let loki = require("lokijs");
let Parser = require("onec-syntaxparser");

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
    private toreplaced: any;
    private cacheUpdates: boolean;
    private pathSeparator: string;

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
        let added = {};
        this.updateReferenceCalls(collection, parsesModule.context.CallsPosition, "GlobalModuleText", filename, added);
        for (let y = 0; y < entries.length; ++y) {
            added = {};
            let item = entries[y];
            this.updateReferenceCalls(collection, item._method.CallsPosition, item, filename, added);
        }
        return collection;
    }

    getReplaceMetadata () {
        return {
            "AccountingRegisters": "РегистрыБухгалтерии",
            "AccumulationRegisters": "РегистрыНакопления",
            "BusinessProcesses": "БизнессПроцессы",
            "CalculationRegisters": "РегистрыРасчета",
            "Catalogs": "Справочники",
            "Documents": "Документы",
            "DataProcessors": "Обработки",
            "Reports": "Отчеты",
            "InformationRegisters": "РегистрыСведений",
            "ExchangePlans": "ПланыОбмена"
        };
    }

    getModuleForPath(fullpath: string, rootPath: string): any {
        if (!this.toreplaced) {
            this.toreplaced = this.getReplaceMetadata();
        }

        fullpath = decodeURIComponent(fullpath);
        let splitsymbol = process.platform === "win32" ? "\\" : "/";
        if (fullpath.startsWith("file:")) {
            splitsymbol = "/";
            if (process.platform === "win32") {
                fullpath = fullpath.substr(8);
            } else {
                fullpath = fullpath.substr(7);
            }
        }
        let isbsl = fullpath.endsWith(".bsl") ? true : false;
        let moduleArray: Array<string> = fullpath.substr(rootPath.length + 1).split(splitsymbol);
        let module: string = "";
        if (isbsl) {
            let test = false;
            if (moduleArray.length > 1) {
                if (moduleArray[0].startsWith("CommonModules")) {
                    module = moduleArray[1];
                } else if (moduleArray.length > 3 && this.toreplaced[moduleArray[0]] !== undefined) {
                    moduleArray[0] = this.toreplaced[moduleArray[0]];
                    module = moduleArray[0] + "." + moduleArray[1];
                }
            }
        };
        return {"fullpath": fullpath,
                "module": module};
    }

    private addtocachefiles(files: Array<vscode.Uri>, isbsl: boolean = false, rootPath: any = null): any {
        let failed = new Array();
        if (!rootPath) {
            rootPath = vscode.workspace.rootPath;
        }
        let replaced = this.getReplaceMetadata();
        let filesLength = files.length;
        for (let i = 0; i < filesLength; ++i) {
            //vscode.window.setStatusBarMessage("Обновляем список " + i + " из " + files.length, 1000);
            let fullpath = files[i].toString();
            let moduleObj = this.getModuleForPath(fullpath, rootPath);
            let module = moduleObj.module;
            fullpath = moduleObj.fullpath;
            fs.readFile(fullpath, "utf-8", (err, source) => {
                if (err) {
                    throw err;
                }
                let parsesModule = new Parser().parse(source);
                let entries = parsesModule.getMethodsTable().find();
                let count = 0;
                let added = {};
                this.updateReferenceCalls(this.dbcalls, parsesModule.context.CallsPosition, "GlobalModuleText", fullpath, added);
                for (let y = 0; y < entries.length; ++y) {
                    let item = entries[y];
                    this.updateReferenceCalls(this.dbcalls, item._method.CallsPosition, item, fullpath, added);
                    item["filename"] = fullpath;
                    let newItem: MethodValue = {
                        "name": String(item.name),
                        "isproc": Boolean(item.isproc),
                        "line": item.line,
                        "endline": item.endline,
                        "context": item.context,
                        "_method": item._method,
                        "filename": fullpath,
                        "module": module,
                        "description": item.description
                    };
                    ++count;
                    this.db.insert(newItem);
                }
                if (i = filesLength) {
                    vscode.window.setStatusBarMessage("Обновлен список процедур.", 3000);
                }    
            });            
        }
    }

    updateCache(filename: string = ""): any {
        console.log("update cache");
        this.cacheUpdates = true;
        let configuration = vscode.workspace.getConfiguration("language-1c-bsl");
        let basePath: string = String(configuration.get("rootPath"));
        let rootPath = vscode.workspace.rootPath;
        if (!basePath) {
            basePath = ".";
        }
        if (rootPath) {
            rootPath = path.join(vscode.workspace.rootPath, basePath);
            this.db = this.cache.addCollection("ValueTable");
            this.dbcalls = this.cache.addCollection("Calls");

            let self = this;
            let files = vscode.workspace.findFiles("**" + basePath.substr(1) + "**/*.os", "", 1000);
            files.then((value) => {
                this.addtocachefiles(value, false, rootPath);
            }, (reason) => {
                console.log(reason);
            });
            files = vscode.workspace.findFiles("**" + basePath.substr(1) + "**/**/*Forms*/**/*Ext*/*Form*/*.bsl", "", 10000);
            files.then((value) => {
                this.addtocachefiles(value, true, rootPath);
            }, (reason) => {
                console.log(reason);
            });
            files = vscode.workspace.findFiles("**" + basePath.substr(1) + "**/**/*Ext*/*.bsl", "", 10000);
            files.then((value) => {
                this.addtocachefiles(value, true, rootPath);
            }, (reason) => {
                console.log(reason);
            });
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

    private updateReferenceCalls(collection: any, calls: Array<any>, method: any, file: string, added: any): any {
        if (!collection) {
            collection = this.cache.addCollection("Calls");
        }
        let self = this;
        for (let index = 0; index < calls.length; index++) {
            let value = calls[index];
            if (added[value.call] === true) {
                continue;
            };
            if (value.call.startsWith(".")) {
                continue;
            }
            added[value.call] = true;
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

    querydef(filename: string, module: string, all: boolean = true, lazy: boolean = false): any {
        // Проверяем локальный кэш. 
        // Проверяем глобальный кэш на модули. 
        // console.log(filename);
        if (!this.cacheUpdates) {
            this.updateCache(filename);
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all  ? "" : "$";
            let querystring = {"module": {"$regex": new RegExp(prefix + module + suffix, "i")}};
            let search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

    query(filename: string, word: string, module: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            this.updateCache(filename);
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

    fullNameRecursor(word: string, document: vscode.TextDocument, range: vscode.Range, left: boolean) {
        let result: string;
        let plus: number = 1;
        let newRange: vscode.Range;
        if (left) {
            plus = -1;
            if (range.start.character === 0) {
                return word;
            }
            newRange = new vscode.Range(new vscode.Position(range.start.line, range.end.character - word.length + plus), new vscode.Position(range.start.line, range.start.character));
        } else {
            newRange = new vscode.Range(new vscode.Position(range.end.line, range.end.character), new vscode.Position(range.end.line, range.end.character + plus));
        }
        let dot = document.getText(newRange);
        if (dot.endsWith(".")) {
            let newPosition: vscode.Position;
            if (left) {
                let leftWordRange: vscode.Range = document.getWordRangeAtPosition(newRange.start);
                result = document.getText(leftWordRange) + "." + word;
                if (leftWordRange.start.character > 1) {
                    newPosition = new vscode.Position(leftWordRange.start.line, leftWordRange.start.character - 1);
                } else {
                    newPosition = new vscode.Position(leftWordRange.start.line, 0);
                }
            } else {
                result = word + "." + document.getText(document.getWordRangeAtPosition(newRange.start));
                newPosition = new vscode.Position(newRange.end.line, newRange.end.character + 2);
            }
            if (document.getText(new vscode.Range(new vscode.Position(newPosition.line,newPosition.character+1), newPosition)) === "."){
                let newWord = document.getWordRangeAtPosition(newPosition);
                return document.getText(newWord) +  "." + result;
            }
            return result;
        } else {
            result = word;
            return result;
        }
    }
    
    public asAbsolutePath(resource: vscode.Uri): string {
		if (resource.scheme !== "file") {
			return null;
		}
		let result = resource.fsPath;
		// Both \ and / must be escaped in regular expressions
		return result ? result.replace(new RegExp('\\' + this.pathSeparator, 'g'), '/') : null;
	}
    
    public asUrl(filepath: string): vscode.Uri {
		return vscode.Uri.file(filepath);
	}

    constructor(exec: string) {
        let configuration = vscode.workspace.getConfiguration("language-1c-bsl");
        let autocompleteLanguage: any = configuration.get("languageAutocomplete");
        if (!autocompleteLanguage) {
            autocompleteLanguage = "ru";
        }
        this.globalfunctions = bslglobals.globalfunctions()[autocompleteLanguage];
        this.globalvariables = bslglobals.globalvariables()[autocompleteLanguage];
        this.keywords = bslglobals.keywords()[autocompleteLanguage];
        this.cache = new loki("gtags.json");
        this.cacheUpdates = false;
        this.pathSeparator = path.sep;
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