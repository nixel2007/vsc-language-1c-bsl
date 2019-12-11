// Copied from https://github.com/fwcd/vscode-kotlin-ide and edited.
//
// Originaly licensed:
//
// The MIT License (MIT)
//
// Copyright (c) 2016 George Fraser
// Copyright (c) 2018 fwcd
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files(the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and / or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included
//  in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
import * as vscode from "vscode";

export interface IStatus {
    /** Updates the message. */
    update(msg: string): void;
}

/**
 * Encapsulates a status bar item.
 */
export class StatusBarEntry implements IStatus {
    private barItem: vscode.StatusBarItem;
    private prefix?: string;

    constructor(context: vscode.ExtensionContext, prefix?: string) {
        this.prefix = prefix;
        this.barItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        context.subscriptions.push(this.barItem);
    }

    public show(): void {
        this.barItem.show();
    }

    public update(msg: string): void {
        this.barItem.text = `${this.prefix} ${msg}`;
    }

    public dispose(): void {
        this.barItem.dispose();
    }
}
