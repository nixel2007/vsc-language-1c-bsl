import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, fixturePath, mAsync, newTextDocument } from "./helpers";

import CompletionItemProvider from "../src/features/completionItemProvider";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = new Global(vscAdapter);

let textDocument: vscode.TextDocument;

// Defines a Mocha test suite to group tests of similar kind together
describe("Completion", () => {

    before(mAsync(async (done) => {
        const uriEmptyFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriEmptyFile);
    }));

    beforeEach( mAsync(async (done) => {
        await addText("\n");
    }));

    // Defines a Mocha unit test
    it("should show global functions", mAsync(async (done) => {

        await addText("Сообщи");

        const position = vscode.window.activeTextEditor.selection.anchor;

        const completionList = await vscode.commands.executeCommand<vscode.CompletionList>(
            "vscode.executeCompletionItemProvider",
            textDocument.uri,
            position
        );
        const completions = completionList.items;

        completions.should.have.length(1, "wrong completions length");

        const messageFunction = completions[0];
        messageFunction.label.should.be.equal("Сообщить");
        messageFunction.kind.should.be.equal(vscode.SymbolKind.Namespace);
        messageFunction.insertText.should.be.equal("Сообщить(");

    }));

    it("should show functions in document", mAsync(async (done) => {

        await addText("Процедура МояПроцедура() КонецПроцедуры\n");
        await addText("Мояп");

        const position = vscode.window.activeTextEditor.selection.anchor;

        const completionList = await vscode.commands.executeCommand<vscode.CompletionList>(
            "vscode.executeCompletionItemProvider",
            textDocument.uri,
            position
        );
        const completions = completionList.items;

        completions.should.has.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("МояПроцедура");
        completion.kind.should.be.equal(vscode.SymbolKind.File);

    }));

});
