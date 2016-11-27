import * as path from "path";
import * as vscode from "vscode";

export function mAsync(fn) {
    return async (done) => {
        try {
            await fn();
            done();
        } catch (err) {
            done(err);
        }
    };
};

export const fixturePath = path.join(__dirname, "..", "..", "test", "fixtures");

export async function newTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    const textDocument = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(textDocument);
    return textDocument;
}

export async function addText(text: string) {
    await vscode.window.activeTextEditor.edit((textEditorEdit) => {
        textEditorEdit.insert(vscode.window.activeTextEditor.selection.anchor, text);
    });
}