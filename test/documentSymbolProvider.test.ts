import * as path from "path";
import "should";
import * as vscode from "vscode";

import { fixturePath, newTextDocument } from "./helpers";

import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);

let textDocument: vscode.TextDocument;

describe("Document symbols", () => {

    before(async () => {
        const uriEmptyFile = vscode.Uri.file(
            path.join(fixturePath, "CommonModules", "CommonModule", "Ext", "Module.bsl")
        );
        textDocument = await newTextDocument(uriEmptyFile);
        await globals.waitForCacheUpdate();
    });

    it("should show functions from current document", async () => {

        const symbolInformation = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeDocumentSymbolProvider",
            textDocument.uri
        );

        symbolInformation.should.matchAny((value: vscode.SymbolInformation) => {
            value.should.has.a.key("name").which.is.equal("ЭкспортнаяПроцедура");
            value.should.has.a.key("kind").which.is.equal(vscode.SymbolKind.Function);
        });

    });

});
