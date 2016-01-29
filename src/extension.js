var vscode = require('vscode');

var bslProviders = require('./providers');

function activate(context) {


    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("bsl", new bslProviders.DocumentSymbolProvider()));

    context.subscriptions.push(vscode.languages.registerDefinitionProvider("bsl", new bslProviders.DefinitionProvider()));
    
    vscode.languages.setLanguageConfiguration("bsl", {
       
        indentationRules: {
            decreaseIndentPattern: /^\s*(конецесли|конеццикла|конецпроцедуры|конецфункции|иначе|иначеесли|конецпопытки|исключение|endif|enddo|endprocedure|endfunction|else|elseif|endtry|except).*$/i,
            increaseIndentPattern: /^\s*(пока|процедура|функция|если|иначе|иначеесли|попытка|исключение|для|while|procedure|function|if|else|elseif|try|for)[^;]*$/i
        },
        comments: {
            lineComment: '//'
        },
        onEnterRules: [
            {
                beforeText: /^\s*\|([^\"]|"[^\"]*")*$/,
                action: { indentAction: vscode.IndentAction.None, appendText: '|' }
            },
            {
                beforeText: /^([^\|\"]|"[^\"]*")*\"[^\"]*$/,
                action: { indentAction: vscode.IndentAction.None, appendText: '|' }
            }

        ]
        
    });
}

exports.activate = activate;
