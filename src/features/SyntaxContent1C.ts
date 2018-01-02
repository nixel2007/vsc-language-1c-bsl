import AbstractSyntaxContent from "./AbstractSyntaxContent";

import LibProvider from "../libProvider";
const libProvider = new LibProvider();

export default class SyntaxContent1C extends AbstractSyntaxContent {

    public getSyntaxContentItems(): any {
        const items = {};
        const structureGlobContext = libProvider.bslglobals.structureMenu;
        const globalfunctions = libProvider.bslglobals.globalfunctions;
        const classes = libProvider.bslglobals.classes;
        const systemEnum = libProvider.bslglobals.systemEnum;

        for (const element in structureGlobContext.global) {
            const segment = structureGlobContext.global[element];
            const segmentChar = {};
            const methodsGlobalContext = {};
            for (const key in segment) {
                if (globalfunctions[key]) {
                    const methodData = globalfunctions[key];
                    methodsGlobalContext[key] = {
                        description: (methodData.description) ? methodData.description : "",
                        alias: methodData.name_en,
                        signature: methodData.signature,
                        returns: methodData.returns
                    };
                } else {
                    const methodData = libProvider.bslglobals.globalvariables[key];
                    methodsGlobalContext[key] = {
                        description: (methodData.description) ? methodData.description : "",
                        alias: methodData.name_en,
                        signature: undefined,
                        returns: undefined
                    };
                }
            }
            if (element === "Свойства") {
                // tslint:disable-next-line:no-string-literal
                segmentChar["properties"] = methodsGlobalContext;
                // tslint:disable-next-line:no-string-literal
            } else { segmentChar["methods"] = methodsGlobalContext; }
            items[element] = segmentChar;
        }
        for (const element in classes) {
            const segment = classes[element];
            const segmentChar = this.getSegmentData(segment, false, "1C", "");
            items[element] = segmentChar;
        }
        for (const element in systemEnum) {
            const segment = systemEnum[element];
            const segmentChar = this.getSegmentData(segment, false, "1C", "");
            items[element] = segmentChar;
        }

        return items;
    }

    public getStructure(textSyntax: string, syntaxObject: any, oscriptMethods: object): any {
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
        if (syntaxObject.label === "1C") {
            return this.fillStructureSyntax(fillStructure);
        }
        let methodDescription = "Очень много текста";
        const descClass = syntaxObject.description.split("/")[syntaxObject.description.split("/").length - 1];
        const descMethod = syntaxObject.label.split(".")[syntaxObject.label.split(".").length - 1];
        const alias = (oscriptMethods[descClass].alias && oscriptMethods[descClass].alias !== "")
        ? (" / " + oscriptMethods[descClass].alias) : "";
        const segmentHeader = descClass + alias;
        const segment = oscriptMethods[descClass];
        let segmentDescription = (segment.description) ? ("<p>" + segment.description + "</p>") : "";
        segmentDescription = this.fillSegmentData(segmentDescription, segment,
            "methods", "Методы", "method");
        segmentDescription = this.fillSegmentData(segmentDescription, segment,
            "properties", "Свойства", "property");
        segmentDescription = this.fillSegmentData(segmentDescription, segment,
            "constructors", "Конструкторы", "constructor");
        segmentDescription = this.fillSegmentData(segmentDescription, segment,
            "values", "Значения", "value");
        let methodHeader = "1C";
        if (descClass !== descMethod) {
            let methodData;
            let charSegment;
            for (const key in oscriptMethods[descClass]) {
                if (key === "properties" || key === "methods" || key === "values") {
                    for (const item in oscriptMethods[descClass][key]) {
                        if (item === descMethod) {
                            charSegment = key;
                            methodData = oscriptMethods[descClass][key][item];
                            methodHeader = descMethod + (methodData.alias !== ""
                            ? (" / " + methodData.alias) : "");
                            break;
                        }
                    }
                }
            }
            if (methodData) {
                methodDescription = "";
                if (methodData.description) { methodDescription = methodData.description + "<br/>"; }
                if (methodData.returns) {
                    methodDescription = methodDescription
                    + "<b><em>Возвращаемое значение: </em></b>" + methodData.returns + "<br/>";
                }
                if (methodData.Доступ) {
                    methodDescription = methodDescription
                    + "<b><em>Доступ: </em></b>" + methodData.Доступ + "<br/>"; }
                if (charSegment === "methods") {
                    if (methodData.signature) {
                        for (const element in methodData.signature) {
                            const nameSyntax = (element === "default") ? "" : " " + element;
                            methodDescription = methodDescription
                            + "<p><b>Синтаксис" + nameSyntax + ":</b></p><p class='hljs'><span class='function_name'>"
                            + descMethod + "</span><span class='parameter_variable'>"
                            + methodData.signature[element].СтрокаПараметров + "</span></p>";
                            let header = false;
                            for (const param in methodData.signature[element].Параметры) {
                                if (header === false) {
                                    methodDescription = methodDescription + "<p><b>Параметры:</b></p><p>";
                                    header = true;
                                }
                                const paramDescription = "<b><em>" + param + ":</em></b> "
                                + methodData.signature[element].Параметры[param].replace(
                                    new RegExp("\\\\^\\\\&\\\\*", "g"), "\\/").replace("^&%", "\\\\");
                                methodDescription = methodDescription + paramDescription + "<br/>";
                            }
                            methodDescription = methodDescription + "</p>";
                        }
                    } else {
                        const ret = new RegExp("Тип: ([^.]+)\\.", "");
                        const retValue = (!methodData.returns) ? "" : ": " + ret.exec(methodData.returns)[1];
                        methodDescription = methodDescription
                        + "<p><b>Синтаксис:</b></p><p><span class='function_name'>"
                        + descMethod + "</span><span class='parameter_variable'>()" + retValue + "</span></p>";
                    }
                }
                if (methodData.example) {
                    methodDescription = methodDescription + "<p><b>Пример:</b></p><pre class='hljs'>"
                        + methodData.example + "</pre>";
                }
            }
        }
        fillStructure = {
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
            methodDescription,
            onlyOs: ""
        };
        return this.fillStructureSyntax(fillStructure);
    }

