import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
import * as oscriptStdLib from "./oscriptStdLib";
import * as bslGlobals from"./bslGlobals";

export default class TextDocumentContentProvider extends AbstractProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private oscriptMethods;
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }
    public provideTextDocumentContent(uri: vscode.Uri): string {
        if (!this._global.methodForDescription) {
            return;
        }
        let word = this._global.methodForDescription.label;
        let textSyntax = "";
        if (this._global.syntaxFilled === "") {
            if (vscode.window.activeTextEditor.document.fileName.endsWith(".os")) {
                this._global.syntaxFilled = "OneScript";
                textSyntax = this.fillOsSyntax();
            } else {
                this._global.syntaxFilled = "1C";
                textSyntax = this.fill1CSyntax();
            }
        } else if (this._global.syntaxFilled === "1C") {
            if (word === "OneScript" || (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith(".os"))) {
                this._global.syntaxFilled = "OneScript";
                textSyntax = this.fillOsSyntax();
            }
        } else if (this._global.syntaxFilled === "OneScript") {
            if (word === "1C" || (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith(".bsl"))) {
                this._global.syntaxFilled = "1C";
                textSyntax = this.fill1CSyntax();
            }
        }
        if (word === "OneScript") {
            return this.SyntaxOscriptDefault(textSyntax);
        } else if (this._global.methodForDescription.description.split("/")[0] === "OneScript") {
            return this.SyntaxOscriptMethod(textSyntax);
        } else if (word === "1C") {
            return this.Syntax1CDefault(textSyntax);
        } else {
            return this.Syntax1CMethod(textSyntax);
        }
    }

    private Syntax1CDefault(textSyntax: string) {
        this._global.methodForDescription = undefined;
        let fillStructure = {
            globalHeader: "Синтакс-Помощник 1С",
            textSyntax,
            descClass: "",
            descMethod: "",
            menuHeight: "100%",
            elHeight: "100%",
            classVisible: "none",
            methodVisible: "none",
            segmentHeader: "1C",
            methodHeader: "1C",
            displaySwitch: "none",
            switch1C: "",
            segmentDescription: "Очень много текста",
            methodDescription: "Очень много текста",
            onlyOs: "",
        };
        return this.fillStructure1CSyntax(fillStructure);
    }

    private fillStructure1CSyntax(fillStructure) {
        let globCont = "";
        for (let element in bslGlobals.structureGlobContext()["global"]) {
            globCont = globCont + `<li><a href="#" onclick="fillDescription(this)">${element}</a></li>`;
        }
        fillStructure.globCont = globCont;
        let classes = "";
        let added = {};
        for (let segmentClass in bslGlobals.structureGlobContext()["classes"]) {
            classes = classes + "<h2 style='font-size: 1em;'><em>" + segmentClass + "</em></h2><ul>";
            for (let currentClass in bslGlobals.structureGlobContext()["classes"][segmentClass]) {
                classes = classes + `<li><a href="#" onclick="fillDescription(this)">${currentClass + " / " + bslGlobals.classes()[currentClass]["name_en"]}</a></li>`;
                added[currentClass] = true;
                if (bslGlobals.structureGlobContext()["classes"][segmentClass][currentClass] !== "") {
                    classes = classes + "<ul>";
                    for (let childClass in bslGlobals.structureGlobContext()["classes"][segmentClass][currentClass]) {
                        added[childClass] = true;
                        classes = classes + `<li><a href="#" onclick="fillDescription(this)">${childClass + " / " + bslGlobals.classes()[childClass]["name_en"]}</a></li>`;
                    }
                    classes = classes + "</ul>";
                }
            }
            if (segmentClass !== "Прочее") {
                classes = classes + "</ul>";
            }
        }
        for (let element in bslGlobals.classes()) {
            if (!added[element]) {
                let alias = (bslGlobals.classes()[element]["name_en"] !== "") ? (" / " + bslGlobals.classes()[element]["name_en"]) : "";
                classes = classes + `<li><a href="#" onclick="fillDescription(this)">${element + alias}</a></li>`;
            }
        }
        classes = classes + "</ul><h1 style='font-size: 1em;'>Системные перечисления</h1><ul>";
        for (let element in bslGlobals.systemEnum()) {
            let alias = (bslGlobals.systemEnum()[element]["name_en"] !== "") ? (" / " + bslGlobals.systemEnum()[element]["name_en"]) : "";
            classes = classes + `<li><a href="#" onclick="fillDescription(this)">${element + alias}</a></li>`;
        }
        fillStructure.classes = classes + "</ul>";
        return this.fillSyntax(fillStructure);
    }

    private Syntax1CMethod(textSyntax) {
        let syntaxObjext = this._global.methodForDescription;
        this._global.methodForDescription = undefined;
        let segmentDescription = "Очень много текста";
        let methodDescription = "Очень много текста";
        let descClass = syntaxObjext.description.split("/")[syntaxObjext.description.split("/").length - 1];
        let descMethod = syntaxObjext.label.split(".")[syntaxObjext.label.split(".").length - 1];
        let alias = (this.oscriptMethods[descClass]["alias"] && this.oscriptMethods[descClass]["alias"] !== "") ? (" / " + this.oscriptMethods[descClass]["alias"]) : "";
        let segmentHeader = descClass + alias;
        let segment = this.oscriptMethods[descClass];
        if (segment["description"]) {
            segmentDescription = "<p>" + segment["description"] + "</p>";
        } else { segmentDescription = ""; }
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "methods", "Методы", "method");
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "properties", "Свойства", "property");
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "constructors", "Конструкторы", "constructor");
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "values", "Значения", "value");
        let methodHeader = "1C";
        if (descClass !== descMethod) {
            let methodData = undefined;
            let charSegment = undefined;
            for (let key in this.oscriptMethods[descClass]) {
                if (key === "properties" || key === "methods" || key === "values") {
                    for (let item in this.oscriptMethods[descClass][key]) {
                        if (item === descMethod) {
                            charSegment = key;
                            methodData = this.oscriptMethods[descClass][key][item];
                            methodHeader = descMethod + (methodData["alias"] !== "" ? (" / " + methodData["alias"]) : "");
                            break;
                        }
                    }
                }
            }
            if (methodData) {
                methodDescription = "";
                if (methodData["description"]) { methodDescription = methodData["description"] + "<br/>"; }
                if (methodData["returns"]) { methodDescription = methodDescription + "<b><em>Возвращаемое значение: </em></b>" + methodData["returns"] + "<br/>"; }
                if (methodData["Доступ"]) { methodDescription = methodDescription + "<b><em>Доступ: </em></b>" + methodData["Доступ"] + "<br/>"; }
                if (charSegment === "methods") {
                    if (methodData["signature"]) {
                        for (let element in methodData["signature"]) {
                            let name_syntax = (element === "default") ? "" : " " + element;
                            methodDescription = methodDescription + "<p><b>Синтаксис" + name_syntax + ":</b></p><p><span class='function_name'>" + descMethod + "</span><span class='parameter_variable'>" + methodData["signature"][element]["СтрокаПараметров"] + "</span></p>";
                            let header = false;
                            for (let param in methodData["signature"][element].Параметры) {
                                if (header === false) {
                                    methodDescription = methodDescription + "<p><b>Параметры:</b></p><p>";
                                    header = true;
                                }
                                let paramDescription = "<b><em>" + param + ":</em></b> " + methodData["signature"][element].Параметры[param].replace(new RegExp("\\\\^\\\\&\\\\*", "g"), "\\/").replace("^&%", "\\\\");
                                methodDescription = methodDescription + paramDescription + "<br/>";
                            }
                            methodDescription = methodDescription + "</p>";
                        }
                    } else {
                        let ret = new RegExp("Тип: ([^.]+)\\.", "");
                        let retValue = (!methodData["returns"]) ? "" : ": " + ret.exec(methodData["returns"])[1];
                        methodDescription = methodDescription + "<p><b>Синтаксис:</b></p><p><span class='function_name'>" + descMethod + "</span><span class='parameter_variable'>()" + retValue + "</span></p>";
                    }
                }
                if (methodData["example"]) { methodDescription = methodDescription + "<h3 style='font-size: 1em;>Пример:</h3><p>" + methodData["example"] + "</p>"; }
            }
        }
        let fillStructure = {
            globalHeader: "Синтакс-Помощник 1С",
            textSyntax,
            descClass,
            descMethod,
            menuHeight: "133px",
            elHeight: (descClass !== descMethod) ? "120px" : "100%",
            classVisible: "block",
            methodVisible: (descClass !== descMethod) ? "block" : "none",
            segmentHeader,
            methodHeader,
            displaySwitch: "none",
            switch1C: "",
            segmentDescription,
            methodDescription
        };
        return this.fillStructure1CSyntax(fillStructure);
    }

    private fillOsSyntax() {
        let items = {};
        for (let element in oscriptStdLib.globalContextOscript()) {
            let segment = oscriptStdLib.globalContextOscript()[element];
            let segmentChar = this.fillSegmentOsSyntax(segment, true, "OneScript", "");
            items[element] = segmentChar;
        }
        for (let element in oscriptStdLib.classesOscript()) {
            let segment = oscriptStdLib.classesOscript()[element];
            let segmentChar = this.fillSegmentOsSyntax(segment, false, "OneScript", bslGlobals.classes()[segment.name]);
            items[element] = segmentChar;
        }
        for (let element in oscriptStdLib.systemEnum()) {
            let segment = oscriptStdLib.systemEnum()[element];
            let segmentChar = this.fillSegmentOsSyntax(segment, false, "OneScript", bslGlobals.systemEnum()[segment.name]);
            items[element] = segmentChar;
        }
        this.oscriptMethods = items;
        let bbb = "'" + JSON.stringify(items).replace(new RegExp("\\\\\"", "g"), "").replace(new RegExp("'", "g"), "").replace(new RegExp("\\\\\\\\", "g"), "^&%").replace(new RegExp("\\/", "g"), "^&*") + "'";
        return ` window.localStorage.setItem("bsl-language", ${bbb});
                `;
    }

    private fillSegmentOsSyntax(segment, globalContext, context, segment1C) {
        let segmentChar = {};
        if (segment["description"]) {
            segmentChar["description"] = segment["description"];
        }
        if (segment["name_en"]) {
            segmentChar["alias"] = segment["name_en"];
        }
        if (segment["methods"]) {
            let methodsGlobalContext = {};
            for (let indexMethod in segment["methods"]) {
                let helper = undefined;
                let returns = undefined;
                let example = undefined;
                let signature1C = undefined;
                let description1C = undefined;
                let returns1C = undefined;
                let helper1C = undefined;
                let signature = undefined;
                if (context === "OneScript") {
                    helper = segment["methods"][indexMethod];
                    returns = (helper["returns"]) ? (helper["returns"]) : undefined;
                    example = (helper["example"]) ? (helper["example"]) : undefined;
                    signature = { "default": { "СтрокаПараметров": helper["signature"], "Параметры": helper["params"] } };
                    helper1C = (globalContext) ? bslGlobals.globalfunctions()[indexMethod] : (segment1C) ? ((segment1C["methods"]) ? segment1C["methods"][indexMethod] : undefined) : undefined;
                    if (helper1C) {
                        signature1C = helper1C["signature"];
                        description1C = helper1C.description;
                        returns1C = helper1C.returns;
                    }
                } else {
                    helper = (bslGlobals.classes()[segment.name]) ? ((bslGlobals.classes()[segment.name]["methods"]) ? bslGlobals.classes()[segment.name]["methods"][indexMethod] : undefined) : undefined;
                    if (helper) {
                        signature = helper["signature"];
                        returns = helper.returns;
                    }
                }
                methodsGlobalContext[indexMethod] = { description: helper.description, alias: helper.name_en, signature, returns, example, description1C, signature1C, returns1C };
            }
            segmentChar["methods"] = methodsGlobalContext;
        }
        if (segment["properties"]) {
            let variableGlobalContext = {};
            for (let indexMethod in segment["properties"]) {
                let helper = segment["properties"][indexMethod];
                let access = (helper["access"]) ? (helper["access"]) : undefined;
                let description1C = undefined;
                let helper1C = undefined;
                if (context === "OneScript") {
                    helper1C = (globalContext) ? bslGlobals.globalvariables()[indexMethod] : (segment1C) ? (segment1C["properties"] ? segment1C["properties"][indexMethod] : undefined) : undefined;
                    if (helper1C && helper1C["description"]) {
                        description1C = helper1C.description;
                    }
                }
                variableGlobalContext[indexMethod] = { description: helper.description, alias: helper.name_en, "Доступ": access, description1C };
            }
            segmentChar["properties"] = variableGlobalContext;
        }
        if (segment["values"]) {
            let variableGlobalContext = {};
            for (let indexMethod in segment["values"]) {
                let helper = segment["values"][indexMethod];
                let description1C = undefined;
                let helper1C = undefined;
                if (context === "OneScript") {
                    helper1C = (globalContext) ? bslGlobals.globalvariables()[indexMethod] : (segment1C) ? (segment1C["values"] ? segment1C["values"][indexMethod] : undefined) : undefined;
                    if (helper1C && helper1C["description"]) {
                        description1C = helper1C.description;
                    }
                }
                variableGlobalContext[indexMethod] = { description: helper.description, alias: helper.name_en, description1C };
            }
            segmentChar["values"] = variableGlobalContext;
        }
        if (segment["constructors"]) {
            let classOs = {};
            for (let indexMethod in segment["constructors"]) {
                let helper = segment["constructors"][indexMethod];
                let params = undefined;
                let signature = { "default": { "СтрокаПараметров": helper["signature"], "Параметры": helper["params"] } };
                let signature1C = undefined;
                let description1C = undefined;
                let helper1C = undefined;
                if (context === "OneScript") {
                    helper1C = (segment1C) ? (segment1C["constructors"] ? segment1C["constructors"][indexMethod] : undefined) : undefined;
                    if (helper1C) {
                        description1C = helper1C["description"];
                        signature1C = { "default": { "СтрокаПараметров": helper1C["signature"], "Параметры": helper1C["params"] } };
                    }
                }
                classOs[indexMethod] = { description: helper.description, signature, description1C, signature1C };
            }
            segmentChar["constructors"] = classOs;
        }
        return segmentChar;
    }

    private fill1CSyntax() {
        let items = {};
        for (let element in bslGlobals.structureGlobContext()["global"]) {
            let segment = bslGlobals.structureGlobContext()["global"][element];
            let segmentChar = {};
            let methodsGlobalContext = {};
            for (let key in segment) {
                let methodData = (bslGlobals.globalfunctions()[key]) ? (bslGlobals.globalfunctions()[key]) : (bslGlobals.globalvariables()[key]);
                methodsGlobalContext[key] = { description: (methodData.description) ? methodData.description : "", alias: methodData.name_en, signature: (methodData.signature) ? methodData.signature : undefined, returns: (methodData.returns) ? methodData.returns : undefined };
            }
            if (element === "Свойства") {
                segmentChar["properties"] = methodsGlobalContext;
            } else { segmentChar["methods"] = methodsGlobalContext; }
            items[element] = segmentChar;
        }
        for (let element in bslGlobals.classes()) {
            let segment = bslGlobals.classes()[element];
            let segmentChar = this.fillSegmentOsSyntax(segment, false, "1C", "");
            items[element] = segmentChar;
        }
        for (let element in bslGlobals.systemEnum()) {
            let segment = bslGlobals.systemEnum()[element];
            let segmentChar = this.fillSegmentOsSyntax(segment, false, "1C", "");
            items[element] = segmentChar;
        }
        this.oscriptMethods = items;
        let bbb = "'" + JSON.stringify(items).replace(new RegExp("\\\\\"", "g"), "").replace(new RegExp("'", "g"), "").replace(new RegExp("\\\\\\\\", "g"), "^&%").replace(new RegExp("\\/", "g"), "^&*") + "'";
        return ` window.localStorage.setItem("bsl-language", ${bbb});
                `;
    }

    private fillSegmentData(segmentDescription, segment, strSegment, headerSegment, nameID) {
        if (segment[strSegment]) {
            segmentDescription = segmentDescription + "<h1 style = 'font-size: 1em;'>" + headerSegment + "</h1><ul>";
            let counter = 0;
            for (let elem in segment[strSegment]) {
                counter = counter + 1;
                let onlyOs = "";
                if (this._global.syntaxFilled === "OneScript" && !segment[strSegment][elem].description1C && !segment[strSegment][elem].signature1C) {
                    onlyOs = "*";
                }
                let alias = (nameID === "constructor") ? "" : (segment[strSegment][elem]["alias"] !== "") ? (" / " + segment[strSegment][elem]["alias"]) : "";
                segmentDescription = segmentDescription + "<li><a id = " + "'" + nameID + counter + "' " + "href='#' onclick='fill(this)'>" + elem + alias + "</a>" + onlyOs + "</li>";
            }
            segmentDescription = segmentDescription + "</ul>";
        }
        return segmentDescription;
    }

    private SyntaxOscriptDefault(textSyntax) {
        this._global.methodForDescription = undefined;
        let fillStructure = {
            globalHeader: "Стандартная библиотека классов и функций OneScript",
            textSyntax,
            descClass: "",
            descMethod: "",
            menuHeight: "100%",
            elHeight: "100%",
            classVisible: "none",
            methodVisible: "none",
            segmentHeader: "OneScript",
            methodHeader: "OneScript",
            switch1C: "Только для OneScript",
            segmentDescription: "Очень много текста",
            methodDescription: "Очень много текста",
        };
        return this.OscriptSyntax(fillStructure);
    }

    private SyntaxOscriptMethod(textSyntax) {
        let syntaxObjext = this._global.methodForDescription;
        this._global.methodForDescription = undefined;
        let switch1C = "Только для OneScript";
        let segmentDescription = "Очень много текста";
        let methodDescription = "Очень много текста";
        let descClass = syntaxObjext.description.split("/")[syntaxObjext.description.split("/").length - 1];
        let descMethod = syntaxObjext.label.split(".")[syntaxObjext.label.split(".").length - 1];
        let alias = (this.oscriptMethods[descClass]["alias"] && this.oscriptMethods[descClass]["alias"] !== "") ? (" / " + this.oscriptMethods[descClass]["alias"]) : "";
        let segmentHeader = descClass + alias;
        let segment = this.oscriptMethods[descClass];
        if (segment["description"]) {
            segmentDescription = "<p>" + segment["description"] + "</p>";
        } else { segmentDescription = ""; }
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "methods", "Методы", "method");
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "properties", "Свойства", "property");
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "constructors", "Конструкторы", "constructor");
        segmentDescription = this.fillSegmentData(segmentDescription, segment, "values", "Значения", "value");
        let methodHeader = "OneScript";
        if (descClass !== descMethod) {
            let methodData = undefined;
            for (let key in this.oscriptMethods[descClass]) {
                if (key === "properties" || key === "methods" || key === "values") {
                    for (let item in this.oscriptMethods[descClass][key]) {
                        if (item === descMethod) {
                            methodData = this.oscriptMethods[descClass][key][item];
                            methodHeader = descMethod + (methodData["alias"] !== "" ? (" / " + methodData["alias"]) : "");
                            if (methodData["description1C"] || methodData["signature1C"]) {
                                switch1C = "Описание OneScript<br/>(<a href='#' name = '" + key + "' onclick='switchDescription(this)' style='font-size:1em'>переключить<\a>)";
                            }
                            break;
                        }
                    }
                }
            }
            if (methodData) {
                methodDescription = "";
                if (methodData["description"]) { methodDescription = methodData["description"] + "<br/>"; }
                if (methodData["returns"]) { methodDescription = methodDescription + "<b><em>Возвращаемое значение: </em></b>" + methodData["returns"] + "<br/>"; }
                if (methodData["Доступ"]) { methodDescription = methodDescription + "<b><em>Доступ: </em></b>" + methodData["Доступ"] + "<br/>"; }
                if (methodData["signature"]) {
                    let stingParams = methodData["signature"]["default"]["СтрокаПараметров"];
                    methodDescription = methodDescription + "<p><b>Синтаксис:</b></p><p><span class='function_name'>" + descMethod + "</span><span class='parameter_variable'>" + stingParams + "</span></p>";
                    if (methodData["signature"]["default"]["Параметры"]) {
                        methodDescription = methodDescription + "<p><b>Параметры:</b></p><p>";
                        for (let param in methodData["signature"]["default"]["Параметры"]) {
                            let paramDescription = "<b><em>" + param + ": </em></b>" + methodData["signature"]["default"]["Параметры"][param];
                            methodDescription = methodDescription + paramDescription + "<br/>";
                        }
                        methodDescription = methodDescription + "</p>";
                    }
                }
                if (methodData["example"]) { methodDescription = methodDescription + "<h3 style='font-size: 1em;>Пример:</h3><p>" + methodData["example"] + "</p>"; }
            }
        }
        let fillStructure = {
            globalHeader: "Стандартная библиотека классов и функций OneScript",
            textSyntax,
            descClass,
            descMethod,
            menuHeight: "133px",
            elHeight: (descClass !== descMethod) ? "120px" : "100%",
            classVisible: "block",
            methodVisible: (descClass !== descMethod) ? "block" : "none",
            segmentHeader,
            methodHeader,
            switch1C,
            segmentDescription,
            methodDescription
        };
        return this.OscriptSyntax(fillStructure);
    }

    private OscriptSyntax(fillStructure) {
        let globCont = "";
        for (let element in oscriptStdLib.globalContextOscript()) {
            globCont = globCont + `<li><a href="#" onclick="fillDescription(this)">${element}</a></li>`;
        }
        let classes = "";
        let added = {};
        for (let segmentClass in oscriptStdLib.structureMenu()["classes"]) {
            classes = classes + "<h2 style='font-size: 1em;'><em>" + segmentClass + "</em></h2><ul>";
            for (let currentClass in oscriptStdLib.structureMenu()["classes"][segmentClass]) {
                let onlyOs = "";
                if (!bslGlobals.classes()[currentClass]) {
                    onlyOs = "*";
                }
                classes = classes + `<li><a href="#" onclick="fillDescription(this)">${currentClass + " / " + oscriptStdLib.classesOscript()[currentClass]["name_en"]}</a>${onlyOs}</li>`;
                added[currentClass] = true;
                if (oscriptStdLib.structureMenu()["classes"][segmentClass][currentClass] !== "") {
                    classes = classes + "<ul>";
                    for (let childClass in oscriptStdLib.structureMenu()["classes"][segmentClass][currentClass]) {
                        added[childClass] = true;
                        classes = classes + `<li><a href="#" onclick="fillDescription(this)">${childClass + " / " + oscriptStdLib.classesOscript()[childClass]["name_en"]}</a></li>`;
                    }
                    classes = classes + "</ul>";
                }
            }
            if (segmentClass !== "Прочее") {
                classes = classes + "</ul>";
            }
        }
        for (let element in oscriptStdLib.classesOscript()) {
            if (!added[element]) {
                let onlyOs = "";
                if (!bslGlobals.classes()[element]) {
                    onlyOs = "*";
                }
                let alias = (oscriptStdLib.classesOscript()[element]["name_en"] !== "") ? (" / " + oscriptStdLib.classesOscript()[element]["name_en"]) : "";
                classes = classes + `<li><a href="#" onclick="fillDescription(this)">${element + alias}</a>${onlyOs}</li>`;
            }
        }
        classes = classes + "</ul><h1 style='font-size: 1em;'>Системные перечисления</h1><ul>";
        for (let element in oscriptStdLib.systemEnum()) {
            let onlyOs = "";
            if (!bslGlobals.systemEnum()[element]) {
                onlyOs = "*";
            }
            let alias = (oscriptStdLib.systemEnum()[element]["name_en"] !== "") ? (" / " + oscriptStdLib.systemEnum()[element]["name_en"]) : "";
            classes = classes + `<li><a href="#" onclick="fillDescription(this)">${element + alias}</a>${onlyOs}</li>`;
        }
        fillStructure.globCont = globCont;
        fillStructure.classes = classes;
        fillStructure.displaySwitch = "block",
            fillStructure.onlyOs = `if (!segment[strSegment][elem].description1C && !segment[strSegment][elem].signature1C){
                                        onlyOs = "*";
                                    }`;
        return this.fillSyntax(fillStructure);
    }

    private fillSyntax(fillStructure) {
        return `<head>
                    <style>
                        .monaco-shell a {
                            color: #6c6c6c
                        } 
                        a {
                            color: #bbb
                        } 
                        .button {
                            border: 0px;
                            background-color: inherit;
                            color: inherit;
                            font-weight: bold
                        }
                        .monaco-shell .storage {
                            color: #0000FF
                        }
                        .monaco-shell .function_name {
                            color: #795E26
                        }
                        .monaco-shell .parameter_variable {
                            color: #001080
                        }
                        .storage {
                            color: #569CD6
                        }
                        .function_name {
                            color: #DCDCAA
                        }
                        .parameter_variable {
                            color: #9CDCFE
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
                            segmentDescription = fillSegmentData(segmentDescription, segment, "methods", "Методы", "method");
                            segmentDescription = fillSegmentData(segmentDescription, segment, "properties", "Свойства", "property");
                            segmentDescription = fillSegmentData(segmentDescription, segment, "constructors", "Конструкторы", "constructor");
                            segmentDescription = fillSegmentData(segmentDescription, segment, "values", "Значения", "value");
                            document.getElementById('header').innerHTML = elem.innerHTML; 
                            document.getElementById('el').innerHTML = segmentDescription;
                        }

                        function fillSegmentData(segmentDescription, segment, strSegment, headerSegment, nameID) {
                            if (segment[strSegment]) {
                                segmentDescription = segmentDescription + "<h1 style='font-size: 1em;'>" + headerSegment + "</h1><ul>";
                                var counter = 0;
                                for (var elem in segment[strSegment]) {
                                    counter = counter + 1;
                                    var onlyOs = "";${fillStructure.onlyOs}
                                    var alias = (nameID === "constructor") ? "" : ((segment[strSegment][elem]["alias"]!=="")?(" / " + segment[strSegment][elem]["alias"]):"");
                                    segmentDescription = segmentDescription + "<li><a id = "+"'" + nameID + counter + "' " + "href='#' onclick='fill(this)'>" + elem + alias + "</a>" + onlyOs + "</li>";
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
                            var strSegment = document.getElementById('header').innerHTML.replace(new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            var str = elem.innerHTML.replace(new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            var charSegment = "";
                            if (elem.id.slice(0,6)==="method"){
                                charSegment = "methods";
                            } else if (elem.id.slice(0,8)==="property"){
                                charSegment = "properties";
                            } else if (elem.id.slice(0,11)==="constructor"){
                                charSegment = "constructors";
                            } else if (elem.id.slice(0,5)==="value"){
                                charSegment = "values";
                            }
                            let methodData = JSON.parse(window.localStorage.getItem('bsl-language'))[strSegment][charSegment][str];
                            var depp = "";
                            if (charSegment === "constructors") {
                                str = strSegment;
                            }
                            depp = fillDescriptionData(methodData, depp, "description", "signature", "returns", str, charSegment);
                            document.getElementById('headerMethod').innerHTML = elem.innerHTML;
                            if (!methodData.description1C&&!methodData["Параметры1С"]){
                                document.getElementById('desc').innerHTML = "Только для OneScript";
                                } else {
                                document.getElementById('desc').innerHTML =  "Описание OneScript<br/>(<a href='#' name = '"+charSegment + "' onclick='switchDescription(this)' style='font-size:1em'>переключить<\a>)";
                                }
                            document.getElementById('elMethod').innerHTML = depp;
                        }

                        function switchDescription(elem) {
                            var charSegment = "";
                            if (elem.name.slice(0,6)==="method"){
                                charSegment = "methods";
                            } else if (elem.name.slice(0,8)==="properti"){
                                charSegment = "properties";
                            } else if (elem.name.slice(0,11)==="constructor"){
                                charSegment = "constructors";
                            } else if (elem.name.slice(0,5)==="value"){
                                charSegment = "values";
                            }
                            var strMethod = document.getElementById('headerMethod').innerHTML.replace("<br>", "").replace(new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            var strSegment = document.getElementById('header').innerHTML.replace(new RegExp('\\n[ ]*','m'),'').split(" / ")[0];
                            let methodData = JSON.parse(window.localStorage.getItem('bsl-language'))[strSegment][charSegment][strMethod];
                            if (charSegment === "constructors"){
                                strMethod = strSegment;
                            }
                            let depp = "";
                            if (document.getElementById('desc').innerHTML.slice(0,11)==="Описание 1С") {
                                depp = fillDescriptionData(methodData, depp, "description", "signature", "returns", strMethod, charSegment);
                                document.getElementById('desc').innerHTML =  "Описание OneScript<br/>(<a href='#' name = '"+charSegment + "' onclick='switchDescription(this)' style='font-size:1em'>переключить<\a>)";
                            } else {
                                depp = fillDescriptionData(methodData, depp, "description1C", "signature1C", "returns1C", strMethod, charSegment);
                                document.getElementById('desc').innerHTML =  "Описание 1С<br/>(<a href='#' name = '" + charSegment + "' onclick='switchDescription(this)' style='font-size:1em'>переключить<\a>)";
                            }
                            document.getElementById('elMethod').innerHTML = depp;
                        }

                        function fillDescriptionData(methodData, depp, descContext, paramContext, returns, strMethod, charSegment) {
                            if (methodData[descContext]) { depp = methodData[descContext].replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/').replace(new RegExp("\\\\^\\\\&%","g"),'\\\\') + "<br/>"; }
                            if (methodData[returns]) { depp = depp + "<b><em>Возвращаемое значение: </em></b>" + methodData[returns] + "<br/>";}
                            if (methodData["Доступ"]) { depp = depp + "<b><em>Доступ: </em></b>" + methodData["Доступ"].replace("^&*",'\\/') + "<br/>";}
                            var constructor = (charSegment === "constructors")? "Новый " : "";
                            if (charSegment === "methods" || charSegment === "constructors") {
                                if (methodData[paramContext]) {
                                    for (let element in methodData[paramContext]) {
                                        var name_syntax = (element === "default") ? "" : " " + element;
                                        depp = depp + "<p><b>Синтаксис" + name_syntax + ":</b></p><p>"+ constructor + "<span class='function_name'>" + strMethod + "</span><span class='parameter_variable'>" + methodData[paramContext][element]["СтрокаПараметров"] + "</span></p>";
                                        let header = false;
                                        for (let param in methodData[paramContext][element].Параметры) {
                                            if (header === false) {
                                                depp = depp + "<p><b>Параметры:</b></p><p>";
                                                header = true;
                                            }
                                            var paramDescription = "<b><em>" + param + ":</em></b> " + methodData[paramContext][element].Параметры[param].replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/').replace(new RegExp("\\\\^\\\\&%","g"),'\\\\');
                                            depp = depp + paramDescription + "<br/>";
                                        }
                                        depp = depp + "</p>";
                                    }
                                } else {
                                    var ret = new RegExp("Тип: ([^.]+)\\.", "");
                                    var retValue = (!methodData[returns]) ? "" : ": "+ ret.exec(methodData[returns])[1];
                                    depp = depp + "<p><b>Синтаксис:</b></p><p><span class='function_name'>" + strMethod + "</span><span class='parameter_variable'>()" + retValue + "</span></p>";
                                }
                            }
                            if (methodData["example"] && descContext === "description") { depp = depp + "<h3 style='font-size: 1em;>Пример:</h3><p>" + methodData["example"].replace(new RegExp("\\\\^\\\\&\\\\*","g"),'\\/').replace("^&%",'\\\\')+ "</p>";}
                            return depp;
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
                                    document.getElementById('struct').style.height = (e.clientY - document.getElementById('struct').offsetTop)  + "px";
                                } else {
                                    document.getElementById('el').style.height = (e.clientY - document.getElementById('el').offsetTop)  + "px";
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
                    </script>
                </head>

                <body>
                    <script>
                        (function() {
                            try {
                                ${fillStructure.textSyntax}
                                var theme = window.localStorage.getItem('storage://global/workbench.theme');
                                if (theme && theme.indexOf('vs-dark') < 0) {
                                    window.document.body.className = 'monaco-shell'; // remove the dark theme class if we are on a light theme
                                }
                            } catch (error) {
                                console.error(error);
                            }
                        })();
                    </script>
                    <h1 style="font-size: 1em; margin-left:5px">${fillStructure.globalHeader}</h1>
                    <hr>
                    <div id = "struct" style="overflow-y: scroll; margin-left:5px; height: ${fillStructure.menuHeight};">
                        <h1 style="font-size: 1em;">Глобальный контекст</h1>
                        <ul>${fillStructure.globCont}</ul>
                        <h1 style="font-size: 1em;">Доступные классы</h1>
                        ${fillStructure.classes}</ul>
                    </div>
                    <div id = "splitter1" style = "background: #9A9A9A; display:${fillStructure.classVisible}; cursor: n-resize; height:2px; margin-top:4px;" onmousedown="drag(this, event);"></div>
                    <div id="cont" style = "display:${fillStructure.classVisible};">
                        <h1 id="header" style="font-size: 1em; float:left; margin-left:5px; width:90%; margin-right:0px">${fillStructure.segmentHeader}</h1> 
                        <input type = "button" class = "button" value = "x" onclick = "document.getElementById('cont').style.display = 'none'; document.getElementById('splitter1').style.display = 'none'; document.getElementById('struct').style.height = '100%'" style="float: right; margin-top: 6px">
                        <hr style = "clear:both">
                        <div id="el" style = "overflow-y: scroll; margin-left:5px; height: ${fillStructure.elHeight}">
                            ${fillStructure.segmentDescription}
                        </div> 
                    <div id = "splitter2" style = "background: #9A9A9A; display:${fillStructure.methodVisible}; cursor: n-resize; height:2px; margin-top:4px;" onmousedown="drag(this, event);"></div>
                    <div id="contMethod" style = "display:${fillStructure.methodVisible};">
                        <div style="float:left; width:90%; margin-right:0px; margin-left:5px"><h1 id="headerMethod" style="font-size: 1em; float:left; width:50%;">${fillStructure.methodHeader}</h1> 
                        <span id = "desc" style='font-size:0.8em; width:95px; float:right; margin-top:5px; display:${fillStructure.displaySwitch}'>${fillStructure.switch1C}<\span>
                        </div>
                        <input type = "button" class = "button" value = "x" onclick = "document.getElementById('contMethod').style.display = 'none'; document.getElementById('splitter2').style.display = 'none'; document.getElementById('el').style.height = '60%'" style="float: right; margin-top:5px">
                        <hr style = "clear:both">
                        <div id="elMethod" style = "overflow-y: scroll; margin-left:5px">
                            ${fillStructure.methodDescription}
                        </div> 
                    </div>
                    </div>
                </body>`;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }
}