import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalDocumentSymbolProvider extends AbstractProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument): Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve) => {
            const bucket: vscode.SymbolInformation[] = new Array<vscode.SymbolInformation>();
            // 1. Получаем все автодополнения для текущего файла.
            const source = document.getText();
            try {
                const result: any[] = this._global.getCacheLocal("", source);
                result.forEach((value) => {
                    bucket.push(new vscode.SymbolInformation(value.name, vscode.SymbolKind.Function,
                                                             new vscode.Range(new vscode.Position(value.line, 0),
                                                             new vscode.Position(value.line, 0))
                    ));
                });
            } catch (e) {
                console.error(e);
            }
            return resolve(bucket);
        });
    }
}
