import * as path from "path";
import "should";
import * as vscode from "vscode";

import { fixturePath, newTextDocument } from "./helpers";

import { oscriptLinter, waitForBSLLSActivation } from '../src/extension';

let uriFile;
let textDocument: vscode.TextDocument;

describe("Linter", () => {

    before(async () => {
        uriFile = vscode.Uri.file(
            path.join(fixturePath, "error.os")
        );
        textDocument = await newTextDocument(uriFile);
        const extension = vscode.extensions.getExtension("1c-syntax.language-1c-bsl");
        await extension.activate();

        await waitForBSLLSActivation();
    });

    it("should show errors on oscript-files", async () => {

        oscriptLinter.doBsllint(textDocument);
        const diagnosticData: vscode.Diagnostic[] = await oscriptLinter.getDiagnosticData(uriFile);

        diagnosticData.should.matchAny((value: vscode.Diagnostic) => {
            value.message.should.be.equal("Неизвестный символ: Б");
            const range = value.range;
            range.end.line.should.be.aboveOrEqual(1);
            range.start.line.should.be.aboveOrEqual(1);
        });

    });

});
