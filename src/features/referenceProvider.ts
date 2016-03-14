import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalReferenceProvider extends AbstractProvider implements vscode.ReferenceProvider {
    public provideReferences(document: vscode.TextDocument, position: vscode.Position, options: { includeDeclaration: boolean; }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {
        return vscode.workspace.saveAll(false).then(() => {
            return this.doFindReferences(document, position, options, token);
        });
    }
    
    private addReference(searchResult: any, results: vscode.Location[], wordLength: any): any {
        if (searchResult) {
            let bucket = new Array<any>();
            for (let index = 0; index < searchResult.length; index++) {
                let element = searchResult[index];
                let result = {"path": element.filename,
                    "line": element.line,
                    "description": element.name,
                    "label": element.filename
                };
                let colStr = element.character;
                let referenceResource = vscode.Uri.file(result.path);
                let range = new vscode.Range(
                                result.line, +colStr, result.line , +colStr + wordLength - 1
                            );
                    results.push(new vscode.Location(referenceResource, range));

            }
        }
    }

    private doFindReferences(document: vscode.TextDocument, position: vscode.Position, options: {includeDeclaration: boolean}, token: vscode.CancellationToken): Thenable<vscode.Location[]> {
        let self = this;
        return new Promise((resolve, reject) => {
            let filename = document.fileName;
            let workspaceRoot = vscode.workspace.rootPath;
            // get current word
            let wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return resolve([]);
            }
            let textAtPosition = document.getText(wordRange);
            let wordLength = textAtPosition.length;
            let results: vscode.Location[] = Array<vscode.Location>();

            let source = document.getText();
            let lines = (source.indexOf("\r\n") === -1) ? source.split("\n") : source.split("\r\n");
            
            let localRefs = self._global.getRefsLocal(filename, source);
            let d = self._global.queryref(textAtPosition, localRefs, true);
            let res = this.addReference(d, results, wordLength);
            self._global.cache.removeCollection(filename);
            if (results.length > 0) {
                resolve(results);
            }

            d = self._global.queryref(textAtPosition, this._global.dbcalls);
            // Определим это экспортная процедура или нет, если экспортная, тогда ищем глобально. 
            // Если не экспортная, тогда ищем только в текущем модуле. 
            res = this.addReference(d, results, wordLength);
            resolve(results);
        });
    }
}