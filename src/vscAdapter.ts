import * as glob from "glob";
import * as vscode from "vscode";

export function postMessage(description: string, interval?: number) {
    if (interval) {
        vscode.window.setStatusBarMessage(description, interval);
    } else {
        vscode.window.setStatusBarMessage(description);
    }

}

export function getConfiguration(section: string): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section);
}

export function getConfigurationKey(configuration: vscode.WorkspaceConfiguration, key: string) {
    return configuration.get(key);
}

export function getRootPath() {
    return vscode.workspace.rootPath;
}

export function fullNameRecursor(word: string, document: vscode.TextDocument, range: vscode.Range, left: boolean) {
        let result: string;
        let plus: number = 1;
        let newRange: vscode.Range;
        if (left) {
            plus = -1;
            if (range.start.character === 0) {
                return word;
            }
            newRange = new vscode.Range(new vscode.Position(
                range.start.line, range.end.character - word.length + plus),
                new vscode.Position(range.start.line, range.start.character));
        } else {
            newRange = new vscode.Range(new vscode.Position(
                range.end.line, range.end.character),
                new vscode.Position(range.end.line, range.end.character + plus));
        }
        const dot = document.getText(newRange);
        if (dot.endsWith(".")) {
            let newPosition: vscode.Position;
            if (left) {
                const leftWordRange: vscode.Range = document.getWordRangeAtPosition(newRange.start);
                if (leftWordRange !== undefined) {
                    result = document.getText(leftWordRange) + "." + word;
                    newPosition = (leftWordRange !== undefined && leftWordRange.start.character > 1)
                        ? new vscode.Position(leftWordRange.start.line, leftWordRange.start.character - 1)
                        : new vscode.Position(leftWordRange.start.line, 0);
                }
            } else {
                result = word + "." + document.getText(document.getWordRangeAtPosition(newRange.start));
                newPosition = new vscode.Position(newRange.end.line, newRange.end.character + 2);
            }
            if (document.getText(new vscode.Range(new vscode.Position(
                newPosition.line, newPosition.character + 1), newPosition)) === ".") {
                const newWord = document.getWordRangeAtPosition(newPosition);
                return document.getText(newWord) + "." + result;
            }
            return result;
        } else {
            return word;
        }
    }

export function findFilesForCache(searchPattern: string, rootPath: string) {
    const globOptions: glob.IOptions = {};
    globOptions.dot = true;
    globOptions.cwd = rootPath;
    globOptions.nocase = true;
    // glob >=7.0.0 contains this property
    // tslint:disable-next-line:no-string-literal
    globOptions["absolute"] = true;
    glob(searchPattern, globOptions, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }
        this.addtocachefiles(files, rootPath);
    });
}
