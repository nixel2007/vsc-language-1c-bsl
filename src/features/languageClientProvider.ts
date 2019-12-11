import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as Paths from "path";
import * as vscode from "vscode";
import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from "vscode-languageclient";
import * as which from "which";
import { correctBinname, isOSUnixoid } from "../util/osUtils";
import { ServerDownloader } from "../util/serverDownloader";
import { IStatus } from "../util/status";

export default class LanguageClientProvider {
    public async registerLanguageClient(context: vscode.ExtensionContext, status: IStatus) {
        const configuration = vscode.workspace.getConfiguration("language-1c-bsl");
        const languageServerEnabled = Boolean(configuration.get("languageServerEnabled"));

        if (!languageServerEnabled) {
            return;
        }

        status.update("Activating BSL Language Server...");

        const langServerInstallDir = Paths.join(
            context.globalStoragePath,
            "bsl-language-server-install"
        );

        const langServerDownloader = new ServerDownloader(
            "BSL Language Server",
            "1c-syntax",
            "bsl-language-server",
            "bsl-language-server_win.zip",
            langServerInstallDir
        );

        try {
            await langServerDownloader.downloadServerIfNeeded(status);
        } catch (error) {
            console.error(error);
            vscode.window.showWarningMessage(
                `Could not update/download BSL Language Server: ${error}`
            );
            return;
        }

        status.update("Initializing BSL Language Server...");

        let binaryName = Paths.resolve(
            langServerInstallDir,
            "bsl-language-server",
            correctBinname("bsl-language-server")
        );
        if (binaryName.indexOf(" ") > 0) {
            binaryName = `"${binaryName}"`;
        }

        const languageClient = await this.createLanguageClient(context, binaryName);
        const disposable = languageClient.start();

        context.subscriptions.push(disposable);

        await languageClient.onReady();
    }

    private async createLanguageClient(
        context: vscode.ExtensionContext,
        binaryName: string
    ): Promise<LanguageClient> {
        if (isOSUnixoid()) {
            child_process.exec(`chmod +x ${binaryName}`);
        }

        const useBinary = true;
        const executable = useBinary
            ? this.getExecutableBinary(binaryName)
            : await this.getExecutableJar(context);

        const serverOptions: ServerOptions = {
            run: executable,
            debug: executable
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [
                { scheme: "file", language: "bsl" },
                { scheme: "untitled", language: "bsl" }
            ],
            synchronize: {
                fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{os,bsl}")
            }
        };

        return new LanguageClient("bsl", "BSL Language Server", serverOptions, clientOptions);
    }

    private async getExecutableJar(context: vscode.ExtensionContext): Promise<Executable> {
        const configuration = vscode.workspace.getConfiguration("language-1c-bsl");

        let command = String(configuration.get("javaPath"));

        const javaInPath = which.sync(command, { nothrow: true });
        if (!javaInPath) {
            const javaPathExists = await fs.pathExists(command);
            if (!javaPathExists) {
                const errorMessage = `BSL Language Server is NOT running!\n
                Configuration error! Can't find "java" executable at: ${command}`;
                console.error(errorMessage);

                vscode.window.showErrorMessage(errorMessage);
                return;
            }
        }

        if (command.indexOf(" ") > 0) {
            command = `"${command}"`;
        }

        let languageServerPath = String(configuration.get("languageServerPath"));
        if (!Paths.isAbsolute(languageServerPath)) {
            languageServerPath = context.asAbsolutePath(languageServerPath);
        }
        if (languageServerPath.indexOf(" ") > 0) {
            languageServerPath = `"${languageServerPath}"`;
        }

        const javaOpts = Array(configuration.get("javaOpts"));

        const args: string[] = [];
        args.push(...javaOpts);
        args.push("-jar", languageServerPath);

        const rootPath = vscode.workspace.rootPath;
        if (rootPath) {
            const configurationFile = Paths.join(
                rootPath,
                String(configuration.get("languageServerConfiguration"))
            );

            args.push("-c", configurationFile);
        }

        return {
            command,
            args,
            options: { env: process.env, stdio: "pipe", shell: true }
        };
    }

    private getExecutableBinary(binaryName: string): Executable {
        return {
            command: binaryName,
            args: [],
            options: { env: process.env, stdio: "pipe", shell: true }
        };
    }
}
