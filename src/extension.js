var vscode = require('vscode');

var bslProviders = require('./providers');
var bslCommands = require('./commands');

function activate(context) {
    
    context.subscriptions.push(vscode.commands.registerCommand('extension.addpipe', bslCommands.addPipe));

    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("bsl", new bslProviders.DocumentSymbolProvider()));

    context.subscriptions.push(vscode.languages.registerDefinitionProvider("bsl", new bslProviders.DefinitionProvider()));

}

exports.activate = activate;
