import { StatusBarAlignment, StatusBarItem, window } from "vscode";

export class MethodDetect {

    private currentLine: number;
    private methodLabel: string;
    private statusBarItem: StatusBarItem;

    public updateMethodLabel() {
        // Create as needed
        if (!this.statusBarItem) {
            this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        const editor = window.activeTextEditor;
        if (!editor) {
            this.statusBarItem.hide();
            return;
        }

        const doc = editor.document;

        if (doc.languageId === "bsl") {
            const activeMethod = this._getActiveMethod(editor);

            // Update the status bar
            if (activeMethod) {
                this.statusBarItem.text = `$(pencil) ${activeMethod}`;
                this.statusBarItem.show();
            } else {
                this.statusBarItem.hide();
            }
        } else {
            this.statusBarItem.hide();
        }
    }

    public _getActiveMethod(editor): string | undefined {
        const line = editor.selections[0].active.line;
        if (line === this.currentLine) {
            return this.methodLabel;
        }
        this.currentLine = line;
        const re = /^(Процедура|Функция|procedure|function)\s*([\wа-яё]+)/im;
        for (let indexLine = line; indexLine >= 0; --indexLine) {
            const matchMethod = re.exec(editor.document.lineAt(indexLine).text);
            if (!matchMethod) {
                continue;
            }
            this.methodLabel = matchMethod[2];
            return matchMethod[2];
        }
        return;
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

}
