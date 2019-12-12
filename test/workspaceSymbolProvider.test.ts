import * as path from "path";
import "should";
import * as vscode from "vscode";

import { clearActiveTextEditor, fixturePath, newTextDocument } from "./helpers";

import { waitForBSLLSActivation } from "../src/extension";

describe("Workspace symbols", function() {

    this.timeout(10000);

    before(async () => {
        const uriEmptyFile = vscode.Uri.file(
            path.join(fixturePath, "emptyFile.bsl")
        );
        await newTextDocument(uriEmptyFile);
        const extension = vscode.extensions.getExtension("1c-syntax.language-1c-bsl");
        await extension.activate();

        await waitForBSLLSActivation();
    });

    beforeEach(async () => {
        await clearActiveTextEditor();
    });

    it("should show functions in workspace", async () => {

        const symbolInformation = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeWorkspaceSymbolProvider",
            "Проц"
        );

        symbolInformation.should.matchAny((value: vscode.SymbolInformation) => {
            value.should.has.a.key("name").which.is.equal("ЭкспортнаяПроцедура");
            value.should.has.a.key("kind").which.is.equal(vscode.SymbolKind.Function);
            value.location.uri.path.should.endWith("CommonModules/CommonModule/Ext/Module.bsl");
        });

    });

});
