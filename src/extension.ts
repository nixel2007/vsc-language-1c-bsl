// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { BSL_MODE } from "./const";
import {Global} from "./global";
import CompletionItemProvider from "./features/completionItemProvider";
import DefinitionProvider from "./features/definitionProvider";
import LintProvider from "./features/lintProvider";
import DocumentSymbolProvider from "./features/documentSymbolProvider";
import WorkspaseSymbolProvider from "./features/workspaceSymbolProvider";
import ReferenceProvider from "./features/referenceProvider";
import SignatureHelpProvider from "./features/signatureHelpProvider";
import HoverProvider from "./features/hoverProvider";
import SyntaxHelper from "./features/syntaxHelper";
import * as vscAdapter from "./vscAdapter";
import * as dynamicSnippets from "./features/dynamicSnippets";
import * as tasksTemplate from "./features/tasksTemplate";
import * as oscriptStdLib from "./features/oscriptStdLib";
import * as bslGlobals from "./features/bslGlobals";

let diagnosticCollection: vscode.DiagnosticCollection;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const global = new Global(vscAdapter);

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(BSL_MODE, new CompletionItemProvider(global), ".", "="));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(BSL_MODE, new DefinitionProvider(global)));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(BSL_MODE, new DocumentSymbolProvider(global)));
    context.subscriptions.push(vscode.languages.registerReferenceProvider(BSL_MODE, new ReferenceProvider(global)));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new WorkspaseSymbolProvider(global)));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(BSL_MODE, new SignatureHelpProvider(global), "(", ","));
    context.subscriptions.push(vscode.languages.registerHoverProvider(BSL_MODE, new HoverProvider(global)));

    let syntaxHelper = new SyntaxHelper(global);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("syntax-helper", syntaxHelper));

    let linter = new LintProvider();
    linter.activate(context.subscriptions);

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.update", () => {
        let filename = vscode.window.activeTextEditor.document.fileName;
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
                let MatchMethod = re.exec(editor.document.lineAt(indexLine).text);
                if (MatchMethod === null) {
                    continue;
                }
                let isFunc = (MatchMethod[1].toLowerCase() === "function" || MatchMethod[1].toLowerCase() === "функция");
                let comment = "";
                let methodDescription = "";
                if (aL === "en") {
                    methodDescription = (isFunc) ? "Function description" : "Procedure description";
                } else {
                    methodDescription = (isFunc) ? "Описание функции" : "Описание процедуры";
                }
                comment += "// <" + methodDescription + ">\n";
                let params = global.getCacheLocal(editor.document.fileName, MatchMethod[2], editor.document.getText())[0]._method.Params;
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
                    comment += ((aL === "en") ? "//   <Type.Subtype>   - <returned value description>" : "//   <Тип.Вид>   - <описание возвращаемого значения>");
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
        if (rootPath === undefined) {
            return;
        }
        let vscodePath = path.join(rootPath, ".vscode");
        let promise = new Promise( (resolve, reject) => {
            fs.stat(vscodePath, (err: NodeJS.ErrnoException, stats: fs.Stats) => {
                if (err) {
                    fs.mkdir(vscodePath, (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    })
                    return;
                }
                resolve();
            });            
        });
        
        promise.then( (result) => {
            let tasksPath = path.join(vscodePath, "tasks.json");
            fs.stat(tasksPath, (err: NodeJS.ErrnoException, stats: fs.Stats) => {
                if (err) {
                    fs.writeFile(tasksPath, JSON.stringify(tasksTemplate.getTasksObject(), null, 4), (err: NodeJS.ErrnoException) => {
                        if (err) {
                            throw err;
                        }
                        vscode.window.showInformationMessage("tasks.json was created");
                    });
                } else {
                    vscode.window.showInformationMessage("tasks.json already exists")
                }
            });
        }).catch( (reason) => {
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

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function (textDocumentChangeEvent: vscode.TextDocumentChangeEvent) {
        let editor = vscode.window.activeTextEditor;
        if (textDocumentChangeEvent.contentChanges[0].text.slice(-1) === "(") {
            let point = textDocumentChangeEvent.contentChanges[0].range.start.character + textDocumentChangeEvent.contentChanges[0].text.length;
            let position = new vscode.Position(editor.selection.active.line, point);
            editor.edit(function (editBuilder) {
                editBuilder.insert(new vscode.Position(position.line, position.character), ")");
            }).then(function () {
                vscode.commands.executeCommand("editor.action.triggerParameterHints");
                vscode.window.activeTextEditor.selection = new vscode.Selection(position.line, position.character, position.line, position.character);
            });
        }
    }));

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(function (textEditor: vscode.TextEditor) {
        if (!textEditor) {
            return;
        }
        applyConfigToTextEditor(textEditor);
        if (!global.cache.getCollection(textEditor.document.fileName)) {
            global.getRefsLocal(textEditor.document.fileName, textEditor.document.getText());
        }
        if (vscode.workspace.rootPath !== undefined) {
            for (let index = 0; index < vscode.workspace.textDocuments.length; index++) {
                let element = vscode.workspace.textDocuments[index];
                if (element.isDirty && element.languageId === "bsl") {
                    global.customUpdateCache(element.getText(), element.fileName);
                }
            }
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(function (document: vscode.TextDocument) {
        if (vscode.workspace.rootPath !== undefined) {
            global.customUpdateCache(document.getText(), document.fileName);
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

    context.subscriptions.push(vscode.commands.registerCommand("language-1c-bsl.syntaxHelper", () => {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        let word = vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.document.getWordRangeAtPosition(vscode.window.activeTextEditor.selection.active));
        let globalMethod = global.globalfunctions[word.toLowerCase()];
        // push the items
        let items = [];
        items.push({ label: "OneScript", description: "" });
        items.push({ label: "1C", description: "" });
        let autocompleteLanguage: any = vscode.workspace.getConfiguration("language-1c-bsl")["languageAutocomplete"];
        let postfix = ""; // (autocompleteLanguage === "en") ? "_en" : "";
        if (vscode.window.activeTextEditor.document.fileName.endsWith(".bsl") && globalMethod) {
            for (let element in bslGlobals.structureGlobContext()["global"]) {
                let segment = bslGlobals.structureGlobContext()["global"][element];
                if (segment[globalMethod.name] !== undefined || segment[globalMethod.alias] !== undefined) {
                    let target = (segment[globalMethod.name] !== undefined) ?  segment[globalMethod.name] : segment[globalMethod.alias];
                    global.methodForDescription = { label: target, description: "1С/Глобальный контекст/" + element };
                    syntaxHelper.update(previewUri);
                    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two).then((success) => {
                    }, (reason) => {
                        vscode.window.showErrorMessage(reason);
                    });
                    return;
                }
            }
        } else if (vscode.window.activeTextEditor.document.fileName.endsWith(".os") && globalMethod) {
            for (let element in oscriptStdLib.globalContextOscript()) {
                let segment = oscriptStdLib.globalContextOscript()[element];
                if (segment["methods"][globalMethod.name] || segment["methods"][globalMethod.alias]) {
                    let target = (segment["methods"][globalMethod.name] !== undefined) ?  segment["methods"][globalMethod.name] : segment["methods"][globalMethod.alias];
                    global.methodForDescription = { label: target.name, description: "OneScript/Глобальный контекст/" + element };
                    syntaxHelper.update(previewUri);
                    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two).then((success) => {
                    }, (reason) => {
                        vscode.window.showErrorMessage(reason);
                    });
                    return;
                }
            }
        } else if (vscode.window.activeTextEditor.document.fileName.endsWith(".os")) {
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

        } else if (vscode.window.activeTextEditor.document.languageId === "bsl") {
            for (let elementSegment in bslGlobals.structureGlobContext()["global"]) {
                let segment = bslGlobals.structureGlobContext()["global"][elementSegment];
                for (let element in segment) {
                    let method = segment[element];
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
                        let method1С = class1C[sectionTitle][element];
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
                        let method1С = class1C[sectionTitle][element];
                        items.push({ label: elementSegment + "." + element, description: "1С/Системные перечисления/" + elementSegment });
                    }
                }
            }
        } else {
            return;
        }
        // pick one
        let currentLine = vscode.window.activeTextEditor.selection.active.line + 1;
        let options = {
            placeHolder: "Введите название метода",
            matchOnDescription: false
        };
        if (!global.syntaxFilled) {
            if (vscode.window.activeTextEditor.document.fileName.endsWith(".os")) {
                global.methodForDescription = { label: "OneScript", description: "" };
            }
            else if (vscode.window.activeTextEditor.document.languageId === "bsl") {
                global.methodForDescription = { label: "1C", description: "" };
            }
            syntaxHelper.update(previewUri);
            vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two).then(
                (success) => {
                    vscode.window.showQuickPick(items, options).then(function (selection) {
                        if (typeof selection === "undefined") {
                            return;
                        }
                        global.methodForDescription = selection;
                        syntaxHelper.update(previewUri);
                        vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two);
                    });
                }, (reason) => {
                    vscode.window.showErrorMessage(reason);
                });
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
        applyConfigToTextEditor(vscode.window.activeTextEditor);
        global.getRefsLocal(vscode.window.activeTextEditor.document.fileName, vscode.window.activeTextEditor.document.getText());
    }
    global.updateCache();
}

function applyConfigToTextEditor(textEditor: vscode.TextEditor): any {

    if (!textEditor) {
        return;
    };
    let newOptions: vscode.TextEditorOptions = {
        "insertSpaces": false,
        "tabSize": 4
    };

    let defaultOptions: vscode.TextEditorOptions = {
        "insertSpaces": Boolean(vscode.workspace.getConfiguration("editor").get("insertSpaces")),
        "tabSize": Number(vscode.workspace.getConfiguration("editor").get("tabSize"))
    };

    if (vscode.languages.match(BSL_MODE, textEditor.document)) {
        if (textEditor.options.insertSpaces === defaultOptions.insertSpaces
            && (textEditor.options.tabSize === defaultOptions.tabSize)) {
            textEditor.options.insertSpaces = newOptions.insertSpaces;
            textEditor.options.tabSize = newOptions.tabSize;
        } else if (textEditor.options.insertSpaces === newOptions.insertSpaces && textEditor.options.tabSize === newOptions.tabSize) {
            textEditor.options.insertSpaces = defaultOptions.insertSpaces;
            textEditor.options.tabSize = defaultOptions.tabSize;
        }
    }
}