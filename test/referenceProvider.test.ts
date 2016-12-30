import * as path from "path";
import "should";
import * as vscode from "vscode";

import { fixturePath, mAsync, newTextDocument } from "./helpers";

import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);;

let textDocument: vscode.TextDocument;

describe("References", () => {

    before(mAsync(async (done) => {
        const uriFile = vscode.Uri.file(
            path.join(fixturePath, "CommonModules", "CommonModule", "Ext", "Module.bsl")
        );
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();
    }));

    it("should be showed on export methods", mAsync(async (done) => {

        const position = new vscode.Position(0, 15); // ЭкспортнаяПроцедура

        const locations = await vscode.commands.executeCommand<vscode.Location[]>(
            "vscode.executeReferenceProvider",
            textDocument.uri,
            position
        );

        locations.should.matchAny((value: vscode.Location) => {
            value.range.should.be.deepEqual(new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 33)));
            value.uri.path.should.endWith("Documents/Definition/Ext/ManagerModule.bsl");
        });

        locations.should.matchAny((value: vscode.Location) => {
            value.range.should.be.deepEqual(new vscode.Range(new vscode.Position(5, 1), new vscode.Position(5, 33)));
            value.uri.path.should.endWith("Documents/Document/Ext/ManagerModule.bsl");
        });
    }));

    it("should be showed on local methods", mAsync(async (done) => {

        const position = new vscode.Position(1, 15); // НеЭкспортнаяПроцедура

        const locations = await vscode.commands.executeCommand<vscode.Location[]>(
            "vscode.executeReferenceProvider",
            textDocument.uri,
            position
        );

        locations.should.matchAny((value: vscode.Location) => {
            value.range.should.be.deepEqual(new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 22)));
            value.uri.path.should.endWith("CommonModules/CommonModule/Ext/Module.bsl");
        });

    }));

});
