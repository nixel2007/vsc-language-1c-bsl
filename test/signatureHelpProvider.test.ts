import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, fixturePath, newTextDocument } from "./helpers";

import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);

let textDocument: vscode.TextDocument;

describe("Signature", () => {

    before(async () => {
        const uriFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();
    });

    it.skip("should be showed on methods of oscript library", async () => {

        await addText("#Использовать strings\n");
        await addText("\n");
        await addText("СтроковыеФункции.РазложитьСтрокуВМассивПодстрок");
        const position = vscode.window.activeTextEditor.selection.anchor;

        const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
            "vscode.executeSignatureHelpProvider",
            textDocument.uri,
            position,
            "("
        );

        signatureHelp.should.not.be.undefined();

    });

});
