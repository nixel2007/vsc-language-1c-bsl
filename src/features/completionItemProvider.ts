import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalCompletionItemProvider extends AbstractProvider implements vscode.CompletionItemProvider {
    public added: object;
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position): Thenable<vscode.CompletionItem[]> {

        this.added = {};

        return new Promise((resolve) => {
            let bucket = new Array<vscode.CompletionItem>();
            if (position.character > 0) {
                const char = document.getText(new vscode.Range(
                    new vscode.Position(position.line, position.character - 1), position));
                if (char === "." && position.character > 1) {
                    bucket = this.getDotComplection(document, position);
                    return resolve(bucket);
                } else if (!char.match(/[/\()"':,.;<>~!@#$%^&*|+=\[\]{}`?\…-\s\n\t]/)) {
                    let word = document.getText(
                        new vscode.Range(document.getWordRangeAtPosition(position).start, position)
                    );
                    word = this._global.fullNameRecursor(
                        word,
                        document,
                        document.getWordRangeAtPosition(position),
                        true
                    );
                    let result: any[];
                    if (word.indexOf(".") === -1) {
                        if (document.getText(new vscode.Range(new vscode.Position(position.line, 0), position))
                            .match(/.*=\s*[\wа-яё]+$/i)) {
                            bucket = this.getGlobals(word, true);
                            bucket = this.getAllWords(word, document.getText(), bucket);
                            for (const key in this._global.systemEnum) {
                                const full = this._global.systemEnum[key];
                                if (vscode.window.activeTextEditor.document.fileName
                                    .toLowerCase().endsWith(".bsl") && !full.description) {
                                    continue;
                                } else if (vscode.window.activeTextEditor.document.fileName
                                    .toLowerCase().endsWith(".os") && !full.oscript_description) {
                                    continue;
                                }
                                const item = new vscode.CompletionItem(full.name);
                                item.documentation = full.description;
                                item.kind = vscode.CompletionItemKind.Enum;
                                bucket.push(item);
                            }
                            return resolve(bucket);
                        } else if (document.getText(new vscode.Range(new vscode.Position(position.line, 0), position))
                        .match(/(^|[\(;=,\s])(новый|new)\s+[\wа-яё]+$/i)) {
                            for (const key in this._global.classes) {
                                const full = this._global.classes[key];
                                if (!full.constructors) {
                                    continue;
                                }
                                if (vscode.window.activeTextEditor.document.fileName
                                    .toLowerCase().endsWith(".bsl") && !full.description) {
                                    continue;
                                } else if (vscode.window.activeTextEditor.document.fileName
                                    .toLowerCase().endsWith(".os") && !full.oscript_description) {
                                    continue;
                                }
                                const item = new vscode.CompletionItem(full.name);
                                item.documentation = full.description;
                                item.kind = vscode.CompletionItemKind.Class;
                                bucket.push(item);
                            }
                            return resolve(bucket);
                        } else {
                            bucket = this.getGlobals(word);
                            result = this._global.getCacheLocal(word, document.getText());
                            result.forEach((value) => {
                                if (!this.added[value.name.toLowerCase()] === true) {
                                    const item = new vscode.CompletionItem(value.name);
                                    item.documentation = value.description;
                                    item.kind = vscode.CompletionItemKind.Function;
                                    item.insertText = (value._method.Params.length > 0)
                                    ? (value.name + "(") : (value.name + "()");
                                    bucket.push(item);
                                    this.added[value.name.toLowerCase()] = true;
                                }
                            });
                            bucket = this.getAllWords(word, document.getText(), bucket);
                            result = this._global.querydef(word);
                            result.forEach((value) => {
                                const moduleDescription = (value.module && value.module.length > 0)
                                    ? value.module + "."
                                    : "";
                                let fullName = moduleDescription + value.name;
                                let description = value.description;
                                if (moduleDescription.length > 0) {
                                    fullName = value.module;
                                    description = fullName;
                                }
                                if (this.added[(fullName).toLowerCase()] !== true) {
                                    const item = new vscode.CompletionItem(fullName);
                                    item.documentation = description;
                                    item.kind = vscode.CompletionItemKind.Module;
                                    bucket.push(item);
                                    this.added[(fullName).toLowerCase()] = true;
                                }
                            });
                        }
                    } else {
                        this.checkSystemEnums(word, bucket);
                        const arrayObjectName = word.split(".").slice(0, -1);
                        word = arrayObjectName.join(".");
                        if (this._global.toreplaced[word.split(".")[0]]) {
                            const arrayName = word.split(".");
                            arrayName.splice(0, 1, this._global.toreplaced[arrayName[0]]);
                            word = arrayName.join(".");
                        }
                        const queryResult: any[] = this._global.querydef(word);
                        this.customDotComplection(queryResult, word, bucket);
                    }
                    return resolve(bucket);
                } else {
                    return resolve(bucket);
                }
            }
        });
    }

    private getRegExp(word: string): RegExp {
        let wordMatch = new RegExp(".*", "i");
        if (word.length > 0) {
            wordMatch = new RegExp(word, "i");
        }
        return wordMatch;
    }

    private getAllWords(word: string, source: string, completions: vscode.CompletionItem[]): vscode.CompletionItem[] {
        const wordMatch = this.getRegExp(word);
        const S = source.split(/[^а-яёА-ЯЁ_a-zA-Z]+/);
        for (let sourceWord of S) {
            sourceWord = sourceWord.trim();
            if (!this.added[sourceWord.toLowerCase()] && sourceWord.length > 5 && wordMatch.exec(sourceWord)) {
                if (sourceWord === word) {
                    continue;
                }
                this.added[sourceWord.toLowerCase()] = true;
                const completion = new vscode.CompletionItem(sourceWord);
                completion.kind = vscode.CompletionItemKind.Text;
                completions.push(completion);
            }
        }
        return completions;
    }

    private getGlobals(word: string, returns = false): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = new Array<vscode.CompletionItem>();
        const wordMatch = this.getRegExp(word);
        const completionDictFunctions = this._global.globalfunctions;
        for (const name in completionDictFunctions) {
            if (wordMatch.exec(name)) {
                if (returns && !completionDictFunctions[name].returns) {
                    continue;
                }
                const full = completionDictFunctions[name];
                if (vscode.window.activeTextEditor.document.fileName
                    .toLowerCase().endsWith(".bsl") && !full.description) {
                    continue;
                } else if (vscode.window.activeTextEditor.document.fileName
                    .toLowerCase().endsWith(".os") && !full.oscript_signature) {
                    continue;
                }
                const completion = new vscode.CompletionItem(full.name);
                completion.kind = vscode.CompletionItemKind.Function;
                if (full.description || full.oscript_description) {
                    completion.documentation = (full.description) ? full.description : full.oscript_description;
                }
                if (full.signature || full.oscript_signature) {
                    const signature = (full.signature) ? full.signature : full.oscript_signature;
                    const signatureDefault = signature.default;
                    if (signatureDefault) {
                        completion.detail = signatureDefault.СтрокаПараметров;
                    } else {
                        let syn = 0;
                        let detail = "";
                        for (const signatureName in signature) {
                            syn++;
                            detail += (syn === 1 ? "" : ", \n")
                             + syn + ". " + signature[signatureName].СтрокаПараметров;
                        }
                        completion.detail =
                        "" + syn + " вариант" + (syn < 5 ? "a " : "ов ") + "синтаксиса: \n" + detail;
                    }
                    completion.insertText = full.name + "(";
                } else {
                    completion.insertText = full.name + "()";
                }
                completions.push(completion);
                this.added[name] = true;
            }
        }
        const completionDictVariables = this._global.globalvariables;
        for (const name in completionDictVariables) {
            if (wordMatch.exec(name)) {
                const full = completionDictVariables[name];
                if (vscode.window.activeTextEditor.document.fileName
                    .toLowerCase().endsWith(".bsl") && full.oscript_access) {
                    continue;
                } else if (vscode.window.activeTextEditor.document.fileName
                    .toLowerCase().endsWith(".os") && !full.oscript_access) {
                    continue;
                }
                const completion = new vscode.CompletionItem(full.name);
                completion.kind = vscode.CompletionItemKind.Variable;
                if (full.description || full.oscript_description) {
                    completion.documentation = (full.description) ? full.description : full.oscript_description;
                }
                completions.push(completion);
                this.added[name] = true;
            }
        }
        const completionDictKeywords = this._global.keywords;
        for (const name in completionDictKeywords) {
            if (wordMatch.exec(name)) {
                const full = completionDictKeywords[name];
                const completion = new vscode.CompletionItem(full);
                completion.kind = vscode.CompletionItemKind.Keyword;
                completions.push(completion);
                this.added[name.toLowerCase()] = true;
            }
        }
        const completionDictSystemEnum = this._global.systemEnum;
        for (const name in completionDictSystemEnum) {
            if (wordMatch.exec(name)) {
                const full = completionDictSystemEnum[name];
                const completion = new vscode.CompletionItem(full.name);
                completion.kind = vscode.CompletionItemKind.Enum;
                if (full.description) {
                    completion.documentation = full.description;
                }
                completions.push(completion);
                this.added[name.toLowerCase()] = true;
            }
        }
        return completions;
    }

    private getDotComplection(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        let result = new Array<vscode.CompletionItem>();
        const basePosition = new vscode.Position(position.line, position.character - 2);
        const wordRange = document.getWordRangeAtPosition(basePosition);
        if (wordRange) {
            let wordAtPosition = document.getText(document.getWordRangeAtPosition(basePosition));
            wordAtPosition = this._global.fullNameRecursor(
                wordAtPosition,
                document,
                document.getWordRangeAtPosition(basePosition),
                true
            );
            if (this._global.toreplaced[wordAtPosition.split(".")[0]]) {
                const arrayName = wordAtPosition.split(".");
                arrayName.splice(0, 1, this._global.toreplaced[arrayName[0]]);
                wordAtPosition = arrayName.join(".");
            }
            let queryResult: any[] = this._global.querydef(wordAtPosition + "\\.");
            result = this.customDotComplection(queryResult, wordAtPosition, result);
            this.checkSystemEnums(wordAtPosition, result);
            // Получим все общие модули, у которых не заканчивается на точку.
            queryResult = this._global.querydef(wordAtPosition, false, false);
            for (const element of queryResult) {
                if (!element._method.IsExport) {
                    continue;
                }
                if (!element.oscriptLib && !this.isModuleAccessable(element.filename)) {
                    continue;
                }
                const item: vscode.CompletionItem = new vscode.CompletionItem(element.name);
                item.kind = vscode.CompletionItemKind.Function;
                item.documentation = element.description;
                item.insertText = (element._method.Params.length > 0)
                ? (element.name + "(") : (element.name + "()");
                result.push(item);
            }
        }
        return result;
    }

    private customDotComplection(queryResult, wordAtPosition, result) {
        const metadata = {};
        for (const element of queryResult) {
            if (element.module) {
                const moduleArray = element.module.split(".");
                if ((moduleArray.length > 1) && wordAtPosition.indexOf(".") === -1) {
                    if (!metadata[moduleArray[0] + "." + moduleArray[1]] === true) {
                        const item: vscode.CompletionItem = new vscode.CompletionItem(moduleArray[1]);
                        item.kind = vscode.CompletionItemKind.Class;
                        result.push(item);
                        metadata[moduleArray[0] + "." + moduleArray[1]] = true;
                    }
                    continue;
                } else {
                    if (!element._method.IsExport) {
                        continue;
                    }
                    if (!this.isModuleAccessable(element.filename)) {
                        continue;
                    }
                    const item: vscode.CompletionItem = new vscode.CompletionItem(element.name);
                    item.kind = vscode.CompletionItemKind.Function;
                    item.documentation = element.description;
                    item.insertText = element.name + "(";
                    result.push(item);
                    metadata[moduleArray[0] + (moduleArray.length > 1) ? ("." + moduleArray[1]) : ""] = true;
                    continue;
                }
            }
        }
        return result;
    }

    private isModuleAccessable(filename: string): boolean {
        const arrayFilename = filename.split("/");
        return arrayFilename[arrayFilename.length - 4] === "CommonModules" || filename.endsWith("ManagerModule.bsl");
    }

    private checkSystemEnums(wordAtPosition: string, result): void {
        let enumName = wordAtPosition;
        const wordsArray = wordAtPosition.split(".");
        let wordMatch;
        if (wordsArray.length > 1) {
            enumName = wordsArray[0];
            wordMatch = this.getRegExp(wordsArray[1]);
        }
        const systemEnums = this._global.systemEnum;
        for (const key in systemEnums) {
            if (!systemEnums.hasOwnProperty(key)) {
                continue;
            }
            const systemEnum = systemEnums[key];
            if (enumName.toLowerCase() === systemEnum.name.toLowerCase()) {
                const values = (vscode.window.activeTextEditor.document.fileName.endsWith(".bsl"))
                ? systemEnum.values : systemEnum.oscript_values;
                for (const value of values) {
                    if (wordMatch) {
                        if (!wordMatch.exec(value.name)) {
                            continue;
                        }
                    }
                    const item: vscode.CompletionItem = new vscode.CompletionItem(
                        value.name,
                        vscode.CompletionItemKind.Enum
                    );
                    item.documentation = value.description;
                    result.push(item);
                }
            }
        }
    }

}
