import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
import BackwardIterator from "./backwardIterator";

const _NL = "\n".charCodeAt(0);
const _TAB = "\t".charCodeAt(0);
const _WSB = " ".charCodeAt(0);

export default class DocumentFormattingEditProvider
    extends AbstractProvider
    implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {

    private indentWord: Set<string> = new Set([
        "(",
        "процедура",
        "procedure",
        "функция",
        "function",
        "если",
        "if",
        "пока",
        "while",
        "для",
        "for",
        "попытка",
        "try"
    ]);
    private reindentWord: Set<string> = new Set([
        ")",
        "конецпроцедуры",
        "endprocedure",
        "конецфункции",
        "endfunction",
        "конецесли",
        "endif",
        "конеццикла",
        "enddo",
        "конецпопытки",
        "endtry"
    ]);
    private unindentWord: Set<string> = new Set([
        "иначе",
        "else",
        "иначеесли",
        "elseif",
        "исключение",
        "except"
    ]);

    public provideDocumentFormattingEdits(document: vscode.TextDocument,
                                          options: vscode.FormattingOptions): vscode.TextEdit[] {
        return this.format(document, undefined, options);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument,
                                               range: vscode.Range,
                                               options: vscode.FormattingOptions): vscode.TextEdit[] {
        return this.format(document, range, options);
    }

    public provideOnTypeFormattingEdits(document: vscode.TextDocument,
                                        position: vscode.Position,
                                        ch: string,
                                        options: vscode.FormattingOptions): vscode.TextEdit[] {
        const iterator = new BackwardIterator(document, 0, position.line - 1);
        if (ch === "\n") {
            while (iterator.hasNext()) {
                const nextCh = iterator.next();
                if (nextCh === _WSB || nextCh === _TAB || nextCh === _NL) {
                    continue;
                }
                break;
            }
        }
        return this.format(
            document,
            new vscode.Range(
                new vscode.Position(iterator.lineNumber, 0),
                position),
            options
            );
    }

    private format(document: vscode.TextDocument,
                   range: vscode.Range,
                   options: vscode.FormattingOptions): vscode.TextEdit[] {
        const documentText = document.getText();
        let initialIndentLevel: number;
        const globals = this._global;
        let value: string;
        let rangeOffset: number;
        let indexValue: number;
        const editOperations: vscode.TextEdit[] = [];
        if (range) {
            const startPosition = new vscode.Position(range.start.line, 0);
            rangeOffset = document.offsetAt(startPosition);
            const endPosition =  new vscode.Position(
                range.end.line, document.lineAt(range.end.line).text.length);
            const endOffset = document.offsetAt(endPosition);
            range = new vscode.Range(startPosition, endPosition);
            value = documentText.substring(rangeOffset, endOffset);
            initialIndentLevel = this.computeIndentLevel(value, options);
            if (true) {
                value = wizard(value);
            }
        } else {
            value = documentText;
            range = new vscode.Range(new vscode.Position(0, 0), document.positionAt(value.length));
            initialIndentLevel = 0;
        }

        let indentLevel = initialIndentLevel;
        const indentValue: string = (options.insertSpaces) ? this.repeat(" ", options.tabSize).toString() : "\t";

        function addEdit(text: string, lineNumber: number) {
            const oldIndent = /^\s*/.exec(text)[0];
            if (oldIndent !== indentValue.repeat(indentLevel)) {
                editOperations.push(
                    vscode.TextEdit.replace(
                        new vscode.Range(
                            new vscode.Position(lineNumber, 0),
                            new vscode.Position(lineNumber, oldIndent.length)),
                        indentValue.repeat(indentLevel)
                    )
                );
            }
        }

        function wizard(formattingValue) {
            const keywords = "(?:[^\wа-яё\.]|^)(Процедура|Функция|КонецПроцедуры|КонецФункции|Если|Иначе"
            + "|ИначеЕсли|КонецЕсли|Тогда|Для|Каждого|Пока|Цикл|КонецЦикла|Попытка|Исключение|КонецПопытки"
            + "|Экспорт|Возврат|Истина|Ложь|Сообщить|Новый|СообщениеПользователю|Неопределено)(?=[^\wа-яё\.]|$)";
            const Regex = /(\/\/.*$)|(\/\/.*\r?\n)|("[^"]*$)|("(""|[^"]*)*")|((\/[^\/"]|[^\/"])+)/g;
            const separator = /(^|.)(<>|<=|>=|,|=|\+|-|\*|\/|%|<|>)(.|$)/g;
            let ArrStrings = Regex.exec(formattingValue);
            while (ArrStrings) {
                if (ArrStrings[6]) {
                    indexValue = ArrStrings.index;
                    ArrStrings[6].replace(new RegExp(keywords, "ig"), replacer);
                    ArrStrings[6].replace(new RegExp(separator, "g"), spaceInserter);
                }
                ArrStrings = Regex.exec(formattingValue);
            }
            return formattingValue;
        }

        function spaceInserter(match, match1, match2, match3, offset) {
            if ((match1.match(/\s/) || match2 === ",") && match3.match(/\s/)) {
                return match;
            }
            const startPosition = document.positionAt(rangeOffset + indexValue + offset);
            const endPosition = document.positionAt(rangeOffset + indexValue + offset + match.length);
            if (match1.match(/\s/) || match2 === ",") {
                editOperations.push(
                    vscode.TextEdit.replace(
                        new vscode.Range(startPosition, endPosition),
                        match1 + match2 + " " + match3
                    )
                );
            } else if (!match3.match(/\s/)) {
                editOperations.push(
                    vscode.TextEdit.replace(
                        new vscode.Range(startPosition, endPosition),
                        match1 + " " + match2 + " " + match3
                    )
                );
            } else {
                editOperations.push(
                    vscode.TextEdit.replace(
                        new vscode.Range(startPosition, endPosition),
                        match1 + " " + match2 + match3
                    )
                );
            }

            return match;
        }

        function replacer(match, match1, offset) {
            const keyword = globals.keywords[match1.toLowerCase()];
            if (keyword && match1 !== keyword) {
                match1 = keyword;
                const startPosition = document.positionAt(
                    rangeOffset + indexValue + offset + match.length - match1.length
                );
                const endPosition = document.positionAt(rangeOffset + indexValue + offset + match.length);
                editOperations.push(vscode.TextEdit.replace(new vscode.Range(startPosition, endPosition), match1));
            }
            return match;
        }

        const eol = this.getEOL(document);
        const arrayValue = value.split(new RegExp(eol));
        for (const key in arrayValue) {
            const element = arrayValue[key];
            const firstWord = element.toLowerCase().trim().split(/[^\wа-яё\(\)]/)[0];
            if (this.indentWord.has(firstWord)) {
                addEdit(element, +key + range.start.line);
                indentLevel++;
            } else if (this.reindentWord.has(firstWord)) {
                if (+key !== 0 && indentLevel !== 0) {
                    indentLevel--;
                }
                addEdit(element, +key + range.start.line);
            } else if (this.unindentWord.has(firstWord)) {
                if (+key !== 0 && indentLevel !== 0) {
                    indentLevel--;
                }
                addEdit(element, +key + range.start.line);
                indentLevel++;
            } else {
                addEdit(element, +key + range.start.line);
            }
        }
        return editOperations;
    }

    private repeat(s: string, count: number): string {
        let result = "";
        for (let i = 0; i < count; i++) {
            result += s;
        }
        return result;
    }

    private computeIndentLevel(content: string, options: vscode.FormattingOptions): number {
        let i = 0;
        let nChars = 0;
        const tabSize = options.tabSize || 4;
        while (i < content.length) {
            const ch = content.charAt(i);
            if (ch === " ") {
                nChars++;
            } else if (ch === "\t") {
                nChars += tabSize;
            } else {
                break;
            }
            i++;
        }
        return Math.floor(nChars / tabSize);
    }

    private getEOL(document: vscode.TextDocument): string {
        const text = document.getText();
        if (document.lineCount > 1) {
            const to = document.offsetAt(new vscode.Position(1, 0));
            let from = to;
            while (from > 0 && this.isEOL(text, from - 1)) {
                from--;
            }
            return text.substr(from, to - from);
        }
        return "\n";
    }

    private isEOL(text: string, offset: number): boolean {
        return "\r\n".indexOf(text.charAt(offset)) !== -1;
    }
}
