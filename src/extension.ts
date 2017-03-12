// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { BSL_MODE } from "./const";
import { Global } from "./global";
import CompletionItemProvider from "./features/completionItemProvider";
import DefinitionProvider from "./features/definitionProvider";
import LintProvider from "./features/lintProvider";
import DocumentSymbolProvider from "./features/documentSymbolProvider";
import WorkspaseSymbolProvider from "./features/workspaceSymbolProvider";
import ReferenceProvider from "./features/referenceProvider";
import SignatureHelpProvider from "./features/signatureHelpProvider";
import HoverProvider from "./features/hoverProvider";
import SyntaxHelper from "./features/syntaxHelper";
import DocumentFormattingEditProvider from "./features/documentFormattingEditProvider";
import * as vscAdapter from "./vscAdapter";
import * as dynamicSnippets from "./features/dynamicSnippets";
import * as tasksTemplate from "./features/tasksTemplate";
import * as oscriptStdLib from "./features/oscriptStdLib";
import * as bslGlobals from "./features/bslGlobals";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const global = Global.create(vscAdapter);

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(BSL_MODE, new CompletionItemProvider(global), ".", "="));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(BSL_MODE, new DefinitionProvider(global)));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(BSL_MODE, new DocumentSymbolProvider(global)));
    context.subscriptions.push(vscode.languages.registerReferenceProvider(BSL_MODE, new ReferenceProvider(global)));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new WorkspaseSymbolProvider(global)));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(BSL_MODE, new SignatureHelpProvider(global), "(", ","));
    context.subscriptions.push(vscode.languages.registerHoverProvider(BSL_MODE, new HoverProvider(global)));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(BSL_MODE, new DocumentFormattingEditProvider(global)));
    context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(BSL_MODE, new DocumentFormattingEditProvider(global)));

    let syntaxHelper = new SyntaxHelper(global);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("syntax-helper", syntaxHelper));

    let linter = new LintProvider();
    linter.activate(context.subscriptions);

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.update", () => {
        global.updateCache();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.createComments", () => {
        if (vscode.window.activeTextEditor.document.languageId === "bsl") {
            let configuration = vscode.workspace.getConfiguration("language-1c-bsl");
            let aL: any = configuration.get("languageAutocomplete");
            let editor = vscode.window.activeTextEditor;
            let positionStart = vscode.window.activeTextEditor.selection.anchor;
            let positionEnd = vscode.window.activeTextEditor.selection.active;
            let lineMethod = (positionStart.line > positionEnd.line) ? positionStart.line + 1 : positionEnd.line + 1;
            let re = /^(Процедура|Функция|procedure|function)\s*([\wа-яё]+)/im;
            for (let indexLine = lineMethod; indexLine >= 0; --indexLine) {
                let matchMethod = re.exec(editor.document.lineAt(indexLine).text);
                if (!matchMethod) {
                    continue;
                }
                let isFunc = (matchMethod[1].toLowerCase() === "function" || matchMethod[1].toLowerCase() === "функция");
                let comment = "";
                let methodDescription = "";
                if (aL === "en") {
                    methodDescription = (isFunc) ? "Function description" : "Procedure description";
                } else {
                    methodDescription = (isFunc) ? "Описание функции" : "Описание процедуры";
                }
                comment += "// <" + methodDescription + ">\n";
                let params = global.getCacheLocal(editor.document.fileName, matchMethod[2], editor.document.getText(), false, false)[0]._method.Params;
                if (params.length > 0) {
                    comment += "//\n";
                    comment += ((aL === "en") ? "// Parameters:\n" : "// Параметры:\n");
                }
                for (let index = 0; index < params.length; index++) {
                    let element = params[index];
                    comment += "//   " + element + ((aL === "en") ? " - <Type.Subtype> - <parameter description>" : " - <Тип.Вид> - <описание параметра>");
                    comment += "\n";
                }
                if (isFunc) {
                    comment += "//\n";
                    comment += ((aL === "en") ? "//  Returns:\n" : "//  Возвращаемое значение:\n");
                    comment += ((aL === "en") ? "//   <Type.Subtype> - <returned value description>" : "//   <Тип.Вид> - <описание возвращаемого значения>");
                    comment += "\n";
                }
                comment += "//\n";
                editor.edit(function (editBuilder) {
                    editBuilder.replace(new vscode.Position(indexLine, 0), comment);
                });
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.createTasks", () => {
        let rootPath = vscode.workspace.rootPath;
        if (!rootPath) {
            return;
        }
        let vscodePath = path.join(rootPath, ".vscode");
        let promise = new Promise((resolve, reject) => {
            fs.stat(vscodePath, (err: NodeJS.ErrnoException, stats: fs.Stats) => {
                if (err) {
                    fs.mkdir(vscodePath, (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                    return;
                }
                resolve();
            });
        });

        promise.then((result) => {
            let tasksPath = path.join(vscodePath, "tasks.json");
            fs.stat(tasksPath, (err: NodeJS.ErrnoException, stats: fs.Stats) => {
                if (err) {
                    fs.writeFile(tasksPath, JSON.stringify(tasksTemplate.getTasksObject(), undefined, 4), (err: NodeJS.ErrnoException) => {
                        if (err) {
                            throw err;
                        }
                        vscode.window.showInformationMessage("tasks.json was created");
                    });
                } else {
                    vscode.window.showInformationMessage("tasks.json already exists");
                }
            });
        }).catch((reason) => {
            throw reason;
        });
    }));

    vscode.languages.setLanguageConfiguration("bsl", {
        indentationRules: {
            decreaseIndentPattern: /^\s*(конецесли|конеццикла|конецпроцедуры|конецфункции|иначе|иначеесли|конецпопытки|исключение|endif|enddo|endprocedure|endfunction|else|elseif|endtry|except).*$/i,
            increaseIndentPattern: /^\s*(пока|процедура|функция|если|иначе|иначеесли|попытка|исключение|для|while|procedure|function|if|else|elseif|try|for)[^;]*$/i
        },
        comments: {
            lineComment: "//"
        },
        __characterPairSupport: {
            autoClosingPairs: [
                { open: "{", close: "}" },
                { open: "[", close: "]" },
                { open: "(", close: ")" },
                { open: "\"", close: "\"", notIn: ["string"] },
                { open: "'", close: "'", notIn: ["string", "comment"] },
                { open: "`", close: "`", notIn: ["string", "comment"] }
            ]
        },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"]
        ],
        onEnterRules: [
            {
                beforeText: /^\s*\|([^\"]|"[^\"]*")*$/,
                action: { indentAction: vscode.IndentAction.None, appendText: "|" }
            },
            {
                beforeText: /^([^\|\"]|"[^\"]*")*\"[^\"]*$/,
                action: { indentAction: vscode.IndentAction.None, appendText: "|" }
            },
            {
                beforeText: /^.*\/\/.*$/,
                action: { indentAction: vscode.IndentAction.None, appendText: "//" }
            }
        ]
    });

    vscode.languages.setLanguageConfiguration("sdbl", {

        comments: {
            lineComment: "//"
        },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"]
        ]
    });

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (textDocumentChangeEvent: vscode.TextDocumentChangeEvent) => {
        let editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== "bsl") {
            return;
        }

        let autoClosingBrackets = Boolean(vscode.workspace.getConfiguration("editor.autoClosingBrackets"));
        if (textDocumentChangeEvent.contentChanges[0].text.slice(-1) === "(") {
            let contentChange = textDocumentChangeEvent.contentChanges[0];
            let point = contentChange.range.start.character + contentChange.text.length;
            let position = new vscode.Position(editor.selection.active.line, point);
            if (autoClosingBrackets) {
                await editor.edit((editBuilder) => {
                    editBuilder.insert(new vscode.Position(position.line, position.character), ")");
                });
            }
            vscode.commands.executeCommand("editor.action.triggerParameterHints");
            vscode.window.activeTextEditor.selection = new vscode.Selection(
                position.line,
                position.character,
                position.line,
                position.character
            );
        }
    }));

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(function (textEditor: vscode.TextEditor) {
        if (!textEditor) {
            return;
        }
        if (!global.cache.getCollection(textEditor.document.fileName)) {
            global.getRefsLocal(textEditor.document.fileName, textEditor.document.getText());
        }
        if (vscode.workspace.rootPath) {
            for (let index = 0; index < vscode.workspace.textDocuments.length; index++) {
                let element = vscode.workspace.textDocuments[index];
                if (element.isDirty && element.languageId === "bsl") {
                    global.customUpdateCache(element.getText(), element.fileName);
                }
            }
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(function (document: vscode.TextDocument) {
        if (vscode.workspace.rootPath) {
            global.customUpdateCache(document.getText(), document.fileName);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.expandAbbreviation", () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor || !editor.selection.isEmpty) {
            vscode.commands.executeCommand("tab");
            return;
        }
        let position = editor.selection.active;
        if (position.character > 1) {
            let char = editor.document.getText(new vscode.Range(
                new vscode.Position(position.line, position.character - 2), position));
            let textline = editor.document.getText(new vscode.Range(new vscode.Position(position.line, 0), (new vscode.Position(position.line, position.character - 2))));
            let regex = /([а-яё_\w]+\s?)$/i;
            let arrStrings = regex.exec(textline);
            if ((char === "++" || char === "--" || char === "+=" || char === "-=" || char === "*=" || char === "/=" || char === "%=") && editor.selection.isEmpty && arrStrings) {
                let word = arrStrings[1];
                editor.edit(function (editBuilder) {
                    let postfix = undefined;
                    switch (char) {
                        case "++":
                            postfix = " + 1;";
                            break;
                        case "--":
                            postfix = " - 1;";
                            break;
                        case "+=":
                            postfix = " + ";
                            break;
                        case "-=":
                            postfix = " - ";
                            break;
                        case "*=":
                            postfix = " * ";
                            break;
                        case "/=":
                            postfix = " / ";
                            break;
                        case "%=":
                            postfix = " % ";
                            break;
                        default:
                    }
                    editBuilder.replace(new vscode.Range(new vscode.Position(position.line, position.character - word.length - 2), position), word + " = " + word + postfix);
                }).then(() => {
                    let position = editor.selection.isReversed ? editor.selection.anchor : editor.selection.active;
                    editor.selection = new vscode.Selection(position.line, position.character, position.line, position.character);
                });
            } else {
                editor.edit(function (editBuilder) {
                    vscode.commands.executeCommand("tab");
                });
            }
        } else {
            editor.edit(function (editBuilder) {
                vscode.commands.executeCommand("tab");
            });
        }

    }));

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.dynamicSnippets", () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            return;
        }
        let dynamicSnippetsCollection = {};
        for (let element in dynamicSnippets.dynamicSnippets()) {
            let snippet = dynamicSnippets.dynamicSnippets()[element];
            dynamicSnippetsCollection[element] = snippet;
        }
        let configuration = vscode.workspace.getConfiguration("language-1c-bsl");
        let userDynamicSnippetsList: Array<string> = configuration.get("dynamicSnippets", []);
        for (let index in userDynamicSnippetsList) {
            try {
                let userDynamicSnippetsString = fs.readFileSync(userDynamicSnippetsList[index], "utf-8");
                let snippetsData = JSON.parse(userDynamicSnippetsString);
                for (let element in snippetsData) {
                    let snippet = snippetsData[element];
                    dynamicSnippetsCollection[element] = snippet;
                }
            } catch (error) {
                console.error(error);
            }
        }
        let items = [];
        for (let element in dynamicSnippetsCollection) {
            let snippet = dynamicSnippetsCollection[element];
            let description = (element === snippet.description) ? "" : snippet.description;
            items.push({ label: element, description: description });
        }

        vscode.window.showQuickPick(items).then((selection) => {
            if (!selection) {
                return;
            }
            let indent = editor.document.getText(new vscode.Range(editor.selection.start.line, 0, editor.selection.start.line, editor.selection.start.character));
            let snippetBody: string = dynamicSnippetsCollection[selection.label].body;
            snippetBody = snippetBody.replace(/\n/gm, "\n" + indent);
            let t = editor.document.getText(editor.selection);
            let arrSnippet = snippetBody.split("$1");
            if (arrSnippet.length === 1) {
                editor.edit((editBuilder) => {
                    editBuilder.replace(editor.selection, snippetBody.replace("$0", t));
                }).then(() => {
                    let position = editor.selection.isReversed ? editor.selection.anchor : editor.selection.active;
                    editor.selection = new vscode.Selection(position.line, position.character, position.line, position.character);
                });
            } else {
                editor.edit((editBuilder) => {
                    editBuilder.replace(editor.selection, snippetBody.split("$1")[1].replace("$0", t));
                }).then(() => {
                    let position = editor.selection.isReversed ? editor.selection.active : editor.selection.anchor;
                    editor.selection = new vscode.Selection(position.line, position.character, position.line, position.character);
                    editor.edit((editBuilder) => {
                        editBuilder.insert(editor.selection.active, snippetBody.split("$1")[0].replace("$0", t));
                    });
                });
            }
        });
    }));

    let previewUriString = "syntax-helper://authority/Синтакс-Помощник";
    let previewUri = vscode.Uri.parse(previewUriString);

    context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider(
        BSL_MODE, new DocumentFormattingEditProvider(global), "и", "ы", "е", "а", "e", "n", "f", "o", "y", "t", "\n"));

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.syntaxHelper", () => {
        let globalMethod = undefined;
        if (vscode.window.activeTextEditor) {
            let word = vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.document.getWordRangeAtPosition(vscode.window.activeTextEditor.selection.active));
            globalMethod = global.globalfunctions[word.toLowerCase()];
        }
        // push the items
        let items = [];
        items.push({ label: "OneScript", description: "" });
        items.push({ label: "1C", description: "" });
        let postfix = ""; // (autocompleteLanguage === "en") ? "_en" : "";
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith(".bsl") && globalMethod) {
            for (let element in bslGlobals.structureGlobContext()["global"]) {
                let segment = bslGlobals.structureGlobContext()["global"][element];
                if (segment[globalMethod.name] === "" || segment[globalMethod.name] === "") {
                    // let target = (segment[globalMethod.name] === "") ? segment[globalMethod.name] : segment[globalMethod.alias];
                    global.methodForDescription = { label: globalMethod.name, description: "1С/Глобальный контекст/" + element };
                    syntaxHelper.update(previewUri);
                    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two);
                    return;
                }
            }
        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName.endsWith(".os") && globalMethod) {
            for (let element in oscriptStdLib.globalContextOscript()) {
                let segment = oscriptStdLib.globalContextOscript()[element];
                if (segment["methods"][globalMethod.name] !== undefined || segment["methods"][globalMethod.alias] !== undefined) {
                    // let target = (segment["methods"][globalMethod.name] === "") ? segment["methods"][globalMethod.name] : segment["methods"][globalMethod.alias];
                    global.methodForDescription = { label: globalMethod.name, description: "OneScript/Глобальный контекст/" + element };
                    syntaxHelper.update(previewUri);
                    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two);
                    return;
                }
            }
        } else if (!vscode.window.activeTextEditor || vscode.window.activeTextEditor.document.fileName.endsWith(".os")) {
            for (let element in oscriptStdLib.globalContextOscript()) {
                let segment = oscriptStdLib.globalContextOscript()[element];
                for (let sectionTitle in segment) {
                    if (sectionTitle === "description" || sectionTitle === "name" || sectionTitle === "name_en") {
                        continue;
                    }
                    for (let indexMethod in segment[sectionTitle]) {
                        let method = segment[sectionTitle][indexMethod];
                        items.push({ label: method["name" + postfix], description: "OneScript/Глобальный контекст/" + element });
                    }
                }
            }
            for (let element in oscriptStdLib.classesOscript()) {
                let classOscript = oscriptStdLib.classesOscript()[element];
                items.push({ label: classOscript["name" + postfix], description: "OneScript/Классы/" + element });
                for (let sectionTitle in classOscript) {
                    if (sectionTitle === "constructors" || sectionTitle === "description" || sectionTitle === "name" || sectionTitle === "name_en") {
                        continue;
                    }
                    for (let indexMethod in classOscript[sectionTitle]) {
                        let method = classOscript[sectionTitle][indexMethod];
                        items.push({ label: classOscript["name" + postfix] + "." + method["name" + postfix], description: "OneScript/Классы/" + element });
                    }
                }
            }
            for (let element in oscriptStdLib.systemEnum()) {
                let classOscript = oscriptStdLib.systemEnum()[element];
                items.push({ label: classOscript["name" + postfix], description: "OneScript/Системные перечисления/" + element });
                for (let sectionTitle in classOscript) {
                    if (sectionTitle === "description" || sectionTitle === "name" || sectionTitle === "name_en") {
                        continue;
                    }
                    for (let indexMethod in classOscript[sectionTitle]) {
                        let method = classOscript[sectionTitle][indexMethod];
                        items.push({ label: classOscript["name" + postfix] + "." + method["name" + postfix], description: "OneScript/Системные перечисления/" + element });
                    }
                }
            }

        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === "bsl") {
            for (let elementSegment in bslGlobals.structureGlobContext()["global"]) {
                let segment = bslGlobals.structureGlobContext()["global"][elementSegment];
                for (let element in segment) {
                    items.push({ label: element, description: "1С/Глобальный контекст/" + elementSegment });
                }
            }
            for (let elementSegment in bslGlobals.classes()) {
                let class1C = bslGlobals.classes()[elementSegment];
                items.push({ label: elementSegment, description: "1С/Классы/" + elementSegment });
                for (let sectionTitle in class1C) {
                    if (sectionTitle === "constructors" || sectionTitle === "description" || sectionTitle === "name" || sectionTitle === "name_en") {
                        continue;
                    }
                    for (let element in class1C[sectionTitle]) {
                        items.push({ label: elementSegment + "." + element, description: "1С/Классы/" + elementSegment });
                    }
                }
            }
            for (let elementSegment in bslGlobals.systemEnum()) {
                let class1C = bslGlobals.systemEnum()[elementSegment];
                items.push({ label: elementSegment, description: "1С/Системные перечисления/" + elementSegment });
                for (let sectionTitle in class1C) {
                    if (sectionTitle === "description" || sectionTitle === "name" || sectionTitle === "name_en") {
                        continue;
                    }
                    for (let element in class1C[sectionTitle]) {
                        items.push({ label: elementSegment + "." + element, description: "1С/Системные перечисления/" + elementSegment });
                    }
                }
            }
        } else {
            return;
        }
        // pick one
        let options = {
            placeHolder: "Введите название метода",
            matchOnDescription: false
        };
        if (!global.syntaxFilled) {
            if (vscode.window.activeTextEditor.document.fileName.endsWith(".os")) {
                global.methodForDescription = { label: "OneScript", description: "" };
            } else if (vscode.window.activeTextEditor.document.languageId === "bsl") {
                global.methodForDescription = { label: "1C", description: "" };
            }
            syntaxHelper.update(previewUri);
            vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two);
        } else {
            vscode.window.showQuickPick(items, options).then(function (selection) {
                if (typeof selection === "undefined") {
                    return;
                }
                global.methodForDescription = selection;
                syntaxHelper.update(previewUri);
                vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two);
            });
        }
    }));

    if (vscode.window.activeTextEditor) {
        global.getRefsLocal(vscode.window.activeTextEditor.document.fileName, vscode.window.activeTextEditor.document.getText());
    }
    global.updateCache();
}

