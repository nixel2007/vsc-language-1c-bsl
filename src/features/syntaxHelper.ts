import * as fs from "fs-extra";
import * as glob from "glob";
import * as path from "path";
import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
import AbstractSyntaxContent from "./AbstractSyntaxContent";
import SyntaxContent1C from "./SyntaxContent1C";
import SyntaxContentBSL from "./SyntaxContentBSL";
import SyntaxContentOscript from "./SyntaxContentOscript";
import SyntaxContentOscriptLibrary from "./SyntaxContentOscriptLibrary";

import fastXmlParser = require("fast-xml-parser");

export default class SyntaxHelperProvider extends AbstractProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEvent = new vscode.EventEmitter<vscode.Uri>();
    private syntaxContent: AbstractSyntaxContent;
    private syntax: string;
    private oscriptMethods: any;
    private metadata = [
        "CommonModules",
        "ExchangePlans",
        "SettingsStorages",
        "Constants",
        "Catalogs",
        "Documents",
        "DocumentJournals",
        "Enums",
        "Reports",
        "DataProcessors",
        "ChartsOfCharacteristicTypes",
        "ChartsOfAccounts",
        "ChartsOfCalculationTypes",
        "InformationRegisters",
        "AccumulationRegisters",
        "AccountingRegisters",
        "CalculationRegisters",
        "BusinessProcesses",
        "Tasks"];

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEvent.event;
    }

    public update(uri: vscode.Uri) {
        this.onDidChangeEvent.fire(uri);
    }

    public provideTextDocumentContent(): Promise<string> | undefined {
        if (!this._global.methodForDescription) {
            return;
        }
        this.setupSyntaxContent();
        return this.buildHTMLDocument();
    }

    private setupSyntaxContent() {
        const desc = this._global.methodForDescription.description;

        if (desc.split("/")[0] === "1С") {
            this.syntaxContent = new SyntaxContent1C();
            this.syntax = "1C";
        } else if (desc.split("/")[0] === "Экспортные методы bsl") {
            this.syntaxContent = new SyntaxContentBSL();
            this.syntax = "BSL";
        } else if (desc.split("/")[0] === "oscript-library") {
            this.syntaxContent = new SyntaxContentOscriptLibrary();
            this.syntax = "oscript-library";
        } else {
            this.syntaxContent = new SyntaxContentOscript();
            this.syntax = "OneScript";
        }
    }

    private createListMd(label): object {
        function compareModules(a, b) {
            if (a.module > b.module) { return 1; }
            if (a.module < b.module) { return -1; }
        }
        const items = {};
        const fillMD = (label.indexOf("Metadata.") === -1) ? false : true;
        const labelMD = label.replace("Metadata.", "");
        for (const md of this.metadata) {
            let listMod = this._global.db.find(
                {
                    filename: { $regex: "." + md + "." },
                    isExport: true,
                    module: { $ne: "" }
                });
            if (listMod.length > 0) {
                items[this._global.toreplaced[md]] = [];
                if (fillMD && this._global.toreplaced[md] === labelMD) {
                    listMod = listMod.sort(compareModules);
                    const arr = {};
                    this.fillExportMethods(arr, listMod);
                    items[this._global.toreplaced[md]].push(arr);
                }
            }
        }
        return items;
    }

    private createListSubsystems(label) {
        const subsystems = {};
        const fillSubsystem = (label.indexOf("Subsystem.") === -1) ? false : true;
        const labelSubsystem = label.replace("Subsystem.", "");
        for (const sub in this._global.subsystems) {
            if (this._global.subsystems.hasOwnProperty(sub)) {
                const element = this._global.subsystems[sub];
                subsystems[sub] = {};
                if (fillSubsystem && labelSubsystem === sub) {
                    const items = {};
                    this.fillObject(element.object, items);
                    subsystems[sub].object = items;
                    const parentSubsystem = this._global.subsystems[labelSubsystem];
                    subsystems[sub].subsystems = (parentSubsystem.subsystems.length > 0)
                    ? this.getSubsystems(labelSubsystem) : [];
                }
            }
        }
        return subsystems;
    }

    private fillObject(element, items) {
        const humanMeta = {
            CommonModule: "ОбщиеМодули",
            ExchangePlan: "ПланыОбмена",
            SettingsStorages: "ХранилищаНастроек",
            Constant: "Константы",
            Catalog: "Справочники",
            Document: "Документы",
            DocumentJournal: "ЖурналыДокумента",
            Enum: "Перечисления",
            Report: "Отчеты",
            DataProcessor: "Обработки",
            ChartsOfCharacteristicTypes: "ПланыВидовХарактеристик",
            ChartsOfAccounts: "ПланыСчетов",
            ChartsOfCalculationTypes: "ПланыВидовРасчета",
            InformationRegisters: "РегистрыСведений",
            AccumulationRegisters: "РегистрыНакопления",
            AccountingRegisters: "РегистрыБухгалтерии",
            CalculationRegisters: "РегистрыРасчета",
            BusinessProcesses: "БизнесПроцессы",
            Tasks: "Задачи"};
        for (const el of element) {
            const humanMetadata = humanMeta[el.split(".")[0]];
            if (!humanMetadata) {
                continue;
            }
            let humanModule = humanMetadata + "." + el.split(".")[1];
            humanModule = humanModule.replace("ОбщиеМодули.", "");
            const exportMethods = this._global.db.find({ isExport: true, module: humanModule });
            if (exportMethods.length > 0) {
                this.fillExportMethods(items, exportMethods);
            }
        }
    }

    private fillExportMethods(items, exportMethods) {
        function compareMethods(a, b) {
            if (a.name > b.name) { return 1; }
            if (a.name < b.name) { return -1; }
        }
        exportMethods = exportMethods.sort(compareMethods);
        for (const expMethod of exportMethods) {
            if (!items[expMethod.module]) {
                items[expMethod.module] = {
                    name: expMethod.module
                };
            }
            const moduleDesc = items[expMethod.module];
            const isManager = expMethod.filename.endsWith("ManagerModule.bsl");
            const segment = (isManager) ? "manager" : "object";
            if (!moduleDesc[segment]) {
                moduleDesc[segment] = {};
            }
            const signature = this._global.GetSignature(expMethod);
            const regExpParams = new RegExp("^\\s*(Параметры|Parameters)\\:?\s*\n*((.|\\n)*)", "gm");
            const paramsDesc = regExpParams.exec(signature.description);
            let strParamsDesc = "";
            if (paramsDesc) {
                strParamsDesc = paramsDesc[2];
                signature.description = signature.description.substr(0, paramsDesc.index);
            }
            const returnData = signature.fullRetState.substring(25)
                .replace(/((.|\n)*.+)\n*/m, "$1")
                .replace(/\n/g, "<br>").replace(/\t/g, "");
            moduleDesc[segment][expMethod.name] = {
                description: signature.description.replace(/((.|\n)*.+)\n*/m, "$1")
                    .replace(/\n/g, "<br>").replace(/\t/g, ""),
                alias: "",
                signature: {
                    default: {
                        СтрокаПараметров: signature.paramsString,
                        Параметры: strParamsDesc.replace(/((.|\n)*.+)\n*/m, "$1")
                            .replace(/\n/g, "<br>").replace(/\t/g, "")
                    }
                },
                returns: returnData
            };
        }
    }

    private getSubsystems(label) {
        const searchPattern = `Subsystems/${label}/**/Subsystems/*.xml`;
        const globOptions: glob.IOptions = {};
        globOptions.dot = true;
        globOptions.cwd = vscode.workspace.rootPath;
        globOptions.nocase = true;
        globOptions.absolute = true;
        const files = glob.sync(searchPattern, globOptions);
        const subs = this.addSubsystems(files);
        return subs;
    }

    private addSubsystems(files) {
        const subsystems = [];
        const filesLength = files.length;
        const substrIndex = (process.platform === "win32") ? 8 : 7;
        for (let i = 0; i < filesLength; ++i) {
            let fullpath = files[i].toString();
            fullpath = decodeURIComponent(fullpath);
            if (fullpath.startsWith("file:")) {
                fullpath = fullpath.substr(substrIndex);
            }
            let data;
            try {
                data = fs.readFileSync(fullpath);
            } catch (err) {
                if (err) {
                    console.log(err);
                    continue;
                }
            }
            let result;
            try {
                result = fastXmlParser.parse(data);
            } catch (err) {
                if (err) {
                    console.log(err);
                    continue;
                }
            }
            const propSubsys = result.MetaDataObject.Subsystem.Properties;
            const content = (propSubsys.Content.length === 0 || !propSubsys.Content.hasOwnProperty("xr:Item"))
                ? [] : propSubsys.Content["xr:Item"];
            const items = {};
            this.fillObject(content, items);
            const item = {
                name: propSubsys.Name,
                content: items,
                subsystems: (propSubsys.ChildObjects)
                ? propSubsys.ChildObjects.Subsystem : []
            };
            subsystems.push(item);
        }
        return subsystems;
    }

    private buildHTMLDocument(): Promise<string> {
        let textSyntax = "";
        const metadata = (this.syntax === "BSL")
            ? this.createListMd(this._global.methodForDescription.label) : undefined;
        const subsystems = (this.syntax === "BSL")
            ? this.createListSubsystems(this._global.methodForDescription.label) : undefined;
        if ((this._global.syntaxFilled === "")
            || (this._global.syntaxFilled !== this.syntax)
            || (this.syntax === "BSL")) {
            this._global.syntaxFilled = this.syntax;
            this.oscriptMethods = this.syntaxContent.getSyntaxContentItems(
                (this.syntax === "BSL") ? subsystems : this._global.dllData,
                (this.syntax === "BSL") ? metadata : this._global.libData);
            const bbb = "'"
                + JSON.stringify(this.oscriptMethods)
                .replace(/[\\]/g, "\\\\")
                .replace(/[\"]/g, "\\\"")
                .replace(/[\']/g, "\\\'")
                .replace(/[\/]/g, "\\/")
                .replace(/[\b]/g, "\\b")
                .replace(/[\f]/g, "\\f")
                .replace(/[\n]/g, "\\n")
                .replace(/[\r]/g, "\\r")
                .replace(/[\t]/g, "\\t") + "'";
            textSyntax = ` window.localStorage.setItem("bsl-language", ${bbb});
                `;
        }

        this.syntaxContent.syntaxFilled = this._global.syntaxFilled;

        const syntaxObject = this._global.methodForDescription;
        this._global.methodForDescription = undefined;

        const fillStructure = this.syntaxContent.getStructure(textSyntax,
            (this.syntax === "BSL") ? subsystems : (this.syntax === "oscript-library")
                ? this._global.dllData : syntaxObject,
            (this.syntax === "BSL") ? metadata : (this.syntax === "oscript-library")
            ? this._global.libData : this.oscriptMethods);

        return this.getHTML(fillStructure);
    }

    private async getHTML(fillStructure): Promise<string> {
        const hljs = path.join(vscode.extensions.getExtension("xDrivenDevelopment.language-1c-bsl").extensionPath,
        "lib", "highlight.pack.js");
        const mdit = path.join(vscode.extensions.getExtension("xDrivenDevelopment.language-1c-bsl").extensionPath,
        "lib", "markdown-it.js");

        return `<head>
                    <style>
                        /* Tomorrow Comment */
                        .hljs-comment,
                        .hljs-quote {
                            color: #608B4E;/*#8e908c;*/
                        }
                        /* Tomorrow Red */
                        .hljs-variable,
                        .hljs-template-variable,
                        .hljs-tag,
                        .hljs-name,
                        .hljs-selector-id,
                        .hljs-selector-class,
                        .hljs-regexp,
                        .hljs-deletion {
                            color: #c82829;
                        }
                        /* Tomorrow Orange */
                        .hljs-number,
                        .hljs-built_in,
                        .hljs-builtin-name,
                        .hljs-literal,
                        .hljs-type,
                        .hljs-params,
                        .hljs-meta,
                        .hljs-link {
                            color: #DCDCAA; /*#f5871f;*/
                        }
                        /* Tomorrow Yellow */
                        .hljs-attribute {
                            color: #eab700;
                        }
                        /* Tomorrow Green */
                        .hljs-string,
                        .hljs-symbol,
                        .hljs-bullet,
                        .hljs-addition {
                            color: #CE9178; /*#718c00;*/
                        }
                        /* Tomorrow Blue */
                        .hljs-title,
                        .hljs-section {
                            color: #4271ae;
                        }
                        /* Tomorrow Purple */
                        .hljs-keyword,
                        .hljs-selector-tag {
                            color: #C586C0;/*#8959a8;*/
                        }
                        .hljs {
                            display: block;
                            overflow-x: auto;
                            padding: 0.5em;
                            margin: 0px;
                            font-family: Menlo, Monaco, Consolas,
                            "Droid Sans Mono", "Courier New", monospace, "Droid Sans Fallback";
                            font-size: 14px;
                            line-height: 19px;
                        }
                        pre {
                            white-space: pre-wrap;
                            padding: 0.5em;
                        }
                        code {
                            border-radius: 3px;
                            font-family: Menlo, Monaco, Consolas,
                            "Droid Sans Mono", "Courier New", monospace, "Droid Sans Fallback";
                            font-size: 14px;
                            line-height: 19px;
                        }
                        .vscode-light pre code {
                            color: rgb(30, 30, 30);
                        }
                        .vscode-dark,
                        .vscode-dark pre code {
                            color: #DDD;
                        }
                        .vscode-light code {
                            color: #A31515;
                        }
                        .vscode-dark code {
                            color: #D7BA7D;
                        }
                        .vscode-light pre:not(.hljs),
                        .vscode-light code > div {
                            background-color: rgba(220, 220, 220, 0.4);
                        }
                        .vscode-dark pre:not(.hljs),
                        .vscode-dark code > div {
                            background-color: rgba(10, 10, 10, 0.4);
                        }
                        .vscode-high-contrast pre:not(.hljs),
                        .vscode-high-contrast code > div {
                            background-color: rgb(0, 0, 0);
                        }
                        .vscode-light .hljs {
                            background-color: rgba(220, 220, 220, 0.4);
                        }
                        .vscode-dark .hljs {
                            background-color: rgba(10, 10, 10, 0.4);
                        }
                        .hljs-emphasis {
                            font-style: italic;
                        }
                        .hljs-strong {
                            font-weight: bold;
                        }
                        .a {
                            cursor: pointer;
                            text-decoration: underline;
                        }
                        a.mod {
                            color: white;
                            text-decoration: underline;
                        }
                        a.mod:hover {
                            color: white;
                        }
                        .button {
                            border: 0px;
                            background-color: inherit;
                            color: inherit;
                            font-weight: bold
                        }
                        .vscode-light .storage {
                            color: #0000FF
                        }
                        .vscode-light .function_name {
                            color: #795E26 /*#795E26*/
                        }
                        .vscode-light .parameter_variable {
                            color: #267F99 /*#001080*/
                        }
                        .storage {
                            color: #569CD6
                        }
                        .function_name {
                            color: #DCDCAA
                        }
                        .parameter_variable {
                            color: #4EC9B0 /*#9CDCFE*/
                        }
                        a {
                            color: #4080D0;
                            text-decoration: none;
                        }
                        a:hover {
                            color: #4080D0;
                            text-decoration: underline;
                        }
                        table {
                            border-collapse: collapse;
                        }
                        table > thead > tr > th {
                            text-align: left;
                            border-bottom: 1px solid;
                        }
                        table > thead > tr > th,
                        table > thead > tr > td,
                        table > tbody > tr > th,
                        table > tbody > tr > td {
                            padding: 5px 10px;
                        }
                        table > tbody > tr + tr > td {
                            border-top: 1px solid;
                        }
                    </style>
                    <script>
                        function fillDescription(elem) {
                            if (document.getElementById('cont').style.display === "none") {
                                document.getElementById('cont').style.display = "block";
                                document.getElementById('splitter1').style.display = "block";
                                document.getElementById('struct').style.height = "133px";
                            }
                            let contextData = JSON.parse(window.localStorage.getItem('bsl-language'));
                            var str = elem.innerHTML.replace(new RegExp('\\n[ ]*','gm'),'').split(" / ")[0];
                            var segment = contextData[str];
                            var segmentDescription = "";
                            if (segment["description"]) {
                                segmentDescription = "<p>"+segment["description"]+"</p>";
                            }
                            segmentDescription = fillSegmentData(
                                segmentDescription, segment, "methods", "Методы", "method");
                            segmentDescription = fillSegmentData(
                                segmentDescription, segment, "manager", "Методы модуля менеджера", "manager");
                            segmentDescription = fillSegmentData(
                                segmentDescription, segment, "object", "Методы модуля объекта", "object");
                            segmentDescription = fillSegmentData(
                                segmentDescription, segment, "properties", "Свойства", "property");
                            segmentDescription = fillSegmentData(
                                segmentDescription, segment, "constructors", "Конструкторы", "constructor");
                            segmentDescription = fillSegmentData(
                                segmentDescription, segment, "values", "Значения", "value");
                            document.getElementById('header').innerHTML = elem.innerHTML
                            + ((segment.oscriptLib) ? (" (" + segment.oscriptLib + ")") : "");
                            document.getElementById('el').innerHTML = segmentDescription;
                        }

                        function fillSegmentData(segmentDescription, segment, strSegment, headerSegment, nameID) {
                            if (segment[strSegment]) {
                                segmentDescription = segmentDescription
                                + "<h1 style='font-size: 1em;'>" + headerSegment + "</h1><ul>";
                                var counter = 0;
                                for (var elem in segment[strSegment]) {
                                    counter = counter + 1;
                                    var onlyOs = "";${fillStructure.onlyOs}
                                    var alias = (nameID === "constructor")
                                    ? "" : ((segment[strSegment][elem]["alias"]!=="")
                                    ?(" / " + segment[strSegment][elem]["alias"]):"");
                                    segmentDescription = segmentDescription + "<li><span class='a' id = "
                                    + "'" + nameID + counter + "' "
                                    + " onclick='fill(this)'>" + elem + alias + "</span>" + onlyOs + "</li>";
                                }
                                segmentDescription = segmentDescription+ "</ul>";
                            }
                            return segmentDescription;
                        }

                        function fill(elem) {
                            if (document.getElementById('contMethod').style.display === "none") {
                                document.getElementById('contMethod').style.display = "block";
                                document.getElementById('splitter2').style.display = "block";
                                document.getElementById('el').style.height = "120px";
                            }
                            var strSegment = document.getElementById('header').innerHTML.replace(
                                new RegExp('\\n[ ]*','m'),'').split(" / ")[0].replace(new RegExp(' \\\\(.*\\\\)'),'');
                            var str = elem.innerHTML.replace(new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            var charSegment = "";
                            if (elem.id.slice(0,6)==="method"){
                                charSegment = "methods";
                            } else if (elem.id.slice(0,8)==="property"){
                                charSegment = "properties";
                            } else if (elem.id.slice(0,6)==="object"){
                                charSegment = "object";
                            } else if (elem.id.slice(0,7)==="manager"){
                                charSegment = "manager";
                            } else if (elem.id.slice(0,11)==="constructor"){
                                charSegment = "constructors";
                            } else if (elem.id.slice(0,5)==="value"){
                                charSegment = "values";
                            }
                            let methodData =
                            JSON.parse(window.localStorage.getItem('bsl-language'))[strSegment][charSegment][str];
                            var depp = "";
                            if (charSegment === "constructors") {
                                str = strSegment;
                            }
                            depp = fillDescriptionData(
                                methodData, depp, "description", "signature", "returns", str, charSegment);
                            document.getElementById('headerMethod').innerHTML = elem.innerHTML;
                            if (!methodData.description1C&&!methodData["Параметры1С"]){
                                document.getElementById('desc').innerHTML = "Только для OneScript";
                                } else {
                                document.getElementById('desc').innerHTML =
                                "Описание OneScript<br/>(<span class='a' id = '" + charSegment
                                + "' onclick='switchDescription(this)' style='font-size:1em'>переключить</span>)";
                                }
                            document.getElementById('elMethod').innerHTML = depp;
                        }

                        function switchDescription(elem) {
                            var charSegment = "";
                            if (elem.id.slice(0,6)==="method"){
                                charSegment = "methods";
                            } else if (elem.id.slice(0,8)==="properti"){
                                charSegment = "properties";
                            } else if (elem.id.slice(0,11)==="constructor"){
                                charSegment = "constructors";
                            } else if (elem.id.slice(0,5)==="value"){
                                charSegment = "values";
                            }
                            var strMethod =
                            document.getElementById('headerMethod').innerHTML.replace("<br>", "").replace(
                                new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            var strSegment =
                            document.getElementById('header').innerHTML.replace(
                                new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            let methodData =
                            JSON.parse(window.localStorage.getItem('bsl-language'))[strSegment][charSegment][strMethod];
                            if (charSegment === "constructors"){
                                strMethod = strSegment;
                            }
                            let depp = "";
                            if (document.getElementById('desc').innerHTML.slice(0,11)==="Описание 1С") {
                                depp = fillDescriptionData(
                                    methodData, depp, "description", "signature", "returns", strMethod, charSegment);
                                document.getElementById('desc').innerHTML =
                                "Описание OneScript<br/>(<span class='a' id = '" + charSegment
                                + "' onclick='switchDescription(this)' style='font-size:1em'>переключить</span>)";
                            } else {
                                depp = fillDescriptionData(methodData, depp, "description1C",
                                "signature1C", "returns1C", strMethod, charSegment);
                                document.getElementById('desc').innerHTML =
                                "Описание 1С<br/>(<span class='a' id = '" + charSegment
                                + "' onclick='switchDescription(this)' style='font-size:1em'>переключить</span>)";
                            }
                            document.getElementById('elMethod').innerHTML = depp;
                        }

                        function fillDescriptionData(methodData, depp, descContext,
                                                     paramContext, returns, strMethod, charSegment) {
                            if (methodData[descContext]) {
                                depp = methodData[descContext]
                                .replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/')
                                .replace(new RegExp("\\\\^\\\\&%","g"),'\\\\')
                                .replace(new RegExp("\\\\*\\\\&\\\\^","g"),'\\"') + "<br/>";
                                    }
                            if (methodData[returns]) {
                                depp = depp + "<b><em>Возвращаемое значение: </em></b>"
                                + methodData[returns].replace(new RegExp("\\\\*\\\\&\\\\^","g"),'\\"')
                                .replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/')
                                .replace(new RegExp("\\\\^\\\\&%","g"),'\\\\') + "<br/>";
                            }
                            if (methodData["Доступ"]) {
                                depp = depp + "<b><em>Доступ: </em></b>"
                                + methodData["Доступ"].replace("^&*",'\\/') + "<br/>";}
                            var constructor = (charSegment === "constructors")? "Новый " : "";
                            if (charSegment === "methods" || charSegment === "constructors"
                                ||charSegment === "object" || charSegment === "manager") {
                                if (methodData[paramContext]) {
                                    for (let element in methodData[paramContext]) {
                                        var name_syntax = (element === "default") ? "" : " " + element;
                                        depp = depp + "<p><b>Синтаксис" + name_syntax + ":</b></p><p class='hljs'>"
                                        + constructor + "<span class='function_name'>" + strMethod
                                        + "</span><span class='parameter_variable'>"
                                        + methodData[paramContext][element]["СтрокаПараметров"] + "</span></p>";
                                        if (typeof methodData[paramContext][element].Параметры !=="string"){
                                            let header = false;
                                            for (let param in methodData[paramContext][element].Параметры) {
                                                if (header === false) {
                                                    depp = depp + "<p><b>Параметры:</b></p><p>";
                                                    header = true;
                                                }
                                                var paramDescription = "<b><em>" + param + ":</em></b> "
                                                + methodData[paramContext][element].Параметры[param]
                                                .replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/')
                                                .replace(new RegExp("\\\\^\\\\&%","g"),'\\\\')
                                                .replace(new RegExp("\\\\*\\\\&\\\\^","g"),'\\"');
                                                depp = depp + paramDescription + "<br/>";
                                            }
                                        } else if (methodData[paramContext][element].Параметры !== ""){
                                            depp = depp + "<p><b>Параметры:</b></p><p>";
                                            depp = depp + methodData[paramContext][element].Параметры
                                            .replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/')
                                            .replace(new RegExp("\\\\^\\\\&%","g"),'\\\\')
                                            .replace(new RegExp("\\\\*\\\\&\\\\^","g"),'\\"');
                                        }
                                        depp = depp + "</p>";
                                    }
                                } else {
                                    var ret = new RegExp("Тип: ([^.]+)\\.", "");
                                    var retValue = (!methodData[returns]) ? "" : ": "+ ret.exec(methodData[returns])[1];
                                    depp = depp + "<p><b>Синтаксис:</b></p><p class='hljs'>"
                                    + "<span class='function_name'>" + strMethod
                                    + "</span><span class='parameter_variable'>()"
                                    + retValue + "</span></p>";
                                }
                            }
                            if (methodData["example"] && descContext === "description") {
                                console.log()
                                 depp = depp + "<p><b>Пример:</b></p><pre class='hljs'>"
                                 + hljs.highlight("1c", methodData["example"]
                                 .replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/')
                                 .replace("^&%",'\\\\')
                                 .replace(new RegExp("\\\\*\\\\&\\\\^","g"),'\\"')
                                 .replace(new RegExp("<br>","g"), String.fromCharCode(10)), true).value
                                 + "</pre>";}
                            return depp;
                        }

                        function readFile(file, sep) {
                            if (document.getElementById('cont').style.display === "none") {
                                document.getElementById('cont').style.display = "block";
                                document.getElementById('splitter1').style.display = "block";
                                document.getElementById('struct').style.height = "133px";
                            }
                            document.getElementById('header').innerHTML = file.split(sep).reverse()[1];
                            var request = new XMLHttpRequest();
                            request.open('GET', file);
                            request.onload = function (e) {
                                if (request.readyState == 4 && request.status == 200) {
                                    var md = window.markdownit(defaults);
                                    document.getElementById('el').innerHTML = md.render(request.responseText
                                        .replace(new RegExp("\`\`\`bsl","g"), "\`\`\`1c"));
                                }
                            };
                            request.send(null);
                        }

                        function drag(elementToDrag, event) {
                            // Зарегистрировать обработчики событий mousemove и mouseup,
                            // которые последуют за событием mousedown.
                            if (document.addEventListener) {
                                // Стандартная модель событий
                                // Зарегистрировать перехватывающие обработчики в документе
                                document.addEventListener("mousemove", moveHandler, true);
                                document.addEventListener("mouseup", upHandler, true);
                            }
                            event.cancelBubble = true;
                            event.returnValue = false;
                            function moveHandler(e) {
                                // Переместить элемент в позицию указателя мыши с учетом позиций
                                // полос прокрутки и смещений относительно начального щелчка.
                                if (elementToDrag.id==="splitter1"){
                                    document.getElementById('struct').style.height =
                                    (e.clientY - document.getElementById('struct').offsetTop)  + "px";
                                } else {
                                    document.getElementById('el').style.height =
                                    (e.clientY - document.getElementById('el').offsetTop)  + "px";
                                }
                                // И прервать дальнейшее распространение события.
                                e.cancelBubble = true;
                            }
                            function upHandler(e) {
                                // Удалить перехватывающие обработчики событий.
                                if (document.removeEventListener) {
                                    document.removeEventListener("mouseup", upHandler, true);
                                    document.removeEventListener("mousemove", moveHandler, true);
                                }
                                e.cancelBubble = true;
                            }
                        }
                        function escapeHtml(str) {
                            var HTML_ESCAPE_TEST_RE = /[&<>"]/;
                            var HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
                            var HTML_REPLACEMENTS = {
                                '&': '&amp;',
                                '<': '&lt;',
                                '>': '&gt;',
                                '"': '&quot;'
                            };
                            function replaceUnsafeChar(ch) {
                                return HTML_REPLACEMENTS[ch];
                            }
                            if (HTML_ESCAPE_TEST_RE.test(str)) {
                                return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
                            }
                            return str;
                        };
                    </script>
                    <script type="text/javascript" src="${hljs}"></script>
                    <script type="text/javascript" src="${mdit}"></script>
                    <script>;
                    var defaults = {
                        highlight: function (str, lang) {
                            if (lang && hljs.getLanguage(lang)) {
                                try {
                                    return '<pre class="hljs"><code>' +
                                       hljs.highlight(lang, str, true).value +
                                       '</code></pre>';
                                } catch (__) {
                                }
                            }
                            return '<pre><code>'
                            + escapeHtml(str) + '</code></pre>';
                          }
                      };</script>
                    </head>
                    <body onload = "
                    var md = window.markdownit(defaults);
                    // document.getElementById('hjh').innerHTML =
                    // md.render(textHL);
                    //.replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;');
                    ">
                    <script>
                        (function() {
                            try {
                                ${fillStructure.textSyntax}
                                var theme = window.localStorage.getItem('storage://global/workbench.theme');
                                if (theme && theme.indexOf('vs-dark') < 0) {
                                    window.document.body.className = 'monaco-shell';
                                    // remove the dark theme class if we are on a light theme
                                }
                            } catch (error) {
                                console.error(error);
                            }
                        })();
                    </script>
                    <h1 id="hjh" style="font-size: 1em; margin-left:5px; margin-top: 20px; float:left;
                    display: inline-block; width:calc(90% - 80px);">${fillStructure.globalHeader}</h1>
                    <a href="command:language-1c-bsl.syntaxHelper" style = "margin: 20px 10px 10px 10px;
                    padding: 5px 15px 5px 5px; float:right; width:55px; height:15px; white-space: nowrap;
                    background: #007acc; text-decoration:none; color: white; "><svg xmlns="http://www.w3.org/2000/svg"
                    width="14" height="14" viewBox="0 0 14 14"><path d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13
                    6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0
                    .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7
                    2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z" fill="white"/></svg>
                    &nbsp; Поиск</a>
                    <hr style = "clear:both">
                    <div id = "struct" style="overflow-y: scroll; margin-left:5px; height:
                    ${fillStructure.menuHeight};">
                        ${fillStructure.globCont}
                        ${fillStructure.classes}</ul>
                    </div>
                    <div id = "splitter1" style = "background: #9A9A9A; display:${fillStructure.classVisible};
                    cursor: n-resize; height:2px; margin-top:4px;" onmousedown="drag(this, event);"></div>
                    <div id="cont" style = "display:${fillStructure.classVisible};">
                        <h1 id="header" style="font-size: 1em; float:left; margin-left:5px; width:90%;
                        margin-right:0px">${fillStructure.segmentHeader}</h1>
                        <input type = "button" class = "button" value = "x"
                        onclick = "document.getElementById('cont').style.display = 'none';
                        document.getElementById('splitter1').style.display = 'none';
                        document.getElementById('struct').style.height = '100%'" style="float: right; margin-top: 6px">
                        <hr style = "clear:both">
                        <div id="el" style = "overflow-y: scroll; margin-left:5px; height: ${fillStructure.elHeight}">
                            ${fillStructure.segmentDescription}
                        </div>
                    <div id = "splitter2" style = "background: #9A9A9A; display:${fillStructure.methodVisible};
                    cursor: n-resize; height:2px; margin-top:4px;" onmousedown="drag(this, event);"></div>
                    <div id="contMethod" style = "display:${fillStructure.methodVisible};">
                        <div style="float:left; width:calc(100% - 30px); margin-right:0px; margin-left:5px">
                        <h1 id="headerMethod" style="font-size: 1em; float:left; width:calc(100% - 110px);
                        margin-right:0px;">
                        ${fillStructure.methodHeader}</h1>
                        <span id = "desc" style='margin-left:5px; text-align: right;
                        margin-right:0px; padding-right:5px; font-size:0.8em; width:95px;
                        float:right; margin-top:5px; padding-left:0px;
                        display:${fillStructure.displaySwitch}'>${fillStructure.switch1C}<\span>
                        </div>
                        <input type = "button" class = "button" value = "x"
                        onclick = "document.getElementById('contMethod').style.display = 'none';
                        document.getElementById('splitter2').style.display = 'none';
                        document.getElementById('el').style.height = '60%'" style="float: right;
                        margin-left:0px; margin-top:5px">
                        <hr style = "clear:both">
                        <div id="elMethod" style = "overflow-y: scroll; margin-left:5px">
                            ${fillStructure.methodDescription}
                        </div>
                    </div>
                    </div>
                </body>`;
    }
}
