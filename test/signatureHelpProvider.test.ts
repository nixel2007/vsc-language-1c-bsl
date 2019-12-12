import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, clearActiveTextEditor, fixturePath, newTextDocument } from "./helpers";

import { waitForBSLLSActivation } from "../src/extension";

let textDocument: vscode.TextDocument;

describe("Signature", () => {

    before(async () => {
        const uriFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriFile);
        const extension = vscode.extensions.getExtension("1c-syntax.language-1c-bsl");
        await extension.activate();

        await waitForBSLLSActivation();
    });

    beforeEach(async () => {
        await clearActiveTextEditor();
    });

    it("should be showed on methods of oscript library", async () => {

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

        signatureHelp.signatures.should.has.length(1);
        signatureHelp.signatures[0].parameters.length.should.be.aboveOrEqual(1);
        signatureHelp.signatures[0].parameters[0].label.should.not.be.equal("");

    });

    it("should be showed on export methods of modules", async () => {

        await addText("CommonModule.ЭкспортнаяПроцедураСПараметрами(");
        const position = vscode.window.activeTextEditor.selection.anchor;

        const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
            "vscode.executeSignatureHelpProvider",
            textDocument.uri,
            position,
            "("
        );

        signatureHelp.signatures.should.has.length(1);
        const signature = signatureHelp.signatures[0];
        signature.parameters.should.has.length(1);

    });

    it("should be showed on global functions", async () => {

        await addText("Сообщить(");
        const position = vscode.window.activeTextEditor.selection.anchor;

        const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
            "vscode.executeSignatureHelpProvider",
            textDocument.uri,
            position,
            "("
        );

        signatureHelp.signatures.should.has.length(1);
        const signature = signatureHelp.signatures[0];
        signature.parameters.should.has.length(2);

    });

});
