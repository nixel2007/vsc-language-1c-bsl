import * as path from "path";
import "should";
import * as vscode from "vscode";

import { fixturePath, newTextDocument } from "./helpers";

import { waitForBSLLSActivation } from "../src/extension";
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
        const extension = vscode.extensions.getExtension("1c-syntax.language-1c-bsl");
        await extension.activate();

        await waitForBSLLSActivation();
    });

    // TODO Unskip when https://github.com/1c-syntax/vsc-language-1c-bsl/issues/288 is done
    it.skip("should show functions from current document", async () => {

        const symbolInformation = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeDocumentSymbolProvider",
            textDocument.uri
        );

        symbolInformation.should.matchAny((value: vscode.SymbolInformation) => {
            value.should.has.a.key("name").which.is.equal("ЭкспортнаяПроцедура");
            value.should.has.a.key("kind").which.is.equal(vscode.SymbolKind.Method);
        });

    });

});
