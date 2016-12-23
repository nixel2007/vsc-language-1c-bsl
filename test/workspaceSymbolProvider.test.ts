import * as path from "path";
import "should";
import * as vscode from "vscode";

import { fixturePath, mAsync, newTextDocument } from "./helpers";

import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = new Global(vscAdapter);

let textDocument: vscode.TextDocument;

describe("Document symbols", () => {

    before(mAsync(async (done) => {
        const uriEmptyFile = vscode.Uri.file(
            path.join(fixturePath, "emptyFile.bsl")
        );
        textDocument = await newTextDocument(uriEmptyFile);
        await globals.waitForCacheUpdate();
    }));

    it("should show functions in workspace", mAsync(async (done) => {

        const symbolInformation = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeWorkspaceSymbolProvider",
            "Проц"
        );

        symbolInformation.should.matchAny((value: vscode.SymbolInformation) => {
            value.should.has.a.key("name").which.is.equal("ЭкспортнаяПроцедура");
            value.should.has.a.key("kind").which.is.equal(vscode.SymbolKind.Function);
            value.location.uri.path.should.endWith("CommonModules/CommonModule/Ext/Module.bsl");
        });

    }));

});