    private fillStructureSyntax(fillStructure) {
        let globCont = "<h1 style='font-size: 1em;'>Глобальный контекст</h1><ul>";
        const structureGlobContext = libProvider.bslglobals.structureMenu;
        const bslclasses = libProvider.bslglobals.classes;
        const systemEnum = libProvider.bslglobals.systemEnum;
        for (const element in structureGlobContext.global) {
            globCont = globCont + `<li><span class="a" onclick="fillDescription(this)">${element}</span></li>`;
        }
        globCont = globCont + `</ul>`;
        fillStructure.globCont = globCont;
        let classes = "<h1 style='font-size: 1em;'>Доступные классы</h1>";
        const added = {};
        for (const segmentClass in structureGlobContext.classes) {
            classes = classes + "<h2 style='font-size: 1em;'><em>" + segmentClass + "</em></h2><ul>";
            for (const currentClass in structureGlobContext.classes[segmentClass]) {
                classes = classes
                + `<li><span class="a" onclick="fillDescription(this)">
                ${currentClass + " / " + bslclasses[currentClass].name_en}</span></li>`;
                added[currentClass] = true;
                if (structureGlobContext.classes[segmentClass][currentClass] !== "") {
                    classes = classes + "<ul>";
                    for (const childClass in structureGlobContext.classes[segmentClass][currentClass]) {
                        added[childClass] = true;
                        classes = classes
                        + `<li><span class="a" onclick="fillDescription(this)">
                        ${childClass + " / " + bslclasses[childClass].name_en}</span></li>`;
                    }
                    classes = classes + "</ul>";
                }
            }
            if (segmentClass !== "Прочее") {
                classes = classes + "</ul>";
            }
        }
        for (const element in bslclasses) {
            if (!added[element]) {
                const alias = (bslclasses[element].name_en !== "") ? (" / " + bslclasses[element].name_en) : "";
                classes = classes
                + `<li><span class="a" onclick="fillDescription(this)">${element + alias}</span></li>`;
            }
        }
        classes = classes + "</ul><h1 style='font-size: 1em;'>Системные перечисления</h1><ul>";
        for (const element in systemEnum) {
            const alias = (systemEnum[element].name_en !== "") ? (" / " + systemEnum[element].name_en) : "";
            classes = classes + `<li><span class="a" onclick="fillDescription(this)">${element + alias}</span></li>`;
        }
        fillStructure.classes = classes + "</ul>";
        return fillStructure;
    }

}
