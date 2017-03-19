import * as path from "path";
import "should";
import * as vscode from "vscode";

import { fixturePath, newTextDocument } from "./helpers";

import LintProvider from "../src/features/lintProvider";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);
const linter = new LintProvider();

let uriFile;
let textDocument: vscode.TextDocument;

describe("Linter", () => {

    before(async () => {
        uriFile = vscode.Uri.file(
            path.join(fixturePath, "error.os")
        );
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();
    });

    it("should show errors on oscript-files", async () => {

        linter.doBsllint(textDocument);
        const diagnosticData: vscode.Diagnostic[] = await linter.getDiagnosticData(uriFile);

        diagnosticData.should.matchAny((value: vscode.Diagnostic) => {
            value.message.should.be.equal("Неизвестный символ: Б");
            const range = value.range;
            range.end.line.should.be.is.equal(1);
            range.end.character.should.be.equal(6);
            range.start.line.should.be.is.equal(1);
            range.start.character.should.be.which.is.equal(0);
        });

    });

});
