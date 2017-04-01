import * as cp from "cross-spawn";
import * as fs from "fs-promise";
import * as glob from "glob";
import * as path from "path";

import * as bslglobals from "./features/bslGlobals";
import * as oscriptStdLib from "./features/oscriptStdLib";

import loki = require("lokijs");
import Parser = require("onec-syntaxparser");
import FileQueue = require("filequeue");
import xml2js = require("xml2js");
const fq = new FileQueue(500);

export class Global {

    public static create(adapter?: any): Global {
        if (!Global.instance) {
            Global.instance = new Global(adapter);
        }
        return Global.instance;
    }

    private static instance: Global;

    public cache: any;
    public db: any;
    public dbcalls: Map<string, any[]>;
    public globalfunctions: IMethods;
    public globalvariables: IGlobalVariables;
    public keywords: IKeywordsForLanguage;
    public systemEnum: ISystemEnums;
    public classes: IClasses;
    public toreplaced: any;
    public methodForDescription: any = undefined;
    public syntaxFilled: string = "";
    public hoverTrue: boolean = true;
    private bslCacheUpdated: boolean;
    private oscriptCacheUpdated: boolean;

    constructor(adapter?: any) {
        if (adapter) {
            this.redefineMethods(adapter);
        }
        const configuration = this.getConfiguration("language-1c-bsl");
        const autocompleteLanguage: any = this.getConfigurationKey(configuration, "languageAutocomplete");
        const postfix = (autocompleteLanguage === "en") ? "_en" : "";
        this.toreplaced = this.getReplaceMetadata();
        this.cache = new loki("gtags.json");
        this.globalfunctions = {} as IMethods;
        this.globalvariables = {} as IGlobalVariables;
        this.systemEnum = {} as ISystemEnums;
        this.classes = {} as IClasses;
        const globalfunctions: IMethods = bslglobals.globalfunctions();
        const globalvariables: IGlobalVariables = bslglobals.globalvariables();
        this.keywords = bslglobals.keywords()[autocompleteLanguage];
        for (const key in globalfunctions) {
            const globalFunction = globalfunctions[key];
            const newName = globalFunction["name" + postfix];
            const newElement: IMethod = {} as IMethod;
            newElement.name = newName;
            newElement.alias = (postfix === "_en") ? globalFunction.name : globalFunction.name_en;
            newElement.description = globalFunction.description;
            newElement.signature = globalFunction.signature;
            newElement.returns = globalFunction.returns;
            this.globalfunctions[newName.toLowerCase()] = newElement;
        }
        const globalContextOscript: IOscriptGlobalContext = oscriptStdLib.globalContextOscript();
        for (const segmentKey in globalContextOscript) {
            const segmentMethods = globalContextOscript[segmentKey].methods;
            for (const methodKey in segmentMethods) {
                const method = segmentMethods[methodKey];
                if (this.globalfunctions[method["name" + postfix].toLowerCase()]) {
                    const globMethod = this.globalfunctions[method["name" + postfix].toLowerCase()];
                    globMethod.oscript_signature = {
                        default: {
                            СтрокаПараметров: method.signature,
                            Параметры: method.params
                        }
                    };
                    globMethod.oscript_description = method.description;
                } else {
                    const newElement: IMethod = {} as IMethod;
                    const newName = method["name" + postfix];
                    newElement.name = newName;
                    newElement.alias = (postfix === "_en") ? method.name : method.name_en;
                    newElement.description = undefined;
                    newElement.signature = undefined;
                    newElement.returns = method.returns;
                    newElement.oscript_signature = {
                        default: {
                            СтрокаПараметров: method.signature,
                            Параметры: method.params
                        }
                    };
                    newElement.oscript_description = method.description;
                    this.globalfunctions[newName.toLowerCase()] = newElement;
                }
            }
        }
        for (const element in globalvariables) {
            if (!globalvariables.hasOwnProperty(element)) {
                continue;
            }
            const newName = globalvariables[element]["name" + postfix];
            const newElement: IGlobalVariable = {} as IGlobalVariable;
            newElement.name = newName;
            newElement.alias = (postfix === "_en") ? globalvariables[element].name : globalvariables[element].name_en;
            newElement.description = globalvariables[element].description;
            this.globalvariables[newName.toLowerCase()] = newElement;
        }
        for (const element in globalContextOscript) {
            if (!globalContextOscript.hasOwnProperty(element)) {
                continue;
            }
            const segment = globalContextOscript[element];
            for (const key in segment.properties) {
                if (this.globalvariables[segment.properties[key]["name" + postfix].toLowerCase()]) {
                    const globVar = this.globalvariables[segment.properties[key]["name" + postfix].toLowerCase()];
                    globVar.oscript_description = segment.properties[key].description;
                    globVar.oscript_access = segment.properties[key].access;
                } else {
                    const newElement: IGlobalVariable = {} as IGlobalVariable;
                    const newName = segment.properties[key]["name" + postfix];
                    newElement.name = newName;
                    newElement.alias = (postfix === "_en")
                        ? segment.properties[key].name
                        : segment.properties[key].name_en;
                    newElement.description = undefined;
                    newElement.oscript_description = segment.properties[key].description;
                    newElement.oscript_access = segment.properties[key].access;
                    this.globalvariables[newName.toLowerCase()] = newElement;
                }
            }
        }
        let systemEnum: ISystemEnums = bslglobals.systemEnum();
        for (const element in systemEnum) {
            if (!systemEnum.hasOwnProperty(element)) {
                continue;
            }
            const segment = systemEnum[element];
            const newName = segment["name" + postfix];
            const newElement: ISystemEnum = {} as ISystemEnum;
            newElement.name = newName;
            newElement.alias = (postfix === "_en") ? segment.name : segment.name_en;
            newElement.description = segment.description;
            newElement.values = [];
            const values = segment.values;
            for (const key in values) {
                if (!values.hasOwnProperty(key)) {
                    continue;
                }
                const newNameValues = values[key]["name" + postfix];
                const elementValue: ISystemEnumValue = {} as ISystemEnumValue;
                elementValue.name = newName;
                elementValue.alias = (postfix === "_en") ? values[key].name : values[key].name_en;
                elementValue.description = values[key].description;
                newElement.values.push(elementValue);
            }
            this.systemEnum[newName.toLowerCase()] = newElement;
        }
        systemEnum = oscriptStdLib.systemEnum();
        for (const element in systemEnum) {
            if (!systemEnum.hasOwnProperty(element)) {
                continue;
            }
            const segment = systemEnum[element];
            const newName = segment["name" + postfix];
            if (this.systemEnum[newName.toLowerCase()]) {
                const findEnum = this.systemEnum[newName.toLowerCase()];
                findEnum.oscript_description = segment.description;
            } else {
                const newElement: ISystemEnum = {} as ISystemEnum;
                newElement.name = newName;
                newElement.alias = (postfix === "_en") ? segment.name : segment.name_en;
                newElement.description = undefined;
                newElement.values = [];
                newElement.oscript_description = segment.description;
                const values = segment.values;
                for (const key in values) {
                    if (!values.hasOwnProperty(key)) {
                        continue;
                    }
                    const newNameValues = values[key]["name" + postfix];
                    const elementValue: ISystemEnumValue = {} as ISystemEnumValue;
                    elementValue.name = newName;
                    elementValue.alias = (postfix === "_en") ? values[key].name : values[key].name_en;
                    elementValue.description = values[key].description;
                    newElement.values.push(elementValue);
                }
                this.systemEnum[newName.toLowerCase()] = newElement;
            }
        }
        const classes: IClasses = bslglobals.classes();
        for (const element in classes) {
            if (!classes.hasOwnProperty(element)) {
                continue;
            }
            const segment = classes[element];
            const newName = segment["name" + postfix];
            const newElement: IClass = {} as IClass;
            newElement.name = newName;
            newElement.alias = (postfix === "_en") ? segment.name : segment.name_en;
            newElement.description = segment.description;
            newElement.methods = (segment.methods) ? {} : undefined;
            for (const key in segment.methods) {
                const method = segment.methods[key];
                const newNameMethod = method["name" + postfix];
                const newMethod: IMethod = {} as IMethod;
                newMethod.name = newName;
                newMethod.alias = (postfix === "_en") ? method.name : method.name_en;
                newMethod.description = method.description;
                newElement.methods[newNameMethod.toLowerCase()] = newMethod;
            }
            newElement.properties = (segment.properties) ? {} : undefined;
            for (const key in segment.properties) {
                const property = segment.properties[key];
                const newNameProp = property["name" + postfix];
                const newProp: IPropertyDefinition = {} as IPropertyDefinition;
                newProp.name = newName;
                newProp.alias = (postfix === "_en") ? property.name : property.name_en;
                newProp.description = property.description;
                newElement.properties[newNameProp.toLowerCase()] = newProp;
            }
            newElement.constructors = (segment.constructors) ? {} : undefined;
            for (const key in segment.constructors) {
                const constructor = segment.constructors[key];
                const newCntr: IConstructorDefinition = {} as IConstructorDefinition;
                newCntr.signature = constructor.signature;
                newCntr.description = constructor.description;
                newElement.constructors[key.toLowerCase()] = newCntr;
            }
            this.classes[newName.toLowerCase()] = newElement;
        }
        const classesOscript: IClasses = oscriptStdLib.classesOscript();
        for (const element in classesOscript) {
            if (!classesOscript.hasOwnProperty(element)) {
                continue;
            }
            const segment = classesOscript[element];
            const newName = segment["name" + postfix];
            if (this.classes[newName.toLowerCase()]) {
                const findClass = this.classes[newName.toLowerCase()];
                findClass.oscript_description = (segment.description) ? (segment.description) : findClass.description;
                for (const key in segment.methods) {
                    let findMethod = segment.methods[key];
                    const nameMethod = findMethod["name" + postfix];
                    // TODO: Тут происходит что-то странное
                    if (!findMethod) {
                        findMethod = {} as IMethod;
                        findMethod.name = nameMethod;
                        findMethod.alias = (postfix === "_en")
                            ? segment.methods[key].name
                            : segment.methods[key].name_en;
                        findMethod.description = undefined;
                        findMethod.oscript_description = segment.methods[key].description;
                        findClass.methods[nameMethod.toLowerCase()] = findMethod;
                    } else {
                        findMethod.oscript_description = segment.methods[key].description;
                    }
                }
                for (const key in segment.properties) {
                    let findProp = segment.properties[key];
                    const nameProp = findProp["name" + postfix];
                    // TODO: Тут происходит что-то странное
                    if (!findProp) {
                        findProp = {} as IPropertyDefinition;
                        findProp.name = nameProp;
                        findProp.alias = (postfix === "_en")
                            ? segment.properties[key].name
                            : segment.properties[key].name_en;
                        findProp.description = undefined;
                        findProp.oscript_description = segment.properties[key].description;
                        findClass.properties[nameProp.toLowerCase()] = findProp;
                    } else {
                        findProp.oscript_description = segment.properties[key].description;
                    }
                }
                for (const key in segment.constructors) {
                    let findCntr = segment.constructors[key];
                    if (!findCntr) {
                        findCntr = {} as IConstructorDefinition;
                        findCntr.description = undefined;
                        findCntr.oscript_description = segment.constructors[key].description;
                        findClass.constructors[key.toLowerCase()] = findCntr;
                    } else {
                        findCntr.oscript_description = segment.constructors[key].description;
                    }
                }
            } else {
                const newElement: IClass = {} as IClass;
                newElement.name = newName;
                newElement.alias = (postfix === "_en") ? segment.name : segment.name_en;
                newElement.description = undefined;
                newElement.oscript_description = segment.description;
                newElement.methods = (segment.methods) ? {} : undefined;
                for (const key in segment.methods) {
                    const newNameMethod = segment.methods[key]["name" + postfix];
                    const newMethod: IMethod = {} as IMethod;
                    newMethod.name = newName;
                    newMethod.alias = (postfix === "_en") ? segment.methods[key].name : segment.methods[key].name_en;
                    newMethod.description = undefined;
                    newMethod.oscript_description = segment.methods[key].description;
                    newElement.methods[newNameMethod.toLowerCase()] = newMethod;
                }
                newElement.properties = (segment.properties) ? {} : undefined;
                for (const key in segment.properties) {
                    const newNameProp = segment.properties[key]["name" + postfix];
                    const newProp: IPropertyDefinition = {} as IPropertyDefinition;
                    newProp.name = newName;
                    newProp.alias = (postfix === "_en")
                        ? segment.properties[key].name
                        : segment.properties[key].name_en;
                    newProp.description = undefined;
                    newProp.oscript_description = segment.properties[key].description;
                    newElement.properties[newNameProp.toLowerCase()] = newProp;
                }
                newElement.constructors = (segment.constructors) ? {} : undefined;
                for (const key in segment.constructors) {
                    const newCntr: IConstructorDefinition = {} as IConstructorDefinition;
                    newCntr.signature = segment.constructors[key].signature;
                    newCntr.description = undefined;
                    newCntr.oscript_description = segment.constructors[key].description;
                    newElement.constructors[key.toLowerCase()] = newCntr;
                }
                this.classes[newName.toLowerCase()] = newElement;
            }
        }
    }

