'use strict';

import { workspace, Uri, WorkspaceSymbolProvider, SymbolInformation, SymbolKind, Range, CancellationToken } from 'vscode';

import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
import {BSL_MODE} from "../const";
//import * as global from "../global";

export default class GlobalworkspaseSymbolProvider extends AbstractProvider implements WorkspaceSymbolProvider {
    public provideWorkspaceSymbols(search: string, token :CancellationToken): Promise<SymbolInformation[]> {
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
        let added = {}
        let d: Array<any> = this._global.query(file, search, "", true, true);
        let bucket = new Array<SymbolInformation>();
        for (let index = 0; index < d.length; index++) {
            let element = d[index];
            if (added[element.name] === true) {
                continue;
            }
            added[element.name] = true;
            let range = new Range(element.line - 1, element.character - 1, element.endLine - 1, element.character - 1);
            let result = new SymbolInformation(element.name, SymbolKind.Function,
                range, this._global.asUrl(element.filename));
            bucket.push(result);
        }
        return Promise.resolve(bucket);
    }
}