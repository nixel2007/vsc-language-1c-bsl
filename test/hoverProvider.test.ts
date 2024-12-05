import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, clearActiveTextEditor, fixturePath, newTextDocument } from "./helpers";

import { waitForBSLLSActivation } from "../src/extension";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);

let textDocument: vscode.TextDocument;

describe("Hover", () => {

    before(async () => {
        const uriFile = vscode.Uri.file(
            path.join(fixturePath, "CommonModules", "CommonModule", "Ext", "Module.bsl")
        );
        textDocument = await newTextDocument(uriFile);
        globals.languageServerEnabled = false;
        const extension = vscode.extensions.getExtension("1c-syntax.language-1c-bsl");
        await extension.activate();

        await waitForBSLLSActivation();
    });

    beforeEach(() => {
        globals.hoverTrue = true; // TODO: разобраться, зачем это было нужно
    });

    after(async () => {
        globals.languageServerEnabled = true;
    });

    it("should be showed on local methods", async () => {
        const position = new vscode.Position(4, 15); // НеЭкспортнаяПроцедура

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );
        hovers.should.has.length(1);

        const hover = hovers[0];
        hover.contents[0].should.has.a.property("value").which.is.equal("Метод текущего модуля");
        hover.contents[2].should.has.a.property("value").which.is.equal("```bsl\nПроцедура НеЭкспортнаяПроцедура()\n```\n");

    });

    it("should be showed on non-local methods", async () => {

        const position = new vscode.Position(5, 30); // Документы.Document.ПроцедураМодуляМенеджера();

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );

        hovers.should.has.length(1);

        const hover = hovers[0];
        hover.contents[0].should.has.a.property("value").which.startWith("Метод из")
            .and.endWith("Document/Ext/ManagerModule.bsl");
        hover.contents[2].should.has.a.property("value").which.is
            .equal("```bsl\nПроцедура ПроцедураМодуляМенеджера()\n```\n");

    });

    it("should be showed on global functions", async () => {

        const position = new vscode.Position(6, 5); // Сообщить();

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );

        hovers.should.has.length(1);

        const hover = hovers[0];
        hover.contents[0].should.has.a.property("value").which.startWith("Метод глобального контекста");
        hover.contents[2].should.has.a.property("value").which.startWith("```bsl\nПроцедура Сообщить(");
        hover.contents[3].should.has.a.property("value").which.startWith("***ТекстСообщения***");

    });

    it("should be showed on functions of oscript libraries", async () => {

        const uriEmptyFile = vscode.Uri.file(path.join(fixturePath, "emptyFile.bsl"));
        textDocument = await newTextDocument(uriEmptyFile);
        await clearActiveTextEditor();

        await addText("#Использовать strings\n");
        await addText("\n");
        await addText("СтроковыеФункции.РазложитьСтрокуВМассивПодстрок(\"\", \"\")");

        const position = new vscode.Position(2, 40);

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );

        hovers.should.has.length(1);

        // const hover = hovers[0];
        // hover.contents[0].should.startWith("Метод глобального контекста");
        // hover.contents[2].should.has.a.key("value").which.startWith("Функция РазложитьСтрокуВМассивПодстрок(");
        // hover.contents[3].should.startWith("***ТекстСообщения***");

    });
});