    public getCacheLocal(
        filename: string,
        word: string,
        source,
        update: boolean = false,
        allToEnd: boolean = true,
        fromFirst: boolean = true
    ) {
        const suffix = allToEnd ? "" : "$";
        const prefix = fromFirst ? "^" : "";
        const querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
        const entries = new Parser().parse(source).getMethodsTable().find(querystring);
        return entries;
    }

    public getRefsLocal(filename: string, source: string) {
        const parsesModule = new Parser().parse(source);
        const entries = parsesModule.getMethodsTable().find();
        const collection = this.cache.addCollection(filename);
        this.updateReferenceCallsOld(collection, parsesModule.context.CallsPosition, "GlobalModuleText", filename);
        for (const item of entries) {
            this.updateReferenceCallsOld(collection, item._method.CallsPosition, item, filename);
        }
        return collection;
    }

    public getReplaceMetadata() {
        return {
            AccountingRegisters: "РегистрыБухгалтерии",
            AccumulationRegisters: "РегистрыНакопления",
            BusinessProcesses: "БизнесПроцессы",
            CalculationRegisters: "РегистрыРасчета",
            ChartsOfAccounts: "ПланыСчетов",
            ChartsOfCalculationTypes: "ПланыВидовРасчета",
            ChartsOfCharacteristicTypes: "ПланыВидовХарактеристик",
            Constants: "Константы",
            Catalogs: "Справочники",
            DataProcessors: "Обработки",
            DocumentJournals: "ЖурналыДокументов",
            Documents: "Документы",
            Enums: "Перечисления",
            ExchangePlans: "ПланыОбмена",
            InformationRegisters: "РегистрыСведений",
            Reports: "Отчеты",
            SettingsStorages: "ХранилищаНастроек",
            Tasks: "Задачи"
        };
    }

