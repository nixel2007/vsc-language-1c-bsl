import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, clearActiveTextEditor, fixturePath, mAsync, newTextDocument } from "./helpers";

import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);

let textDocument: vscode.TextDocument;

describe("Signature", () => {

    before(mAsync(async (done) => {
        const uriFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();
    }));

    beforeEach(mAsync(async (done) => {
        await clearActiveTextEditor();
    }));
    
    it("should be showed on methods of oscript library", mAsync(async (done) => {

        await addText("#Использовать strings\n");
        await addText("\n");
        await addText("СтроковыеФункции.РазложитьСтрокуВМассивПодстрок(");
        const position = vscode.window.activeTextEditor.selection.anchor;

        const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
            "vscode.executeSignatureHelpProvider",
            textDocument.uri,
            position,
            "("
        );

        signatureHelp.should.not.be.undefined();

    }));

});
