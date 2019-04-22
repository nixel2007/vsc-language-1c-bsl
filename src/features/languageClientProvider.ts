import * as Paths from "path";
import * as vscode from "vscode";
import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from "vscode-languageclient";

export default class LanguageClientProvider {
    public async registerLanguageClient(context: vscode.ExtensionContext) {
        const configuration = vscode.workspace.getConfiguration("language-1c-bsl");
        const languageServerEnabled = Boolean(configuration.get("languageServerEnabled"));

        if (!languageServerEnabled) {
            return;
        }

        const command = String(configuration.get("javaPath"));
        const languageServerPath = context.asAbsolutePath(
            String(configuration.get("languageServerPath"))
        );
        const javaOpts = Array(configuration.get("javaOpts"));
        const configurationFile = Paths.join(
            vscode.workspace.rootPath,
            String(configuration.get("languageServerConfiguration"))
        );

        const args: string[] = [];
        args.push(...javaOpts);
        args.push("-jar", languageServerPath);
        args.push("-c", configurationFile);

        const executable: Executable = {
            command,
            args,
            options: { env: process.env, stdio: "pipe", shell: true }
        };

        const serverOptions: ServerOptions = {
            run: executable,
            debug: executable
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "bsl" }],
            synchronize: {
                fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{os,bsl}")
            }
        };

        const client = new LanguageClient(
            "bsl-language-server",
            "BSL Language Server",
            serverOptions,
            clientOptions
        );

        const disposable = client.start();

        context.subscriptions.push(disposable);
    }
}
