import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, clearActiveTextEditor, fixturePath, mAsync, newTextDocument } from "./helpers";

import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);

let textDocument: vscode.TextDocument;

describe("Hover", () => {

    before(mAsync(async (done) => {
        const uriFile = vscode.Uri.file(
            path.join(fixturePath, "CommonModules", "CommonModule", "Ext", "Module.bsl")
        );
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();
    }));

    beforeEach( () => {
        globals.hoverTrue = true; // TODO: разобраться, зачем это было нужно
    });

    it("should be showed on local methods", mAsync(async (done) => {

        const position = new vscode.Position(1, 15); // НеЭкспортнаяПроцедура

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );

        hovers.should.has.length(1);

        let hover = hovers[0];
        hover.contents[0].should.be.equal("Метод текущего модуля");
        hover.contents[2].should.has.a.key("value").which.is.equal("Процедура НеЭкспортнаяПроцедура()");

    }));

    it("should be showed on non-local methods", mAsync(async (done) => {

        const position = new vscode.Position(5, 30); // Документы.Document.ПроцедураМодуляМенеджера();

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );

        hovers.should.has.length(1);

        let hover = hovers[0];
        hover.contents[0].should.startWith("Метод из").and.endWith("Document/Ext/ManagerModule.bsl");
        hover.contents[2].should.has.a.key("value").which.is.equal("Процедура ПроцедураМодуляМенеджера()");

    }));

    it("should be showed on global functions", mAsync(async (done) => {

        const position = new vscode.Position(6, 5); // Сообщить();

        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            "vscode.executeHoverProvider",
            textDocument.uri,
            position
        );

        hovers.should.has.length(1);

        let hover = hovers[0];
        hover.contents[0].should.startWith("Метод глобального контекста");
        hover.contents[2].should.has.a.key("value").which.startWith("Процедура Сообщить(");
        hover.contents[3].should.startWith("***ТекстСообщения***");

    }));

    it.skip("should be showed on functions of oscript libraries", mAsync(async (done) => {

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

        let hover = hovers[0];
        // hover.contents[0].should.startWith("Метод глобального контекста");
        // hover.contents[2].should.has.a.key("value").which.startWith("Функция РазложитьСтрокуВМассивПодстрок(");
        // hover.contents[3].should.startWith("***ТекстСообщения***");

    }));
});
