import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export default class TaskProvider {

    public onConfigurationChanged() {
        type AutoDetect = "on" | "off";
        let taskProvider: vscode.Disposable | undefined;
        const autoDetect = vscode.workspace.getConfiguration("language-1c-bsl").get<AutoDetect>("autoDetect");
        if (!vscode.workspace.workspaceFolders) {
            return;
        }
        if (taskProvider && autoDetect === "off") {
            taskProvider.dispose();
            taskProvider = undefined;
        } else if (!taskProvider && autoDetect === "on") {
            taskProvider = vscode.workspace.registerTaskProvider("bsl", {
                provideTasks: () => {
                    return this.provideBslScripts();
                },
                resolveTask(taskD: vscode.Task): vscode.Task | undefined {
                    return undefined;
                }
            });
        }
    }

    private provideBslScripts(): vscode.Task[] {
        const emptyTasks: vscode.Task[] = [];
        const allTasks: vscode.Task[] = [];
        const workspaceRoot = vscode.workspace.rootPath;

        if (!workspaceRoot) {
            return emptyTasks;
        }

        allTasks.push(...this.fillDefaultTasks(workspaceRoot));

        const tasks = this.provideBslScriptsForFolder(workspaceRoot);
        allTasks.push(...tasks);
        return allTasks;
    }

    private fillDefaultTasks(workspaceRoot) {
        const result: vscode.Task[] = [];
        // tslint:disable-next-line:no-invalid-template-strings
        result.push(this.createTask("OneScript: compile", workspaceRoot, "oscript", ["-compile", "${file}"], []));
        // tslint:disable-next-line:no-invalid-template-strings
        result.push(this.createTask("OneScript: check", workspaceRoot, "oscript", ["-check", "${file}"], []));
        result.push(this.createTask("OneScript: make", workspaceRoot,
        // tslint:disable-next-line:no-invalid-template-strings
        "oscript", ["-make", "${file}", "${fileBasename}.exe"], []));
        result.push(this.createTask("OneScript: run", workspaceRoot,
        // tslint:disable-next-line:no-invalid-template-strings
            "oscript", ["${file}"], ["$OneScript Linter"], true));
        return result;
    }

    private createTask(taskName: string, workspaceRoot, command, args?: string[],
                       problemMatcher?: string[], isBuildCommand?: boolean): vscode.Task {

        const kind: vscode.TaskDefinition = {
            taskName,
            type: "process",
            problemMatcher
        };

        if (command === "cmd") {
            const isWin = /^win/.test(process.platform);
            command = (isWin) ? "cmd" : "sh";
            const argsWin = args.slice();
            const argsLin = args.slice();
            args.unshift((isWin) ? "/c" : "-c");
            argsWin.unshift("/c");
            argsLin.unshift("-c");
            kind.windows = {
                command: "cmd",
                args: argsWin
            };
            kind.linux = {
                command: "sh",
                args: argsLin
            };
        } else {
            kind.command = command;
            kind.args = args;
        }

        if (isBuildCommand) {
            kind.group = "build";
        }

        return new vscode.Task(kind, taskName, command,
        new vscode.ProcessExecution(command, args, { cwd: workspaceRoot }), problemMatcher);

    }

    private provideBslScriptsForFolder(workspaceRoot: string): vscode.Task[] {
        const emptyTasks: vscode.Task[] = [];
        const tasksFolder = path.join(workspaceRoot, "tasks");

        if (!this.exists(tasksFolder)) {
            return emptyTasks;
        }

        try {

            const result: vscode.Task[] = [];
            const taskFiles = fs.readdirSync(tasksFolder);
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < taskFiles.length; i++) {
                const filename = path.join(tasksFolder, taskFiles[i]);
                const stat = fs.lstatSync(filename);
                if (stat.isDirectory()) {
                   continue;
                }
                const taskName = taskFiles[i];
                result.push(this.createTask("opm task: " + taskName,
                workspaceRoot, "cmd", ["opm", "run", taskName.replace(".os", "")], ["$OneScript Linter"]));
            }
            return result;
        } catch (e) {
            return emptyTasks;
        }
    }

    private exists(file: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.exists(file, (value) => {
                resolve(value);
            });
        });
    }
}
