import AbstractSyntaxContent from "./AbstractSyntaxContent";

export default class SyntaxContentBSL extends AbstractSyntaxContent {

    public getSyntaxContentItems(subsystems, metadata): any {
        const items = {};
        for (const file in subsystems) {
            if (Object.keys(subsystems[file]).length !== 0) {
                for (const mod in subsystems[file].object) {
                    items[mod] = subsystems[file].object[mod];
                }
                for (const subs of subsystems[file].subsystems) {
                    for (const mod in subs.content) {
                        items[mod] = subs.content[mod];
                    }
                }
            }
        }
        for (const md in metadata) {
            if (Object.keys(metadata[md]).length !== 0) {
                for (const mod in metadata[md][0]) {
                    items[mod] = metadata[md][0][mod];
                }
            }
        }
        return items;
    }

    public getStructure(textSyntax: string, syntaxObject: any, oscriptMethods: object,
                        subsystems: object, metadata): any {
        const fillStructure = {
            globalHeader: "Экспортные методы BSL",
            textSyntax,
            descClass: "",
            descMethod: "",
            menuHeight: "100%",
            elHeight: "100%",
            classVisible: "none",
            methodVisible: "none",
            segmentHeader: "BSL",
            methodHeader: "BSL",
            displaySwitch: "none",
            switch1C: "Только для BSL",
            segmentDescription: "Очень много текста",
            methodDescription: "Очень много текста",
            onlyOs: ""
        };
        return this.fillStructureSyntax(fillStructure, subsystems, metadata);
    }

    private fillStructureSyntax(fillStructure, subsystems, metadata) {
        let classes = "";
        if (Object.keys(subsystems).length > 0) {
            classes = classes + "</ul><h1 style='font-size: 1em;'>Фильтр по подсистемам</h1>";
            for (const classDll in subsystems) {
                if (Object.keys(subsystems[classDll]).length === 0) {
                    classes = classes
                        + `<li><a class="mod" href="command:language-1c-bsl.openContent?
                    ${encodeURI(JSON.stringify(["Subsystem." + classDll]))}">
                    ${classDll}</a></li>`;
                } else {
                    classes = classes
                        + `<li><b>${classDll}</b></li><ul>`;
                    if (subsystems[classDll].subsystems.length > 0) {
                        const subs = subsystems[classDll].subsystems;
                        for (const sub of subs) {
                            classes = classes + `<li><b>${sub.name}</b></li><ul>`;
                            for (const mod in sub.content) {
                                classes = classes + `<li><span class="a"
                                onclick="fillDescription(this)">${mod}</span></li>`;
                            }
                            classes = classes + `</ul>`;
                        }
                    }
                    for (const mod in subsystems[classDll].object) {
                        classes = classes + `<li><span class="a"
                        onclick="fillDescription(this)">${mod}</span></li>`;
                    }
                    classes = classes + `</ul>`;
                }
            }
        }
        if (Object.keys(metadata).length > 0) {
            classes = classes + "</ul><h1 style='font-size: 1em;'>Фильтр по видам метаданных</h1>";
            for (const lib in metadata) {
                    if (metadata[lib].length === 0) {
                        classes = classes
                        + `<li><a class="mod" href="command:language-1c-bsl.openContent?
                        ${encodeURI(JSON.stringify(["Metadata." + lib]))}">
                        ${lib}</a></li>`;
                    } else {
                        classes = classes + `<li><b>${lib}</b></li><ul>`;
                        for (const mod in metadata[lib][0]) {
                            classes = classes + `<li><span class="a"
                            onclick="fillDescription(this)">${mod}</span></li>`;
                        }
                        classes = classes + `</ul>`;
                    }
                }
            classes = classes + "</ul>";
        }
        fillStructure.globCont = "";
        fillStructure.classes = classes;
        return fillStructure;
    }

}
