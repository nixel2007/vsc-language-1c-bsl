import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, clearActiveTextEditor, fixturePath, newTextDocument } from "./helpers";

import { waitForBSLLSActivation } from "../src/extension";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

let textDocument: vscode.TextDocument;
const globals = Global.create(vscAdapter);

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
// tslint:disable-next-line:only-arrow-functions
describe("Completion", function() {
    this.timeout("5m");

    before(async () => {
        const uriEmptyFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriEmptyFile);
        const extension = vscode.extensions.getExtension("1c-syntax.language-1c-bsl");
        await extension.activate();

        await waitForBSLLSActivation();
        // Wait for the OneScript cache to fill. Otherwise, the tests might execute before it is done and fail.
        await globals.waitForCacheUpdate();
    });

    beforeEach(async () => {
        await clearActiveTextEditor();
    });

    // Defines a Mocha unit test
    it("should show global functions", async () => {
        await addText("Сообщит");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1, "wrong completions length");

        const messageFunction = completions[0];
        messageFunction.label.should.be.equal("Сообщить");
        messageFunction.kind.should.be.equal(vscode.CompletionItemKind.Function);
        messageFunction.insertText.should.be.equal("Сообщить(");
    });

    it("should show functions in document", async () => {
        await addText("Процедура МояПроцедура()\n\nКонецПроцедуры\n");
        await addText("Мояп");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("МояПроцедура");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);
    });

    it("should show public methods from configuration module", async () => {
        await addText("CommonModule.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ЭкспортнаяПроцедура");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Function);
        });
    });

    it("should show info about function with several signatures", async () => {
        await addText("ЗаписатьXML");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ЗаписатьXML");
        completion.detail.should.match(/.*\d вариантa синтаксиса.*/gm);
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);
    });

    it("should show global variables", async () => {
        await addText("БиблиотекаСт");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("БиблиотекаСтилей");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Variable);
    });

    it("should show global keywords", async () => {
        await addText("ВызватьИск");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ВызватьИсключение");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Keyword);
    });

    it("should show global enums after `=` sign", async () => {
        await addText("А = КодировкаТек");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("КодировкаТекста");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
        });
    });


    // TODO Unskip when https://github.com/1c-syntax/vsc-language-1c-bsl/issues/288 is done
    it.skip("should show global enums", async () => {
        await addText("КодировкаТ");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("КодировкаТекста");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
        });
    });

    it("should show global enums values", async () => {
        await addText("КодировкаТекста.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ANSI");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
            value.should.has.a.key("documentation").which.match(/ANSI/);
        });
    });

    it("should show part of global enums values", async () => {
        await addText("КодировкаТекста.An");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ANSI");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Enum);
            value.should.has.a.key("documentation").which.match(/ANSI/);
        });
    });

    it("should show global classes after `= New`", async () => {
        await addText("А = Новый ТаблицаЗ");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ТаблицаЗначений");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Class);
        });
    });

    it("should show methods in manager module", async () => {
        await addText("Документы.Document.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ПроцедураМодуляМенеджера");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Function);
        });
    });

    it("should find methods in manager module by part of the method name", async () => {
        await addText("Документы.Document.ПроцедураМодуляМен");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.have.length(1);

        const completion = completions[0];
        completion.label.should.be.equal("ПроцедураМодуляМенеджера");
        completion.kind.should.be.equal(vscode.CompletionItemKind.Function);
    });

    it("should show work with en-keywords", async () => {
        await addText("Documents.Document.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("ПроцедураМодуляМенеджера");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Function);
        });
    });

    it("should show metadata", async () => {
        await addText("Документы.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("Definition");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Class);
        });
    });

    it("should show metadata from part of classname", async () => {
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
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Module);
        });
    });

    it("should show completion of oscript modules", async () => {
        await addText("СтроковыеФ");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("СтроковыеФункции");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Module);
        });
    });

    it("should show completion of functions in oscript modules", async () => {
        await addText("СтроковыеФункции.");

        const completionList = await getCompletionListFromCurrentPosition();
        const completions = completionList.items;

        completions.should.matchAny((value: vscode.CompletionItem) => {
            value.should.has.a.key("label").which.is.equal("РазложитьСтрокуВМассивПодстрок");
            value.should.has.a.key("kind").which.is.equal(vscode.CompletionItemKind.Function);
            value.should.has.a.key("documentation").which.match(/Разбивает строку/);
        });
    });
});
