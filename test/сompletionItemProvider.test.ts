import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, fixturePath, mAsync, newTextDocument } from "./helpers";

import CompletionItemProvider from "../src/features/completionItemProvider";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = new Global(vscAdapter);

let textDocument: vscode.TextDocument;

async function getCompletionListFromCurrentPosition(): Promise<vscode.CompletionList> {
    const position = vscode.window.activeTextEditor.selection.anchor;

    const completionList = await vscode.commands.executeCommand<vscode.CompletionList>(
        "vscode.executeCompletionItemProvider",
        textDocument.uri,
        position
    );

    return completionList;
}

// Defines a Mocha test suite to group tests of similar kind together
describe("Completion", () => {

    before(mAsync(async (done) => {
        const uriEmptyFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriEmptyFile);
    }));

    beforeEach(mAsync(async (done) => {
        await vscode.window.activeTextEditor.edit((editBuilder: vscode.TextEditorEdit) => {
            const range = new vscode.Range(new vscode.Position(0, 0), vscode.window.activeTextEditor.selection.anchor);
            editBuilder.delete(range);
        });
    }));

    // Defines a Mocha unit test
    it("should show global functions", mAsync(async (done) => {

        await addText("Сообщи");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1, "wrong completions length");

        const messageFunction = completions[0];
        messageFunction.label.should.be.equal("Сообщить");
        messageFunction.kind.should.be.equal(vscode.CompletionItemKind.Function);
        messageFunction.insertText.should.be.equal("Сообщить(");

    }));

    it("should show functions in document", mAsync(async (done) => {

        await addText("Процедура МояПроцедура()\n\nКонецПроцедуры\n");
        await addText("Мояп");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("МояПроцедура");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);

    }));

    it("should show public methods from configuration module", mAsync(async (done) => {

        await addText("CommonModule.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ЭкспортнаяПроцедура");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);

    }));

    it("should show info about function with several signatures", mAsync(async (done) => {

        await addText("ЗаписатьXML");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ЗаписатьXML");
        completion.detail.should.match(/.*\d вариантa синтаксиса.*/gm);
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);

    }));

    it("should show global variables", mAsync(async (done) => {

        await addText("БиблиотекаКарт");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("БиблиотекаКартинок");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Variable);

    }));

    it("should show global keywords", mAsync(async (done) => {

        await addText("ВызватьИск");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ВызватьИсключение");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Keyword);

    }));

    it("should show global enums after `=` sign", mAsync(async (done) => {

        await addText("А = КодировкаТек");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("КодировкаТекста");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
        });

    }));

    it("should show global enums", mAsync(async (done) => {

        await addText("КодировкаТ");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("КодировкаТекста");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
        });

    }));

    it("should show global enums values", mAsync(async (done) => {

        await addText("КодировкаТекста.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ANSI");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
            value.should.has.a.key("documentation").which.match(/ANSI/);
        });

    }));

    it("should show global classes after `= New`", mAsync(async (done) => {

        await addText("А = Новый ТаблицаЗ");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ТаблицаЗначений");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Class);
        });

    }));

    it("should show methods in manager module", mAsync(async (done) => {

        await addText("Документы.Document.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ПроцедураМодуляМенеджера");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);

    }));

    it("should show work with en-keywords", mAsync(async (done) => {

        await addText("Documents.Document.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ПроцедураМодуляМенеджера");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);

    }));
    
    it("should show metadata", mAsync(async (done) => {

        await addText("Документы.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("Document");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Class);

    }));

    it("should show metadata from part of classname", mAsync(async (done) => {

        await addText("Докум");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.length.should.be.greaterThan(1);

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("Документы");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Variable);
        });

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("Документы.Document");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.File);
        });

    }));
});
