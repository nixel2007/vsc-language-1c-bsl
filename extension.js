var vscode = require('vscode');

var providers = require('./providers');

function activate(context) {
    var disposable = vscode.commands.registerCommand('extension.addpipe', function () {
        var editor = vscode.window.activeTextEditor;
        if (editor != undefined) {
            var position = editor.selection.active;
            var textline = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            var Regex = /(\/\/.*$)|(\/\/.*\r?\n)|("(""|[^"]*)*")|("[^"]*$)|([^"\/]+)/g;
            while ((ArrStrings = Regex.exec(textline)) != null) {
                var stringmatsh = ArrStrings[5];
            }
            if (stringmatsh != undefined) {
                editor.edit(function (editBuilder) {
                    editBuilder.insert(new vscode.Position(position.line, position.character), '\n|');
                });
            } else {
                editor.edit(function (editBuilder) {
                    editBuilder.insert(new vscode.Position(position.line, position.character), '\n');
                });
            }
        }
    });
    context.subscriptions.push(disposable);
    
    disposable = vscode.languages.registerDocumentSymbolProvider("bsl", new providers.DocumentSymbolProvider());
    context.subscriptions.push(disposable);
}
exports.activate = activate;
