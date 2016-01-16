var vscode = require('vscode');

var BSLDocumentSymbolProvider = (function () {
	function BSLDocumentSymbolProvider() {
		this.goKindToCodeKind = {
			"variable" : vscode.SymbolKind.Variable,
			"function" : vscode.SymbolKind.Function
		};
	}
	BSLDocumentSymbolProvider.prototype.provideDocumentSymbols = function (document, token) {
		var _this = this;
		return new Promise(function (resolve, reject) {
			var symbols = [];
			var text = document.getText();
			var KindToCodeKind = {
				"variable" : /(перем|var)\s+([a-zа-яё_][a-zа-яё_0-9]*)/ig,
				"function" : /(процедура|функция|procedure|function)\s+([a-zа-яё_][a-zа-яё_0-9]*)\s*\(/ig
			};
			var ArrayKind = ["variable", "function"];
			ArrayKind.forEach(function (Kind) {
				var valueMatch = KindToCodeKind[Kind];
				var match = null;
				while (match = valueMatch.exec(text)) {
					var word = match[2];
					var indexWord = text.indexOf(match[0]) + match[0].indexOf(word);
					var lineWord = 0;
					var characterWord = indexWord;
					var endWord = indexWord + word.length;
					var pos = text.indexOf("\n");
					while (pos != -1 && pos <= indexWord) {
						lineWord++;
						if (pos <= indexWord) {
							characterWord = indexWord - pos - 1;
							endWord = characterWord + word.length;
						}
						pos = text.indexOf("\n", pos + 2);
					}
					var symbolInfo = new vscode.SymbolInformation(word, _this.goKindToCodeKind[Kind], new vscode.Range(new vscode.Position(lineWord, characterWord), new vscode.Position(lineWord, endWord)), undefined);
					symbols.push(symbolInfo);
				}
			})

			try {
				return resolve(symbols);
			} catch (e) {
				reject(e);
			}

		});
	};
	return BSLDocumentSymbolProvider;
})();

exports.DocumentSymbolProvider = BSLDocumentSymbolProvider;
//# sourceMappingURL=goOutline.js.map