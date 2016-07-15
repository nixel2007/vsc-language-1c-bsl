import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

let trimStart = require("lodash.trimStart");

export default class DocumentFormattingEditProvider extends AbstractProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        return this.format(document, null, options, token);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        return this.format(document, range, options, token);
    }


    private format(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const documentText = document.getText();
        let initialIndentLevel: number;
        let value: string;
        let rangeOffset: number;
        if (range) {
            let startPosition = new vscode.Position(range.start.line, 0);
            rangeOffset = document.offsetAt(startPosition);

            let endOffset = document.offsetAt(new vscode.Position(range.end.line + 1, 0));
            let endLineStart = document.offsetAt(new vscode.Position(range.end.line, 0));
            while (endOffset > endLineStart && this.isEOL(documentText, endOffset - 1)) {
                endOffset--;
            }
            range = new vscode.Range(startPosition, document.positionAt(endOffset));
            value = documentText.substring(rangeOffset, endOffset);
            initialIndentLevel = this.computeIndentLevel(value, 0, options);
        } else {
            value = documentText;
            range = new vscode.Range(new vscode.Position(0, 0), document.positionAt(value.length));
            initialIndentLevel = 0;
            rangeOffset = 0;
        }

        let eol = this.getEOL(document);

        let lineBreak = false;
        let indentLevel = initialIndentLevel;
        let indentValue: String;
        if (options.insertSpaces) {
            indentValue = this.repeat(" ", options.tabSize);
        } else {
            indentValue = "\t";
        }

        let editOperations: vscode.TextEdit[] = [];
        function addEdit(text: string, lineNumber: number) {
            let replaceRange = new vscode.Range(document.lineAt(lineNumber).range.start, document.lineAt(lineNumber).range.end);
            if (text !== "" && text !== indentValue.repeat(indentLevel) + trimStart(text)) {
                editOperations.push(new vscode.TextEdit(replaceRange, indentValue.repeat(indentLevel) + text.trim()));
            }
        }

        let arrayValue = value.split(new RegExp(eol));
        for (let key in arrayValue) {
            let element = arrayValue[key];
            if (this.checkOperand(element, "Процедура")
                || this.checkOperand(element, "Procedure")
                || this.checkOperand(element, "Функция")
                || this.checkOperand(element, "Function")
                || this.checkOperand(element, "Если")
                || this.checkOperand(element, "If")
                || this.checkOperand(element, "Пока")
                || this.checkOperand(element, "While")
                || this.checkOperand(element, "Для")
                || this.checkOperand(element, "For")
                || this.checkOperand(element, "Попытка")
                || this.checkOperand(element, "Try")) {
                addEdit(element, +key + range.start.line);
                indentLevel++;
            } else if (this.checkOperand(element, "КонецПроцедуры")
                || this.checkOperand(element, "EndProcedure")
                || this.checkOperand(element, "КонецФункции")
                || this.checkOperand(element, "EndFunction")
                || this.checkOperand(element, "КонецЕсли")
                || this.checkOperand(element, "EndIf")
                || this.checkOperand(element, "КонецЦикла")
                || this.checkOperand(element, "EndDo")
                || this.checkOperand(element, "КонецПопытки")
                || this.checkOperand(element, "EndTry")) {
                if (indentLevel !== 0) {
                    indentLevel--;
                }
                addEdit(element, +key + range.start.line);
            } else if (this.checkOperand(element, "Иначе")
                || this.checkOperand(element, "Else")
                || this.checkOperand(element, "ИначеЕсли")
                || this.checkOperand(element, "ElseIf")
                || this.checkOperand(element, "Исключение")
                || this.checkOperand(element, "Except")) {
                if (indentLevel !== 0) {
                    indentLevel--;
                }
                addEdit(element, +key + range.start.line);
                indentLevel++;
            } else {
                addEdit(element, +key + range.start.line);
            }
        }

        return editOperations;
    }

    private checkOperand(text: String, operand: String): Boolean {
        return text.toLowerCase().trim().split(/[^\wа-яё]/)[0] === operand.toLowerCase().trim();
    }

    private repeat(s: string, count: number): String {
        let result = "";
        for (let i = 0; i < count; i++) {
            result += s;
        }
        return result;
    }

    private computeIndentLevel(content: string, offset: number, options: vscode.FormattingOptions): number {
        let i = 0;
        let nChars = 0;
        let tabSize = options.tabSize || 4;
        while (i < content.length) {
            let ch = content.charAt(i);
            if (ch === " ") {
                nChars++;
            } else if (ch === "\t") {
                nChars += tabSize;
            } else {
                break;
            }
            i++;
        }
        return Math.floor(nChars / tabSize);
    }

    private getEOL(document: vscode.TextDocument): string {
        let text = document.getText();
        if (document.lineCount > 1) {
            let to = document.offsetAt(new vscode.Position(1, 0));
            let from = to;
            while (from > 0 && this.isEOL(text, from - 1)) {
                from--;
            }
            return text.substr(from, to - from);
        }

        return "\n";
    }

    private isEOL(text: string, offset: number): Boolean {
        return "\r\n".indexOf(text.charAt(offset)) !== -1;
    }
}

