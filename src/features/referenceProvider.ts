import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalReferenceProvider extends AbstractProvider implements vscode.ReferenceProvider {
    public provideReferences(document: vscode.TextDocument,
                             position: vscode.Position): Thenable<vscode.Location[]> {
        return this.doFindReferences(document, position);
    }

    private addReference(searchResult: any, results: vscode.Location[]) {
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
                             position: vscode.Position): Thenable<vscode.Location[]> {
        return new Promise((resolve) => {
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
            this.addReference(d, results);
            if (results.length > 0) {
                // resolve(results);
            }
            if (workspaceRoot) {
                const fullmodule = this._global.getModuleForPath(filename.replace(/\\/g, "/"),
                    vscode.workspace.rootPath);
                let enTextAtPosition;
                if (fullmodule.length !== 0) {
                    const arrName = filename.substr(vscode.workspace.rootPath.length).split("\\");
                    if (this._global.toreplaced[arrName[arrName.length - 4]]) {
                        enTextAtPosition = arrName[arrName.length - 4] + "."
                            + arrName[arrName.length - 3] + "." + textAtPosition;
                    }
                    textAtPosition = fullmodule + "." + textAtPosition;
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
                this.addReference(d, results);
            }
            return resolve(results);
        });
    }
}
