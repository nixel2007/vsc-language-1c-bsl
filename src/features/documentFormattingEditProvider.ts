import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class DocumentFormattingEditProvider extends AbstractProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {

    private indentWord = {
        "(": true,
        "процедура": true,
        "procedure": true,
        "функция": true,
        "function": true,
        "если": true,
        "if": true,
        "пока": true,
        "while": true,
        "для": true,
        "for": true,
        "попытка": true,
        "try": true
    };
    private reindentWord = {
        ")": true,
        "конецпроцедуры": true,
        "endprocedure": true,
        "конецфункции": true,
        "endfunction": true,
        "конецесли": true,
        "endif": true,
        "конеццикла": true,
        "enddo": true,
        "конецпопытки": true,
        "endtry": true
    };
    private unindentWord = {
        "иначе": true,
        "else": true,
        "иначеесли": true,
        "elseif": true,
        "исключение": true,
        "except": true
    };

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        return this.format(document, undefined, options, token);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        return this.format(document, range, options, token);
    }

    public provideOnTypeFormattingEdits(document: vscode.TextDocument, position: vscode.Position, ch: string, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const lineNumber = (ch === "\n") ? (position.line - 1) : position.line;
        const firstWord = document.lineAt(lineNumber).text.toLowerCase().trim().split(/[^\wа-яё\(\)]/)[0];
        if (this.reindentWord[firstWord] || this.unindentWord[firstWord]) {
            return this.format(document, new vscode.Range(new vscode.Position(lineNumber - 1, 0), position), options, token);
        }
    }

    private format(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const documentText = document.getText();
        let initialIndentLevel: number;
        let value: string;
        let rangeOffset: number;
        if (range) {
            const startPosition = new vscode.Position(range.start.line, 0);
            rangeOffset = document.offsetAt(startPosition);

            let endOffset = document.offsetAt(new vscode.Position(range.end.line + 1, 0));
            const endLineStart = document.offsetAt(new vscode.Position(range.end.line, 0));
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

        const eol = this.getEOL(document);

        let indentLevel = initialIndentLevel;
        let indentValue: string;
        if (options.insertSpaces) {
            indentValue = this.repeat(" ", options.tabSize).toString();
        } else {
            indentValue = "\t";
        }

        const editOperations: vscode.TextEdit[] = [];
        function addEdit(text: string, lineNumber: number) {
            const oldIndent = /^\s*/.exec(text)[0];
            if (oldIndent !== indentValue.repeat(indentLevel)) {
                editOperations.push(vscode.TextEdit.replace(new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, oldIndent.length)), indentValue.repeat(indentLevel)));
            }
        }

        const arrayValue = value.split(new RegExp(eol));
        for (const key in arrayValue) {
            const element = arrayValue[key];
            const firstWord = element.toLowerCase().trim().split(/[^\wа-яё\(\)]/)[0];
            if (this.indentWord[firstWord]) {
                addEdit(element, +key + range.start.line);
                indentLevel++;
            } else if (this.reindentWord[firstWord]) {
                if (indentLevel !== 0) {
                    indentLevel--;
                }
                addEdit(element, +key + range.start.line);
            } else if (this.unindentWord[firstWord]) {
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

    private repeat(s: string, count: number): string {
        let result = "";
        for (let i = 0; i < count; i++) {
            result += s;
        }
        return result;
    }

    private computeIndentLevel(content: string, offset: number, options: vscode.FormattingOptions): number {
        let i = 0;
        let nChars = 0;
        const tabSize = options.tabSize || 4;
        while (i < content.length) {
            const ch = content.charAt(i);
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
        const text = document.getText();
        if (document.lineCount > 1) {
            const to = document.offsetAt(new vscode.Position(1, 0));
            let from = to;
            while (from > 0 && this.isEOL(text, from - 1)) {
                from--;
            }
            return text.substr(from, to - from);
        }
        return "\n";
    }

    private isEOL(text: string, offset: number): boolean {
        return "\r\n".indexOf(text.charAt(offset)) !== -1;
    }
}
