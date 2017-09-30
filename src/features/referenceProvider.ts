import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalReferenceProvider extends AbstractProvider implements vscode.ReferenceProvider {
    public provideReferences(document: vscode.TextDocument,
                             position: vscode.Position,
                             options: { includeDeclaration: boolean; },
                             token: vscode.CancellationToken): Thenable<vscode.Location[]> {
        return this.doFindReferences(document, position, options, token);
    }

    private addReference(searchResult: any, results: vscode.Location[]): any {
        if (searchResult) {
            for (const element of searchResult) {
                const result = {
                    path: element.filename,
                    line: element.line,
                    description: element.name,
                    label: element.filename
                };
                const colStr = element.character;
                const referenceResource = vscode.Uri.file(result.path);
                const range = new vscode.Range(
                    result.line, +colStr, result.line, +colStr + element.call.length
                );
                results.push(new vscode.Location(referenceResource, range));

            }
        }
    }

    private doFindReferences(document: vscode.TextDocument,
                             position: vscode.Position,
                             options: { includeDeclaration: boolean },
                             token: vscode.CancellationToken): Thenable<vscode.Location[]> {
        return new Promise((resolve, reject) => {
            const filename = document.fileName;
            const workspaceRoot = vscode.workspace.rootPath;
            // get current word
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return resolve([]);
            }
            let textAtPosition = document.getText(wordRange);
            const results: vscode.Location[] = Array<vscode.Location>();

            const source = document.getText();

            if (document.isDirty) {
                this._global.customUpdateCache(source, filename);
            }
            const localRefs = this._global.cache.getCollection(filename);
            let d = this._global.queryref(textAtPosition, localRefs, true);
            let res = this.addReference(d, results);
            if (results.length > 0) {
                // resolve(results);
            }
            if (workspaceRoot) {
                const fullmodule = this._global.getModuleForPath(filename.replace(/\\/g, "/"),
                    vscode.workspace.rootPath);
                let localsearch = false;
                let enTextAtPosition;
                if (fullmodule.length !== 0) {
                    const arrName = filename.substr(vscode.workspace.rootPath.length).split("\\");
                    if (this._global.toreplaced[arrName[arrName.length - 4]]) {
                        enTextAtPosition = arrName[arrName.length - 4] + "."
                            + arrName[arrName.length - 3] + "." + textAtPosition;
                    }
                    textAtPosition = fullmodule + "." + textAtPosition;
                    localsearch = true;
                }
                d = this._global.dbcalls.get(textAtPosition);
                if (enTextAtPosition) {
                    const enD = this._global.dbcalls.get(enTextAtPosition);
                    if (enD && !d) {
                        d = enD;
                    } else if (enD && d) {
                        d = d.concat(enD);
                    }
                }
                res = this.addReference(d, results);
            }
            return resolve(results);
        });
    }
}
