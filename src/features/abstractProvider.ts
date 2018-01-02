import {Disposable} from "vscode";
import {Global} from "../global";

export default class AbstractProvider {

    // tslint:disable-next-line:variable-name
    protected _global: Global;
    // tslint:disable-next-line:variable-name
    protected _disposables: Disposable[];

    constructor(global: Global) {
        this._global = global;
        this._disposables = [];
    }

    public dispose() {
        while (this._disposables.length) {
            this._disposables.pop().dispose();
        }
    }
}
