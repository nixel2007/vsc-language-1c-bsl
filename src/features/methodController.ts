import {window, Disposable, StatusBarAlignment, StatusBarItem} from "vscode";

export class MethodDetect {

    private _statusBarItem: StatusBarItem;
    private _currentLine: number;
    private _methodLabel: string;

    public updateMethodLabel() {
        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        // Only update status if an MD file
        if (doc.languageId === "bsl") {
            let activeMethod = this._getActiveMethod(editor);

            // Update the status bar
            if (activeMethod) {
                this._statusBarItem.text = `$(pencil) ${activeMethod}`;
                this._statusBarItem.show();
            } else {
                this._statusBarItem.hide();
            }
        } else {
            this._statusBarItem.hide();
        }
    }

    public _getActiveMethod(editor): string {
        const line = editor.selections[0].active.line;
        if (line === this._currentLine) {
            return this._methodLabel;
        }
        this._currentLine = line;
        const re = /^(Процедура|Функция|procedure|function)\s*([\wа-яё]+)/im;
        for (let indexLine = line; indexLine >= 0; --indexLine) {
            const matchMethod = re.exec(editor.document.lineAt(indexLine).text);
            if (!matchMethod) {
                continue;
            }
            this._methodLabel = matchMethod[2];
            return matchMethod[2];
        }
        return;
    }

    public dispose() {
        this._statusBarItem.dispose();
    }

}

export class MethodController {

    private _methodDetect: MethodDetect;
    private _disposable: Disposable;

    constructor(methodDetect: MethodDetect) {
        this._methodDetect = methodDetect;
        this._methodDetect.updateMethodLabel();

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    private _onEvent() {
        this._methodDetect.updateMethodLabel();
    }

    public dispose() {
        this._disposable.dispose();
    }
}
