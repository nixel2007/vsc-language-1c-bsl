var vscode = require('vscode');

function addPipe() {
    var editor = vscode.window.activeTextEditor;
    if (editor != undefined) {
        var position = editor.selection.active;
        var textline = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        var Regex = /(\/\/.*$)|(\/\/.*\r?\n)|("[^"]*$)|("(""|[^"]*)*")|([^"\/]+)/g;
        var ArrStrings;
        while ((ArrStrings = Regex.exec(textline)) != null) {
            var stringmatsh = ArrStrings[3];
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
}

exports.addPipe = addPipe;
