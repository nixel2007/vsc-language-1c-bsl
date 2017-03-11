import * as path from "path";
import * as vscode from "vscode";

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

export async function clearActiveTextEditor() {
    await vscode.window.activeTextEditor.edit((editBuilder: vscode.TextEditorEdit) => {
        const range
            = new vscode.Range(new vscode.Position(0, 0), vscode.window.activeTextEditor.selection.anchor);
        editBuilder.delete(range);
    });
}
