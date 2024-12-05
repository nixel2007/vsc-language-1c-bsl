import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalHoverProvider extends AbstractProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover {
        if (!this._global.hoverTrue) {
            this._global.hoverTrue = true;
            return undefined;
        }

        const wordRange = document.getWordRangeAtPosition(position);
        let word = document.getText(wordRange);
        if (word.split(" ").length > 1) {
            return undefined;
        }
        if (
            document.getText(
                new vscode.Range(
                    wordRange.end,
                    new vscode.Position(wordRange.end.line, wordRange.end.character + 1)
                )
            ) !== "("
        ) {
            return undefined;
        }
        word = this._global.fullNameRecursor(word, document, wordRange, true);
        let entry = undefined;
        const ch = word.length;
        let verify = true;
        if (wordRange.start.character - ch > 0) {
            const wordOfPosition = document.getText(
                new vscode.Range(
                    wordRange.start.line,
                    0,
                    wordRange.start.line,
                    wordRange.start.character - 1
                )
            );
            if (!wordOfPosition.trim().endsWith("Новый")) {
                verify = false;
            }
        }
        if (this._global.libClasses[word.toLowerCase()] && verify) {
            entry = this._global.libClasses[word.toLowerCase()].constructors["По умолчанию"];
            return this.hoverOfClasses(entry, "os");
        } else if (this._global.globalfunctions[word.toLowerCase()]) {
            entry = this._global.globalfunctions[word.toLowerCase()];
        } else if (this._global.classes[word.toLowerCase()] && verify) {
            entry = this._global.classes[word.toLowerCase()];
            return this.hoverOfClasses(entry, "bsl");
        }
        let entries;
        if (!entry) {

            // Отключаем ховер методов при включенном BSL LS
            if (this._global.languageServerEnabled) {
                return undefined;
            }

            let module = "";
            if (word.indexOf(".") > 0) {
                const dotArray: string[] = word.split(".");
                word = dotArray.pop();
                if (this._global.toreplaced[dotArray[0]]) {
                    dotArray[0] = this._global.toreplaced[dotArray[0]];
                }
                module = dotArray.join(".");
            }
            if (module.length === 0) {
                const source = document.getText();
                entries = this._global.getCacheLocal(word, source, false);
            } else {
                entries = this._global.query(word, module, false, false);
            }
            // Показ ховера по имени функции
            // if (entry.length === 0) {
            //     entry = this._global.query(word, "", false, false);
            // }
            if (!entry && entries.length === 0) {
                return undefined;
            } else if (module.length === 0) {
                return this.GetHover(entries[0], "Метод текущего модуля");
            } else {
                for (const hoverElement of entries) {
                    const arrayFilename = hoverElement.filename.split("/");
                    if (
                        !hoverElement.oscriptLib &&
                        arrayFilename[arrayFilename.length - 4] !== "CommonModules" &&
                        !hoverElement.filename.endsWith("ManagerModule.bsl")
                    ) {
                        continue;
                    }
                    if (hoverElement._method.IsExport) {
                        return this.GetHover(hoverElement, "Метод из " + hoverElement.filename);
                    }
                }
                return undefined;
            }
        }
        const description = [];
        let context = "1C";
        const signature = !entry.signature ? entry.oscript_signature : entry.signature;
        const descMethod = !entry.description ? entry.oscript_description : entry.description;
        if (!descMethod) {
            return undefined;
        }
        if (!entry.description) {
            context = "OneScript";
        } else if (entry.oscript_signature) {
            context = context + " (доступен в OneScript)";
        }
        description.push("Метод глобального контекста " + context);
        description.push(descMethod);
        if (entry.returns) {
            description.push("***Возвращаемое значение:*** " + entry.returns);
        }

        for (const element in signature) {
            const re = new RegExp("\\(.*\\):\\s*.*", "g");
            const retValue = re.exec(signature[element].СтрокаПараметров)
                ? "Функция "
                : "Процедура ";
            description.push({
                language: "bsl",
                value: retValue + entry.name + signature[element].СтрокаПараметров
            });
            // description.push("Параметры");
            for (const param in signature[element].Параметры) {
                description.push(`***${param}***: ${signature[element].Параметры[param]}`);
            }
        }
        return new vscode.Hover(description);
    }

    private hoverOfClasses(entry, context) {
        const description = [];
        if (context === "os") {
            description.push("Конструктор класса oscript-library");
            description.push({
                language: "bsl",
                value: entry.name + entry.signature.default["СтрокаПараметров"]
            });
        } else if (context === "bsl") {
            let desc = "Конструктор класса 1C";
            if (!entry.description) {
                desc = "Конструктор класса OneScript";
            } else if (entry.oscript_description !== undefined) {
                desc = desc + " (доступен в OneScript)";
            }
            description.push(desc);
            for (const key in entry.constructors) {
                description.push({
                    language: "bsl",
                    value: entry.name + entry.constructors[key].signature
                });
            }
        }
        return new vscode.Hover(description);
    }

    private GetHover(entry, methodContext) {
        const description = [];
        let methodDescription = "";
        const arraySignature = this._global.GetSignature(entry);
        const re = new RegExp("(Параметры|Parameters)(.|\\s)*\\n\\s*", "g");
        const paramString = re.exec(arraySignature.description);
        methodDescription = paramString
            ? arraySignature.description.substr(0, paramString.index)
            : arraySignature.description;
        methodDescription =
            methodDescription + (arraySignature.fullRetState ? arraySignature.fullRetState : "");
        description.push(methodContext);
        description.push(methodDescription);
        description.push({
            language: "bsl",
            value:
                (entry.isproc ? "Процедура " : "Функция ") +
                entry.name +
                arraySignature.paramsString +
                (arraySignature.strRetState ? ": " + arraySignature.strRetState : "")
        });
        for (const param of entry._method.Params) {
            const documentationParam = this._global.GetDocParam(
                arraySignature.description,
                param.name
            );
            description.push(`***${param.name}***: ${documentationParam.descriptionParam}`);
        }
        return new vscode.Hover(description);
    }
}
