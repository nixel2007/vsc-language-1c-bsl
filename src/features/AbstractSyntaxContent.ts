import LibProvider from "../libProvider";
const libProvider = new LibProvider();

abstract class AbstractSyntaxContent {

    public syntaxFilled: string;

    public abstract getSyntaxContentItems(dllData: object, libData: object): string;

    public abstract getStructure(textSyntax: string, dllData_syntaxObject: object, libData_oscriptMethods: object): any;

    public fillSegmentData(segmentDescription, segment, strSegment, headerSegment, nameID) {
        if (segment[strSegment]) {
            segmentDescription = segmentDescription + "<h1 style = 'font-size: 1em;'>" + headerSegment + "</h1><ul>";
            let counter = 0;
            for (const elem in segment[strSegment]) {
                counter = counter + 1;
                let onlyOs = "";
                if (this.syntaxFilled === "OneScript"
                    && !segment[strSegment][elem].description1C
                && !segment[strSegment][elem].signature1C) {
                    onlyOs = "*";
                }
                const alias = (nameID === "constructor")
                ? "" : (segment[strSegment][elem].alias !== "") ? (" / " + segment[strSegment][elem].alias) : "";
                segmentDescription = segmentDescription + "<li><span class='a' id = " + "'" + nameID
                + counter + "' " + " onclick='fill(this)'>" + elem + alias + "</span>" + onlyOs + "</li>";
            }
            segmentDescription = segmentDescription + "</ul>";
        }
        return segmentDescription;
    }

    public getSegmentData(segment, globalContext, context, segment1C) {
        const segmentChar = {};
        if (segment.description) {
            // tslint:disable-next-line:no-string-literal
            segmentChar["description"] = segment.description;
        }
        if (segment.name_en) {
            // tslint:disable-next-line:no-string-literal
            segmentChar["alias"] = segment.name_en;
        }
        if (segment.methods) {
            const methodsGlobalContext = {};
            for (const indexMethod in segment.methods) {
                const helper = segment.methods[indexMethod];
                let returns;
                let example;
                let signature1C;
                let description1C;
                let returns1C;
                let helper1C;
                let signature;
                if (context === "OneScript") {
                    returns = helper.returns;
                    example = helper.example;
                    signature = helper.signature;
                    helper1C = (segment1C && segment1C.methods) ? segment1C.methods[indexMethod] : undefined;
                    if (helper1C) {
                        signature1C = helper1C.signature;
                        description1C = helper1C.description;
                        returns1C = helper1C.returns;
                    }
                } else {
                    signature = helper.signature;
                    returns = helper.returns;
                }
                methodsGlobalContext[indexMethod] = {
                    description: helper.description,
                    alias: helper.name_en,
                    signature,
                    returns,
                    example,
                    description1C,
                    signature1C,
                    returns1C
                };
            }
            // tslint:disable-next-line:no-string-literal
            segmentChar["methods"] = methodsGlobalContext;
        }
        if (segment.properties) {
            const variableGlobalContext = {};
            for (const indexMethod in segment.properties) {
                const helper = segment.properties[indexMethod];
                const access = (helper.access) ? (helper.access) : undefined;
                let example;
                let description1C;
                let helper1C;
                if (context === "OneScript") {
                    example = (helper.example) ? (helper.example) : undefined;
                    helper1C = (globalContext)
                    ? libProvider.bslglobals.globalvariables[indexMethod] : (segment1C)
                    ? (segment1C.properties ? segment1C.properties[indexMethod] : undefined) : undefined;
                    if (helper1C && helper1C.description) {
                        description1C = helper1C.description;
                    }
                }
                variableGlobalContext[indexMethod] = {
                    description: helper.description,
                    alias: helper.name_en,
                    Доступ: access,
                    example,
                    description1C
                };
            }
            // tslint:disable-next-line:no-string-literal
            segmentChar["properties"] = variableGlobalContext;
        }
        if (segment.values) {
            const variableGlobalContext = {};
            for (const indexMethod in segment.values) {
                const helper = segment.values[indexMethod];
                let description1C;
                let helper1C;
                if (context === "OneScript") {
                    helper1C = (globalContext)
                    ? libProvider.bslglobals.globalvariables[indexMethod] : (segment1C)
                    ? (segment1C.values ? segment1C.values[indexMethod] : undefined) : undefined;
                    if (helper1C && helper1C.description) {
                        description1C = helper1C.description;
                    }
                }
                variableGlobalContext[indexMethod] = {
                    description: helper.description,
                    alias: helper.name_en,
                    description1C
                };
            }
            // tslint:disable-next-line:no-string-literal
            segmentChar["values"] = variableGlobalContext;
        }
        if (segment.constructors) {
            const classOs = {};
            for (const indexMethod in segment.constructors) {
                const helper = segment.constructors[indexMethod];
                const signature = {
                    default: { СтрокаПараметров: helper.signature, Параметры: helper.params }
                };
                let signature1C;
                let description1C;
                let helper1C;
                if (context === "OneScript") {
                    helper1C = (segment1C)
                    ? (segment1C.constructors
                    ? segment1C.constructors[indexMethod] : undefined) : undefined;
                    if (helper1C) {
                        description1C = helper1C.description;
                        signature1C = {
                            default: { СтрокаПараметров: helper1C.signature, Параметры: helper1C.params }
                        };
                    }
                }
                classOs[indexMethod] = { description: helper.description, signature, description1C, signature1C };
            }
            // tslint:disable-next-line:no-string-literal
            segmentChar["constructors"] = classOs;
        }
        return segmentChar;
    }
}

export default AbstractSyntaxContent;
