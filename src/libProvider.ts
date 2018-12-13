import * as fs from "fs-extra";
import * as path from "path";

export default class LibProvider {
    public bslglobals: ISyntaxHelper;
    public oscriptStdLib: ISyntaxHelper;
    constructor() {
        this.bslglobals = JSON.parse(
            fs.readFileSync(
                path.join(path.join(__dirname, "..", "..", "lib"), "bslGlobals.json"),
                "utf8"
            )
        );
        this.oscriptStdLib = JSON.parse(
            fs.readFileSync(
                path.join(path.join(__dirname, "..", "..", "lib"), "oscriptStdLib.json"),
                "utf8"
            )
        );
    }
}

interface ISyntaxHelper {
    systemEnum?: IBSLSystemEnums;
    classes?: IBSLClasses;
    keywords?: IKeywords;
    globalvariables?: IBSLPropertyDefinitions;
    globalfunctions?: IBSLMethods;
    structureMenu?: ISyntaxHelperMenu;
}

interface ISyntaxHelperMenu {
    global: ISyntaxHelperGlobalSections;
    classes: ISyntaxHelperClass[];
}

interface ISyntaxHelperGlobalSections {
    [index: string]: string[];
}

interface ISyntaxHelperClass {
    name: string;
    subclasses: ISyntaxHelperClass[];
}

export interface IBSLMethods {
    [index: string]: IBSLMethod;
}

interface IBSLMethod {
    name: string;
    name_en: string;
    description: string;
    signature: ISignatureCollection;
    returns?: string;
    example?: string;
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

export interface IBSLPropertyDefinitions {
    [index: string]: IBSLPropertyDefinition;
}

interface IBSLPropertyDefinition {
    name: string;
    name_en: string;
    description: string;
    access?: string;
    example?: string;
}

export interface IBSLClasses {
    [index: string]: IBSLClass;
}

interface IBSLClass {
    name: string;
    name_en: string;
    description: string;
    methods?: IBSLMethods;
    properties?: IBSLPropertyDefinitions;
    constructors?: IConstructorDefinitions;
}

interface IConstructorDefinitions {
    [index: string]: IConstructorDefinition;
}

interface IConstructorDefinition {
    description?: string;
    signature: string;
    oscript_description?: string;
    params?: ISignatureParameters;
}

interface IBSLSystemEnum {
    name: string;
    name_en: string;
    description: string;
    values: IBSLSystemEnumValue[];
}

interface IBSLSystemEnumValue {
    name?: string;
    name_en?: string;
    description?: string;
}

export interface IBSLSystemEnums {
    [index: string]: IBSLSystemEnum;
}

interface IKeywords {
    ru: IKeywordsForLanguage;
    en: IKeywordsForLanguage;
}

interface IKeywordsForLanguage {
    [index: string]: string;
}
