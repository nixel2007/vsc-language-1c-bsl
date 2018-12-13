import * as vscode from "vscode";

const _NL = "\n".charCodeAt(0);

export default class BackwardIterator {
    public lineNumber: number;
    private offset: number;
    private line: string;
    private model: vscode.TextDocument;

    constructor(model: vscode.TextDocument, offset: number, lineNumber: number) {
        this.lineNumber = lineNumber;
        this.offset = offset;
        this.line = model.lineAt(this.lineNumber).text;
        this.model = model;
    }

    public hasNext(): boolean {
        return this.lineNumber >= 0;
    }

    public next(): number {
        if (this.offset < 0) {
            if (this.lineNumber > 0) {
                this.lineNumber--;
                this.line = this.model.lineAt(this.lineNumber).text;
                this.offset = this.line.length - 1;
                return _NL;
            }
            this.lineNumber = -1;
            return 0;
        }
        const ch = this.line.charCodeAt(this.offset);
        this.offset--;
        return ch;
    }
}
