import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, fixturePath, mAsync, newTextDocument } from "./helpers";

import CompletionItemProvider from "../src/features/completionItemProvider";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = new Global(vscAdapter);

// Defines a Mocha test suite to group tests of similar kind together
describe("Completion", () => {

    // Defines a Mocha unit test
    it("should show completion with global functions", mAsync(async (done) => {

        const provider = new CompletionItemProvider(globals);

        const uri = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        const textDocument = await newTextDocument(uri);

        await addText("Сообщи");

        const position = vscode.window.activeTextEditor.selection.anchor;

        const completions = await provider.provideCompletionItems(textDocument, position, null);

        completions.should.have.length(1, "wrong completions length");

        const messageFunction = completions[0];
        messageFunction.label.should.be.equal("Сообщить");
        messageFunction.kind.should.be.equal(2);
        messageFunction.insertText.should.be.equal("Сообщить(");

    }));
});
