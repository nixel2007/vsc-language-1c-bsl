import * as path from "path";
import "should";
import * as vscode from "vscode";

import { addText, clearActiveTextEditor, fixturePath, newTextDocument } from "./helpers";

import BslQuickOpen from "../src/features/bslQuickOpen";
import { Global } from "../src/global";
import * as vscAdapter from "../src/vscAdapter";

const globals = Global.create(vscAdapter);

let textDocument: vscode.TextDocument;

describe("MetadataParse", () => {

    beforeEach(async () => {
        await clearActiveTextEditor();
    });

    it("should be avaliable metadata data", async () => {
        const uriFile = vscode.Uri.file(
            path.join(fixturePath, "CommonModules", "CommonModule", "Ext", "Module.bsl")
        );
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();

        const position = vscode.window.activeTextEditor.selection.anchor;
        const quick = new BslQuickOpen(globals);
        globals.dbmodules.chain().data().should.have.length(3);

    });

    it("should be avaliable document metadata", async () => {
        const uriFile = vscode.Uri.file(
            path.join(fixturePath, "Documents", "Document", "Ext", "ManagerModule.bsl")
        );
        textDocument = await newTextDocument(uriFile);
        await globals.waitForCacheUpdate();
        const metadata = globals.dbmodules.chain().data();
        metadata.should.have.length(3);
        metadata[0].should.has.a.key("type").which.is.equal("CommonModule");
        // metadata[2].should.has.a.key("module").which.is.equal("Documents.Document");
    });

});