    public getModuleForPath(fullpath: string, rootPath: string): any {
        const splitsymbol = "/";
        const moduleArray: string[] = fullpath.substr(
            rootPath.length + (rootPath.slice(-1) === "\\" ? 0 : 1)
        ).split(splitsymbol);
        let moduleStr = "";
        const hierarchy = moduleArray.length;
        if (hierarchy > 3) {
            if (moduleArray[hierarchy - 4].startsWith("CommonModules")) {
                moduleStr = moduleArray[hierarchy - 3];
            } else if (hierarchy > 3 && this.toreplaced[moduleArray[hierarchy - 4]] !== undefined) {
                moduleStr = this.toreplaced[moduleArray[hierarchy - 4]] + "." + moduleArray[hierarchy - 3];
            }
        }
        return moduleStr;
    }

    public async waitForCacheUpdate() {
        while (!this.cacheUpdated()) {
            await this.delay(100);
        }
    }

    public addtocachefiles(files: string[], rootPath: string): any {
        const filesLength = files.length;
        const substrIndex = (process.platform === "win32") ? 8 : 7;
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
                const moduleStr = fullpath.endsWith(".bsl") ? this.getModuleForPath(fullpath, rootPath) : "";
                source = source.replace(/\r\n?/g, "\n");
                let parsesModule = new Parser().parse(source);
                source = undefined;
                const entries = parsesModule.getMethodsTable().find();
                if (i % 100 === 0) {
                    this.postMessage("Обновляем кэш файла № " + i + " из " + filesLength, 2000);
                }
                if (parsesModule.context.CallsPosition.length > 0) {
                    this.updateReferenceCalls(parsesModule.context.CallsPosition, "GlobalModuleText", fullpath);
                }
                parsesModule = undefined;
                for (const item of entries) {
                    const method = {
                        name: item.name,
                        endline: item.endline,
                        context: item.context,
                        isproc: item.isproc
                    };
                    if (item._method.CallsPosition.length > 0) {
                        this.updateReferenceCalls(item._method.CallsPosition, method, fullpath);
                    }
                    const dbMethod = {
                        Params: item._method.Params,
                        IsExport: item._method.IsExport
                    };
                    const newItem: IMethodValue = {
                        name: String(item.name),
                        isproc: Boolean(item.isproc),
                        line: item.line,
                        endline: item.endline,
                        context: item.context,
                        _method: dbMethod,
                        filename: fullpath,
                        module: moduleStr,
                        description: item.description
                    };
                    this.db.insert(newItem);
                }
                if (i === filesLength - 1) {
                    this.postMessage("Кэш обновлен");
                    this.bslCacheUpdated = true;
                }
            });
        }
    }

    public updateCache(): any {
        this.bslCacheUpdated = false;
        this.oscriptCacheUpdated = false;

        if (this.cache.getCollection("ValueTable")) {
            this.cache.removeCollection("ValueTable");
        }

        this.db = this.cache.addCollection("ValueTable");
        this.dbcalls = new Map();

        const configuration = this.getConfiguration("language-1c-bsl");
        const basePath: string = String(this.getConfigurationKey(configuration, "rootPath"));
        let rootPath = this.getRootPath();
        if (rootPath) {
            this.postMessage("Запущено заполнение кеша", 3000);
            rootPath = path.join(rootPath, basePath);
            const searchPattern = basePath !== "" ? basePath.substr(2) + "/**" : "**/*.{bsl,os}";
            this.findFilesForCache(searchPattern, rootPath);
        } else {
            this.bslCacheUpdated = true;
        }

        const args: string[] = [];
        args.push("get");
        args.push("lib.system");

        const cwd = rootPath ? path.dirname(rootPath) : path.dirname("");
        const options = {
            cwd,
            env: process.env
        };
        let result = "";
        const oscriptConfig = cp.spawn("oscript-config", args, options);
        oscriptConfig.on("error", (error) => {
            if (error.toString().indexOf("ENOENT") > 0) {
                console.log("oscript-config isn't found. Is it installed?");
            } else {
                console.error(error);
            }
        });
        oscriptConfig.stderr.on("data", (buffer) => {
            result += buffer.toString();
        });
        oscriptConfig.stdout.on("data", (buffer) => {
            result += buffer.toString();
        });
        oscriptConfig.on("close", () => {
            try {
                result = result.trim();
                const lines = result.split(/\r?\n/);
                const libSearchPattern = "**/lib.config";
                for (const line of lines) {
                    const globOptions: glob.IOptions = {};
                    globOptions.nocase = true;
                    globOptions.cwd = line;
                    // glob >=7.0.0 contains this property
                    // tslint:disable-next-line:no-string-literal
                    globOptions["absolute"] = true;
                    glob(libSearchPattern, globOptions, (err, files) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        this.addOscriptLibrariesToCache(files);
                    });
                }
            } catch (e) {
                console.error(e);
            }
        });
    };

    public customUpdateCache(source: string, filename: string) {
        if (!this.cacheUpdated()) {
            return;
        }
        const configuration = this.getConfiguration("language-1c-bsl");
        const basePath: string = String(this.getConfigurationKey(configuration, "rootPath"));
        const rootPath = path.join(this.getRootPath(), basePath);
        const fullpath = filename.replace(/\\/g, "/");
        const methodArray = this.db.find({ filename: { $eq: fullpath } });
        for (const element of methodArray) {
            this.db.remove(element.$loki);
        }
        const parsesModule = new Parser().parse(source);
        const moduleStr = this.getModuleForPath(fullpath, rootPath);
        const entries = parsesModule.getMethodsTable().find();
        for (const value of this.cache.getCollection(filename).data) {
            if (value.call.startsWith(".")) {
                continue;
            }
            if (value.call.indexOf(".") === -1) {
                continue;
            }
            const arrCalls = this.dbcalls.get(value.call);
            if (arrCalls) {
                for (let k = arrCalls.length - 1; k >= 0; --k) {
                    const it = arrCalls[k];
                    if (it.filename === fullpath) {
                        arrCalls.splice(k, 1);
                    }
                }
            }
        }
        this.cache.removeCollection(filename);
        this.getRefsLocal(filename, source);
        this.updateReferenceCalls(parsesModule.context.CallsPosition, "GlobalModuleText", fullpath);
        for (const item of entries) {
            this.updateReferenceCalls(item._method.CallsPosition, item, fullpath);
            const method = { Params: item._method.Params, IsExport: item._method.IsExport };
            const newItem = {
                name: String(item.name),
                isproc: Boolean(item.isproc),
                line: item.line,
                endline: item.endline,
                context: item.context,
                _method: method,
                filename: fullpath,
                module: moduleStr,
                description: item.description
            };
            this.db.insert(newItem);
        }
    };

    public queryref(word: string, collection: any, local: boolean = false): any {
        if (!collection) {
            return new Array();
        }
        const prefix = local ? "" : ".";
        const querystring = { call: { $regex: new RegExp(prefix + word + "$", "i") } };
        const search = collection.chain().find(querystring).simplesort("name").data();
        return search;
    }

    public querydef(module: string, all: boolean = true, lazy: boolean = false): any {
        // Проверяем локальный кэш.
        // Проверяем глобальный кэш на модули.
        if (!this.cacheUpdated()) {
            return new Array();
        } else {
            const prefix = lazy ? "" : "^";
            const suffix = all ? "" : "$";
            const querystring = {
                module: {
                    $regex: new RegExp(prefix + module + suffix, "i")
                }
            };
            const search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

    public query(word: string, module: string, all: boolean = true, lazy: boolean = false): any {
        const prefix = lazy ? "" : "^";
        const suffix = all ? "" : "$";
        const querystring: any = {
            name: {
                $regex: new RegExp(prefix + word + suffix, "i")
            }
        };
        if (module && module.length > 0) {
            querystring.module = {
                $regex: new RegExp("^" + module + "", "i")
            };
        }
        const moduleRegexp = new RegExp("^" + module + "$", "i");
        function filterByModule(obj) {
            if (module && module.length > 0) {
                if (moduleRegexp.exec(obj.module) !== null) {
                    return true;
                } else {
                    return false;
                }
            }
            return true;
        }
        const search = this.db.chain().find(querystring).where(filterByModule).simplesort("name").data();
        return search;
    }

    public GetSignature(entry) {
        let description = entry.description.replace(/\/\//g, "");
        description = description.replace(new RegExp("[ ]+", "g"), " ");
        const regExp = new RegExp(
            "^\\s*(Возвращаемое значение|Return value|Returns):?\\n\\s*([<\\wа-яА-Я\\.>]+)(.|\\n)*",
            "gm"
        );
        const retState = regExp.exec(description);
        let strRetState;
        if (retState) {
            strRetState = retState[2];
            description = description.substr(0, retState.index);
        }
        let paramsString = "(";
        const params = entry._method.Params;
        for (const element in params) {
            if (!params.hasOwnProperty(element)) {
                continue;
            }
            const nameParam = params[element];
            paramsString = (paramsString === "(" ? paramsString : paramsString + ", ") + nameParam;
            const re = new RegExp(
                "^\\s*(Параметры|Parameters)(.|\\n)*\\n\\s*" + nameParam + "\\s*(-|–)\\s*([<\\wа-яА-Я\\.>]+)",
                "gm"
            );
            const match: RegExpExecArray = re.exec(description);
            if (match) {
                paramsString = paramsString + ": " + match[4];
            }
        }
        paramsString = paramsString + ")";
        if (strRetState) {
            paramsString = paramsString + ": " + strRetState;
        }
        return {
            description,
            paramsString,
            strRetState,
            fullRetState: (!retState) ? "" : retState[0]
        };
    }

    public GetDocParam(description: string, param) {
        const optional = false;
        let descriptionParam = "";
        const re = new RegExp(
            "(Параметры|Parameters)(.|\\n)*\\n\\s*" + param + "\\s*(-|–)\\s*([<\\wа-яА-Я\\.>]+)\\s*-?\\s*((.|\\n)*)",
            "g"
        );
        const match: RegExpExecArray = re.exec(description);
        if (match) {
            descriptionParam = match[5];
            const cast = (new RegExp("\\n\\s*[<\\wа-яА-Я\\.>]+\\s*(-|–)\\s*", "g")).exec(descriptionParam);
            if (cast) {
                descriptionParam = descriptionParam.substr(0, cast.index);
            }
        }
        const documentationParam = { optional, descriptionParam };
        return documentationParam;
    }

    public redefineMethods(adapter) {
        const methodsList = [
            "postMessage",
            "getConfiguration",
            "getConfigurationKey",
            "getRootPath",
            "fullNameRecursor",
            "findFilesForCache"
        ];
        methodsList.forEach((element) => {
            if (adapter.hasOwnProperty(element)) {
                this[element] = adapter[element];
            }
        });
    }

    public postMessage(description: string, interval?: number) { }

    public getConfiguration(section: string) { }

    public getConfigurationKey(configuration, key: string) { }

    public getRootPath(): string {
        return "";
    }

    public fullNameRecursor(word: string, document, range, left: boolean): string {
        return "";
    }

    public findFilesForCache(searchPattern: string, rootPath: string) { }

    private delay(milliseconds: number) {
        return new Promise<void>((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }

    private cacheUpdated(): boolean {
        return this.bslCacheUpdated && this.oscriptCacheUpdated;
    }

    private updateReferenceCalls(calls: any[], method: any, file: string): any {
        for (const value of calls) {
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
            arrCalls.push(
                {
                    filename: file,
                    call: value.call,
                    line: value.line,
                    character: value.character,
                    name: String(method.name)
                }
            );
        }
    }

    private updateReferenceCallsOld(collection: any, calls: any[], method: any, file: string): any {
        for (const value of calls) {
            if (value.call.startsWith(".")) {
                continue;
            }
            const newItem: IMethodValue = {
                name: String(method.name),
                filename: file,
                isproc: Boolean(method.isproc),
                call: value.call,
                context: method.context,
                line: value.line,
                character: value.character,
                endline: method.endline
            };
            collection.insert(newItem);
        }
    }

    private async addOscriptLibrariesToCache(files: string[]) {
        for (const libConfig of files) {
            let data;
            try {
                data = await fs.readFile(libConfig);
            } catch (err) {
                if (err) {
                    console.log(err);
                    continue;
                }
            }
            let result;
            try {
                result = await this.xml2json(data);
            } catch (err) {
                if (err) {
                    console.log(err);
                    continue;
                }
            }
            const packageDef = result["package-def"];
            let modules = [];
            const classes = [];
            if (packageDef.hasOwnProperty("module")) {
                if (packageDef.module instanceof Array) {
                    for (const module of packageDef.module) {
                        modules.push(module);
                    }
                } else {
                    modules.push(packageDef.module);
                }
            }
            if (packageDef.hasOwnProperty("class")) {
                if (packageDef.class instanceof Array) {
                    for (const clazz of packageDef.class) {
                        classes.push(clazz);
                    }
                } else {
                    classes.push(packageDef.class);
                }
            }
            // TODO: Пока обрабатываем классы так же как модули
            modules = modules.concat(classes);
            for (const module of modules) {
                const fullpath = path.join(path.dirname(libConfig), module.$.file);
                fq.readFile(fullpath, { encoding: "utf8" }, (err, source) => {
                    if (err) {
                        throw err;
                    }
                    const moduleStr = module.$.name;
                    source = source.replace(/\r\n?/g, "\n");
                    let parsesModule = new Parser().parse(source);
                    source = undefined;
                    const entries = parsesModule.getMethodsTable().find();
                    // if (parsesModule.context.CallsPosition.length > 0) {
                    //     this.updateReferenceCalls(parsesModule.context.CallsPosition, "GlobalModuleText", fullpath);
                    // }
                    parsesModule = undefined;
                    for (const item of entries) {
                        const method = {
                            name: item.name,
                            endline: item.endline,
                            context: item.context,
                            isproc: item.isproc
                        };
                        // if (item._method.CallsPosition.length > 0) {
                        //     this.updateReferenceCalls(item._method.CallsPosition, method, fullpath);
                        // }
                        const dbMethod = { Params: item._method.Params, IsExport: item._method.IsExport };
                        const newItem: IMethodValue = {
                            name: String(item.name),
                            isproc: Boolean(item.isproc),
                            line: item.line,
                            endline: item.endline,
                            context: item.context,
                            _method: dbMethod,
                            filename: fullpath,
                            module: moduleStr,
                            description: item.description,
                            oscriptLib: true
                        };
                        this.db.insert(newItem);
                    }
                });
            }
        }
        this.oscriptCacheUpdated = true;
    }

    private async xml2json(xml: string) {
        return new Promise((resolve, reject) => {
            const xml2jsParser = new xml2js.Parser();
            xml2jsParser.parseString(xml, (err, json) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(json);
                }
            });
        });
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
    oscriptLib?: boolean;
}

interface IMethods {
    [index: string]: IMethod;
}

interface IMethod {
    name: string;
    name_en: string;
    alias: string;
    description: string;
    signature: ISignatureCollection;
    returns: string;
    oscript_description?: string;
    oscript_signature?: ISignatureCollection;
    oscript_access?: boolean;
}

interface ISignatureCollection {
    default: ISignatureDefinition;
    [index: string]: ISignatureDefinition;
}

interface ISignatureDefinition {
    СтрокаПараметров: string;
    Параметры: ISignatureParameters;
}

interface ISignatureParameters {
    [index: string]: string;
}

interface IOscriptGlobalContext {
    [index: string]: IOscriptSegment;
}

interface IOscriptSegment {
    description?: string;
    properties?: IPropertyDefinitions;
    methods?: IOscriptFunctionDefinitions;
}

interface IPropertyDefinitions {
    [index: string]: IPropertyDefinition;
}

interface IOscriptFunctionDefinitions {
    [index: string]: IOscriptFunctionDefinition;
}

interface IPropertyDefinition {
    name: string;
    name_en: string;
    alias: string;
    description: string;
    oscript_description: string;
    access: string;
}

interface IOscriptFunctionDefinition {
    name: string;
    name_en: string;
    description: string;
    signature: string;
    returns: string;
    params?: ISignatureParameters;
    example?: string;
}

interface IGlobalVariables {
    [index: string]: IGlobalVariable;
}

interface IGlobalVariable {
    name: string;
    name_en: string;
    description: string;
    alias: string;
    oscript_description?: string;
    oscript_access?: string;
}

interface ISystemEnums {
    [index: string]: ISystemEnum;
}

interface ISystemEnum {
    name: string;
    name_en: string;
    alias: string;
    description: string;
    oscript_description: string;
    values: ISystemEnumValue[];
}

interface ISystemEnumValue {
    name: string;
    name_en: string;
    alias: string;
    description: string;
}

interface IClasses {
    [index: string]: IClass;
}

interface IClass {
    name: string;
    name_en: string;
    alias: string;
    description: string;
    oscript_description: string;
    methods?: IMethods;
    properties?: IPropertyDefinitions;
    constructors?: IConstructorDefinitions;
}

interface IConstructorDefinitions {
    [index: string]: IConstructorDefinition;
}

interface IConstructorDefinition {
    description: string;
    signature: string;
    oscript_description: string;
    params?: ISignatureParameters;
}

interface IKeywords {
    ru: IKeywordsForLanguage;
    en: IKeywordsForLanguage;
}

interface IKeywordsForLanguage {
    [index: string]: {};
}
