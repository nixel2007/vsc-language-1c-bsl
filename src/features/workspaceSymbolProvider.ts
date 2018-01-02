"use strict";

import * as vscode from "vscode";

import {BSL_MODE} from "../const";
import AbstractProvider from "./abstractProvider";

export default class GlobalworkspaseSymbolProvider extends AbstractProvider implements vscode.WorkspaceSymbolProvider {
    public provideWorkspaceSymbols(search: string): Promise<vscode.SymbolInformation[]> {
        const document = vscode.window.activeTextEditor.document;
        if (vscode.window.activeTextEditor && vscode.languages.match(BSL_MODE, document) && document.isDirty) {
            this._global.customUpdateCache(document.getText(), document.fileName);
        }
        const d: any[] = this._global.query(search, "", true, true);
        const bucket = new Array<vscode.SymbolInformation>();
        const arrayLength = Math.min(d.length, 1000);
        for (let index = 0; index < arrayLength; index++) {
            const element = d[index];
            const range = new vscode.Range(new vscode.Position(element.line, 0), new vscode.Position(element.line, 0));
            const result = new vscode.SymbolInformation(element.name, vscode.SymbolKind.Function,
                                                      range, vscode.Uri.file(element.filename));
            bucket.push(result);
        }
        return Promise.resolve(bucket);
    }
}
