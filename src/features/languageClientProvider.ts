import {
    Executable,
    LanguageClientOptions,
    LanguageClient,
    ServerOptions
} from "vscode-languageclient";
import * as Path from "path";
import { ExtensionContext, workspace } from "vscode";

export default class LanguageClientProvider {
    public registerLanguageClient(context: ExtensionContext) {
        
        const languageServerPath = context.asAbsolutePath(
            Path.join("languageserver", "bsl-language-server.jar")
        );

        const executable: Executable = {
            command: "java",
            args: ["-Xmx4g", "-jar", languageServerPath, "-d", "ru"],
            options: { env: process.env, stdio: "pipe", shell: true }
        };
        
        const serverOptions: ServerOptions = {
            run: executable,
            debug: executable
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "bsl" }],
            synchronize: {
                fileEvents: workspace.createFileSystemWatcher("**/*.os")
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
