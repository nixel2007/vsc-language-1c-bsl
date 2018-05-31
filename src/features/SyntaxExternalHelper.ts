import * as path from "path";

import AbstractSyntaxContent from "./AbstractSyntaxContent";

import LibProvider from "../libProvider";
const libProvider = new LibProvider();

export default class SyntaxExternalHelper extends AbstractSyntaxContent {

    public getSyntaxContentItems(globalDllData, libData): any {
        const items = {};
        for (const dll in globalDllData) {
            for (const element in globalDllData[dll].classes) {
                const segment = globalDllData[dll].classes[element];
                const segmentChar = this.getSegmentData(segment, false, "OneScript",
                    libProvider.bslglobals.classes[segment.name]);
                items[element] = segmentChar;
                items[element].oscriptLib = dll;
            }
        }
        // for (const lib in libData) {
        //     for (const modul in libData[lib].modules) {
        //         items[modul] = libData[lib].modules[modul];
        //         items[modul].oscriptLib = lib;
        //     }
        // }

        return items;
    }

    public getStructure(textSyntax: string, dllData: object, libData: object): any {
        const fillStructure = {
            globalHeader: "Внешнее описание для пакета OneScript",
            textSyntax,
            descClass: "",
            descMethod: "",
            menuHeight: "100%",
            elHeight: "100%",
            classVisible: "none",
            methodVisible: "none",
            segmentHeader: "OneScript",
            methodHeader: "OneScript",
            displaySwitch: "none",
            switch1C: "Только для OneScript",
            segmentDescription: "Очень много текста",
            methodDescription: "Очень много текста",
            onlyOs: ""
        };
        return this.fillStructureSyntax(fillStructure, dllData, libData);
    }

    private fillStructureSyntax(fillStructure, dllData, libData) {
        let classes = "";
        const added = {};
        // if (Object.keys(libData).length > 0) {
        //     classes = classes + "</ul><h1 style='font-size: 1em;'>Библиотеки</h1>";
        //     for (const lib in libData) {
        //         const dataModul = libData[lib].modules;
        //         if (libData[lib].description) {
        //             classes = classes + "<h2 class='a' style='font-size: 1em;' onclick=\"readFile('"
        //                 + libData[lib].description.replace(/[\\]/g, "\\\\").replace(/[\/]/g, "\\/")
        //                 + "', '" + path.sep.replace(/[\\]/g, "\\\\").replace(/[\/]/g, "\\/")
        //                 + "');\"> <em>" + lib + " </em></h2 > <ul>";
        //         } else {
        //             classes = classes + "<h2 style='font-size: 1em;'> <em>" + lib + " </em></h2 > <ul>";
        //         }
        //         for (const modul in dataModul) {
        //             const onlyOs = "";

        //             classes = classes
        //                 + `<li><span class="a" onclick="fillDescription(this)">
        //                 ${modul}</span>${onlyOs}</li>`;
        //         }
        //         classes = classes + "</ul>";
        //     }
        // }
        if (Object.keys(libData).length > 0) {
            classes = classes + "</ul><h1 style='font-size: 1em;'>Внешние классы</h1>";
            for (const classDll in libData) {
                if (classDll === dllData.label) {
                    const defDll = libData[classDll];
                    if (libData[classDll].description) {
                        classes = classes + "<h2 class='a' style='font-size: 1em;' onclick=\"readFile('"
                            + libData[classDll].description.replace(/[\\]/g, "\\\\").replace(/[\/]/g, "\\/")
                            + "', '" + path.sep.replace(/[\\]/g, "\\\\").replace(/[\/]/g, "\\/")
                            + "');\" > <em>" + classDll + " </em></h2 > <ul>";
                    } else {
                        classes = classes + "<h2 style='font-size: 1em;'> <em>" + classDll + " </em></h2 > <ul>";
                    }

                    for (const element in defDll.classes) {
                        if (!added[element]) {
                            let onlyOs = "";
                            if (!libProvider.bslglobals.classes[element]) {
                                onlyOs = "*";
                            }
                            const alias = (defDll.classes[element].name_en !== "")
                                ? (" / " + defDll.classes[element].name_en) : "";
                            classes = classes
                                + `<li><span class="a" onclick="fillDescription(this)">
                            ${element + alias}</span>${onlyOs}</li>`;
                        }
                    }
                    classes = classes + "</ul>";
                }
            }
        }
        fillStructure.globCont = "";
        fillStructure.classes = classes;
        return fillStructure;
    }

}
