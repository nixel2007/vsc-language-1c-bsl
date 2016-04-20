import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalHoverProvider extends AbstractProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Hover {
        let word = document.getText(document.getWordRangeAtPosition(position));
        let entry = this._global.globalfunctions[word.toLowerCase()];
        if (!entry || !entry.description) {
            return null;
        }
        let description = [];
        description.push(entry.description);
        for (let element in entry.signature) {
            description.push({language: "1C (BSL)", value: "Процедура " + entry.name + entry.signature[element].СтрокаПараметров});
            // description.push("Параметры");
            for (let param in entry.signature[element].Параметры) {
                description.push(param + ": " + entry.signature[element].Параметры[param]);
            }
        }
        return new vscode.Hover(description);
    }
}