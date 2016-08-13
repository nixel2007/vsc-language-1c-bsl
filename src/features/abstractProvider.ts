import {Global} from "../global";
import {Disposable} from "vscode";

export default class AbstractProvider {

    protected _global: Global;
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
