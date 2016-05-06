import * as vscode from "vscode";

export function postMessage(description: string, interval?: number) {
    if (interval) {
        vscode.window.setStatusBarMessage(description, interval);   
    } else {
        vscode.window.setStatusBarMessage(description);
    }

}

export function getConfiguration(section:string) {
    return vscode.workspace.getConfiguration(section);
}

export function getConfigurationKey(configuration:vscode.WorkspaceConfiguration, key: string) {
    return configuration.get(key);
}

export function getRootPath() {
    return vscode.workspace.rootPath;
}
