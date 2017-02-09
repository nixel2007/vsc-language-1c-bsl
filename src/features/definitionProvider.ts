import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class GlobalDefinitionProvider extends AbstractProvider implements vscode.DefinitionProvider {
    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Thenable<vscode.Location[]> {
        let word = document.getText(document.getWordRangeAtPosition(position)).split(/\r?\n/)[0];
        this._global.hoverTrue = false;
        return new Promise((resolve, reject) => {
            let result: vscode.Location[] = [];
            let added = {};
            let filename = document.fileName;
            let wordPosition = document.getWordRangeAtPosition(position);
            let wordAtPosition = document.getText(wordPosition);
            if (!wordPosition) {
                wordAtPosition = "";
            } else {
                wordAtPosition = this._global.fullNameRecursor(wordAtPosition, document, wordPosition, true);
                if (this._global.toreplaced[wordAtPosition.split(".")[0]]) {
                    let arrayName = wordAtPosition.split(".");
                    arrayName.splice(0, 1, this._global.toreplaced[arrayName[0]]);
                    wordAtPosition = arrayName.join(".");
                }
            }
            if (this._global.globalfunctions[wordAtPosition.toLowerCase()]) {
                return resolve(result);
            }
            let module = "";
            if (wordAtPosition.indexOf(".") > 0) {
                // if (path.extname(document.fileName) !== ".os") { // Для oscript не можем гаранитировать полное совпадение модулей.  
                let dotArray: Array<string> = wordAtPosition.split(".");
                wordAtPosition = dotArray.pop();
                module = dotArray.join(".");
                // }
            }
            let d: any[] = new Array();
            if (module.length === 0) {
                let source = document.getText();
                d = this._global.getCacheLocal(filename, wordAtPosition, source, false, false);
            } else {
                d = this._global.query(wordAtPosition, module, false, false);
                if (d.length > 1) {
                    for (let k = 0; k < d.length; k++) {
                        let arrayFilename = d[k].filename.split("/");
                        if (!d[k].oscriptLib && arrayFilename[arrayFilename.length - 4] === "CommonModules" || d[k].filename.endsWith("ManagerModule.bsl")) {
                            d = [d[k]];
                            break;
                        }
                    }
                }
            }
            if (d.length === 0) {
                d = this._global.query(word, "", false, false);
            }
            if (d) {
                let bucket = new Array<any>();
                for (let element of d) {
                    if (module.length !== 0 && element._method.IsExport === false) {
                        continue;
                    }
                    // if (added[element.name] === true) {
                    //     continue;
                    // }
                    added[element.name] = true;
                    let location =
                            new vscode.Location(
                                (element.filename) ? vscode.Uri.file(element.filename) : document.uri,
                                new vscode.Position(element.line, (element.isproc ? 9 : 7) + 1)
                            );
                    result.push(location);
                }
            }
            return resolve(result);
        });
    }
}
