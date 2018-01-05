
import AbstractSyntaxContent from "./AbstractSyntaxContent";

import LibProvider from "../libProvider";
const libProvider = new LibProvider();

export default class SyntaxContentOscript extends AbstractSyntaxContent {

    public getSyntaxContentItems(): any {
        const items = {};
        const structureGlobContext = libProvider.oscriptStdLib.structureMenu;
        const globalfunctions = libProvider.oscriptStdLib.globalfunctions;
        const classesOscript = libProvider.oscriptStdLib.classes;
        const systemEnum = libProvider.oscriptStdLib.systemEnum;
        for (const element in structureGlobContext.global) {
            const segment = structureGlobContext.global[element];
            const segmentChar = {};
            for (const key in segment) {
                let signature1C;
                let description1C;
                let returns1C;
                if (globalfunctions[key]) {
                    // tslint:disable-next-line:no-string-literal
                    if (!segmentChar["methods"]) {
                        // tslint:disable-next-line:no-string-literal
                        segmentChar["methods"] = {};
                    }
                    const methodData = globalfunctions[key];
                    if (libProvider.bslglobals.globalfunctions[key]) {
                        signature1C = libProvider.bslglobals.globalfunctions[key].signature;
                        description1C = libProvider.bslglobals.globalfunctions[key].description;
                        returns1C = libProvider.bslglobals.globalfunctions[key].returns;
                    }
                    // tslint:disable-next-line:no-string-literal
                    segmentChar["methods"][key] = {
                        description: (methodData.description) ? methodData.description : "",
                        alias: methodData.name_en,
                        signature: methodData.signature,
                        returns: methodData.returns,
                        example: methodData.example,
                        signature1C,
                        description1C,
                        returns1C
                    };
                } else {
                    // tslint:disable-next-line:no-string-literal
                    if (!segmentChar["properties"]) {
                        // tslint:disable-next-line:no-string-literal
                        segmentChar["properties"] = {};
                    }
                    const methodData = libProvider.oscriptStdLib.globalvariables[key];
                    if (libProvider.bslglobals.globalvariables[key]) {
                        description1C = libProvider.bslglobals.globalvariables[key].description;
                    }

                    // tslint:disable-next-line:no-string-literal
                    segmentChar["properties"][key] = {
                        description: (methodData.description) ? methodData.description : "",
                        alias: methodData.name_en,
                        Доступ: methodData.access,
                        signature: undefined,
                        returns: undefined,
                        description1C
                    };
                }
            }
            items[element] = segmentChar;
        }

        for (const element in classesOscript) {
            const segment = classesOscript[element];
            const segmentChar = this.getSegmentData(segment, false, "OneScript",
                libProvider.bslglobals.classes[segment.name]);
            items[element] = segmentChar;
        }
        for (const element in systemEnum) {
            const segment = systemEnum[element];
            const segmentChar = this.getSegmentData(segment, false, "OneScript",
                libProvider.bslglobals.systemEnum[segment.name]);
            items[element] = segmentChar;
        }

        return items;
    }

