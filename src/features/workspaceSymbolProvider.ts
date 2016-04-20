"use strict";

import { workspace, Uri, WorkspaceSymbolProvider, SymbolInformation, SymbolKind, Range, CancellationToken } from "vscode";

import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
import {BSL_MODE} from "../const";
// import * as global from "../global";

export default class GlobalworkspaseSymbolProvider extends AbstractProvider implements WorkspaceSymbolProvider {
    public provideWorkspaceSymbols(search: string, token: CancellationToken): Promise<SymbolInformation[]> {
        let uri: Uri;
        let documents = workspace.textDocuments;
        for (let document of documents) {
            if (vscode.languages.match(BSL_MODE, document)) {
                uri = document.uri;
                break;
            }
        }

        if (!uri) {
            return Promise.resolve<SymbolInformation[]>([]);
        }

        let file =  this._global.asAbsolutePath(uri);
        if (!file) {
            return Promise.resolve<SymbolInformation[]>([]);
        }
        let d: Array<any> = this._global.query(search, "", true, true);
        let bucket = new Array<SymbolInformation>();
        for (let index = 0; index < d.length; index++) {
            let element = d[index];
            let range = new vscode.Range(new vscode.Position(element.line, 0), new vscode.Position(element.line, 0));
            let result = new SymbolInformation(element.name, SymbolKind.Function,
                range, this._global.asUrl(element.filename));
            bucket.push(result);
        }
        return Promise.resolve(bucket);
    }
}