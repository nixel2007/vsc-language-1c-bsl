import { block } from "alignment";
import * as vscode from "vscode";

export class CodeBeautyfier {
    public static beautify() {
        const editor = vscode.window.activeTextEditor;
        const selections = editor.selections;

        selections.forEach((selection) => {
            let endLine = selection.end.line;
            if (selection.end.character === 0) {
                endLine = selection.end.line - 1;
            }
            const maxLen = Math.max(editor.document.lineAt(endLine).text.length);
            const range = new vscode.Range(selection.start.line, 0, endLine, maxLen);
            const text = editor.document.getText(range);

            const newBlock = block(text, {
                leftSeparators: [","],
                rightSeparators: ["="],
                ignoreSeparators: [],
                spaceSeparators: ["="]
            });

            editor.edit((editBuilder) => {
                editBuilder.replace(range, newBlock[0]);
            });
        });

    }
}