    public getStructure(textSyntax: string, syntaxObject: any, oscriptMethods: object): any {
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
            displaySwitch: "",
            switch1C: "Только для OneScript",
            segmentDescription: "Очень много текста",
            methodDescription: "Очень много текста",
            onlyOs: ""
        };
        if (syntaxObject.label === "OneScript") {
            return this.fillStructureSyntax(fillStructure);
        }
        let switch1C = "Только для OneScript";
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
        let methodHeader = "OneScript";
        if (descClass !== descMethod) {
            let methodData;
            for (const key in oscriptMethods[descClass]) {
                if (key === "properties" || key === "methods" || key === "values") {
                    for (const item in oscriptMethods[descClass][key]) {
                        if (item === descMethod) {
                            methodData = oscriptMethods[descClass][key][item];
                            methodHeader = descMethod +
                            (methodData.alias !== "" ? (" / " + methodData.alias) : "");
                            if (methodData.description1C || methodData.signature1C) {
                                switch1C = "Описание OneScript<br/>(<span class='a' id = '" + key
                                + "' onclick='switchDescription(this)' style='font-size:1em'>переключить</span>)";
                            }
                            break;
                        }
                    }
                }
            }
            if (methodData) {
                methodDescription = "";
                if (methodData.description) { methodDescription = methodData.description + "<br/>"; }
                if (methodData.returns) {
                    methodDescription = methodDescription + "<b><em>Возвращаемое значение: </em></b>"
                    + methodData.returns + "<br/>";
                }
                if (methodData.Доступ) {
                    methodDescription = methodDescription + "<b><em>Доступ: </em></b>"
                    + methodData.Доступ + "<br/>"; }
                if (methodData.signature) {
                    const stingParams = methodData.signature.default.СтрокаПараметров;
                    methodDescription = methodDescription
                    + "<p><b>Синтаксис:</b></p><p class='hljs'><span class='function_name'>"
                    + descMethod + "</span><span class='parameter_variable'>" + stingParams + "</span></p>";
                    if (methodData.signature.default.Параметры) {
                        methodDescription = methodDescription + "<p><b>Параметры:</b></p><p>";
                        for (const param in methodData.signature.default.Параметры) {
                            const paramDescription = "<b><em>" + param + ": </em></b>"
                            + methodData.signature.default.Параметры[param];
                            methodDescription = methodDescription + paramDescription + "<br/>";
                        }
                        methodDescription = methodDescription + "</p>";
                    }
                }
                if (methodData.example) {
                    methodDescription = methodDescription + "<p><b>Пример:</b></p><pre class='hljs'>"
                        + methodData.example + "</p>";
                }
            }
        }
        fillStructure = {
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
            displaySwitch: "",
            switch1C,
            segmentDescription,
            methodDescription,
            onlyOs: ""
        };
        return this.fillStructureSyntax(fillStructure);
    }

    private fillStructureSyntax(fillStructure) {
        let globCont = "<h1 style='font-size: 1em;'>Глобальный контекст</h1><ul>";
        const structureGlobContext = libProvider.oscriptStdLib.structureMenu;
        const classesOscript = libProvider.oscriptStdLib.classes;
        const systemEnum = libProvider.oscriptStdLib.systemEnum;

        for (const element in structureGlobContext.global) {
            globCont = globCont + `<li><span class="a" onclick="fillDescription(this)">${element}</span></li>`;
        }
        globCont = globCont + `</ul>`;
        let classes = "<h1 style='font-size: 1em;'>Доступные классы</h1>";
        const added = {};
        for (const segmentClass in structureGlobContext.classes) {
            classes = classes + "<h2 style='font-size: 1em;'><em>" + segmentClass + "</em></h2><ul>";
            for (const currentClass in structureGlobContext.classes[segmentClass]) {
                const onlyOs = (!libProvider.bslglobals.classes[currentClass]) ? "*" : "";
                classes = classes + `<li><span class="a" onclick="fillDescription(this)">
                ${currentClass + " / " + classesOscript[currentClass].name_en}</span>${onlyOs}</li>`;
                added[currentClass] = true;
                if (structureGlobContext.classes[segmentClass][currentClass] !== "") {
                    classes = classes + "<ul>";
                    for (const childClass in structureGlobContext.classes[segmentClass][currentClass]) {
                        added[childClass] = true;
                        classes = classes
                        + `<li><span class="a" onclick="fillDescription(this)">
                        ${childClass + " / " + classesOscript[childClass].name_en}</span></li>`;
                    }
                    classes = classes + "</ul>";
                }
            }
            if (segmentClass !== "Прочее") {
                classes = classes + "</ul>";
            }
        }
        for (const element in classesOscript) {
            if (!added[element]) {
                const onlyOs = (!libProvider.bslglobals.classes[element]) ? "*" : "";
                const alias = (classesOscript[element].name_en !== "")
                    ? (" / " + classesOscript[element].name_en) : "";
                classes = classes
                + `<li><span class="a" onclick="fillDescription(this)">${element + alias}</span>${onlyOs}</li>`;
            }
        }
        classes = classes + "</ul><h1 style='font-size: 1em;'>Системные перечисления</h1><ul>";
        for (const element in systemEnum) {
            const onlyOs = (!libProvider.bslglobals.systemEnum[element]) ? "*" : "";
            const alias = (systemEnum[element].name_en !== "")
                ? (" / " + systemEnum[element].name_en) : "";
            classes = classes
            + `<li><span class="a" onclick="fillDescription(this)">${element + alias}</span>${onlyOs}</li>`;
        }
        fillStructure.globCont = globCont;
        fillStructure.classes = classes;
        fillStructure.displaySwitch = "block";
        fillStructure.onlyOs = `if (!segment[strSegment][elem].description1C
            && !segment[strSegment][elem].signature1C){ onlyOs = "*";}`;
        return fillStructure;
    }

}
