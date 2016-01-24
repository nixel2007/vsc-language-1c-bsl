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
        var textLineAt = editor.document.lineAt(position._line).text;
        var RegexSpace = /(\s*).*$/;
        var IndentText = "";
        var ArrSpace;
        if (ArrSpace = RegexSpace.exec(textLineAt)) {
            if (ArrSpace[1] != undefined) {
                IndentText = ArrSpace[1];
            }
        };
        if (stringmatsh != undefined) {
            editor.edit(function (editBuilder) {
                editBuilder.insert(new vscode.Position(position.line, position.character), '\n' + IndentText + '|');
            });
        } else {
            editor.edit(function (editBuilder) {
                editBuilder.insert(new vscode.Position(position.line, position.character), '\n' + IndentText);
            });
        }
    }
}

exports.addPipe = addPipe;
