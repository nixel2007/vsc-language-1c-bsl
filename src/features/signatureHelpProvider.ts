import {CancellationToken, Position, SignatureHelp, SignatureHelpProvider, SignatureInformation, TextDocument} from "vscode";
import AbstractProvider from "./abstractProvider";

const _NL = "\n".charCodeAt(0);
const _TAB = "\t".charCodeAt(0);
const _WSB = " ".charCodeAt(0);
const _LBracket = "[".charCodeAt(0);
const _RBracket = "]".charCodeAt(0);
const _LCurly = "{".charCodeAt(0);
const _RCurly = "}".charCodeAt(0);
const _LParent = "(".charCodeAt(0);
const _RParent = ")".charCodeAt(0);
const _Comma = ",".charCodeAt(0);
const _Quote = "'".charCodeAt(0);
const _DQuote = "\"".charCodeAt(0);
const _USC = "_".charCodeAt(0);
const _a = "a".charCodeAt(0);
const _z = "z".charCodeAt(0);
const _A = "A".charCodeAt(0);
const _Z = "Z".charCodeAt(0);
const _0 = "0".charCodeAt(0);
const _9 = "9".charCodeAt(0);
const _Dot = ".".charCodeAt(0);

const BOF = 0;

class BackwardIterator {
    private lineNumber: number;
    private offset: number;
    private line: string;
    private model: TextDocument;

    constructor(model: TextDocument, offset: number, lineNumber: number) {
        this.lineNumber = lineNumber;
        this.offset = offset;
        this.line = model.lineAt(this.lineNumber).text;
        this.model = model;
    }

    public hasNext(): boolean {
        return this.lineNumber >= 0;
    }

    public next(): number {
        if (this.offset < 0) {
            if (this.lineNumber > 0) {
                this.lineNumber--;
                this.line = this.model.lineAt(this.lineNumber).text;
                this.offset = this.line.length - 1;
                return _NL;
            }
            this.lineNumber = -1;
            return BOF;
        }
        const ch = this.line.charCodeAt(this.offset);
        this.offset--;
        return ch;
    }

}

export default class GlobalSignatureHelpProvider extends AbstractProvider implements SignatureHelpProvider {

    public provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken): Thenable<SignatureHelp> {

        return new Promise((resolve, reject) => {
            const iterator = new BackwardIterator(document, position.character - 1, position.line);

            const paramCount = this.readArguments(iterator);
            if (paramCount < 0) {
                return resolve(undefined);
            }

            let ident = this.readIdent(iterator);
            if (!ident) {
                return resolve(undefined);
            }

            let entry = this._global.globalfunctions[ident.toLowerCase()];
            let entries;
            if (!entry) {
                let module = "";
                if (ident.indexOf(".") > 0) {
                    const dotArray: string[] = ident.split(".");
                    ident = dotArray.pop();
                    if (this._global.toreplaced[dotArray[0]]) {
                        dotArray[0] = this._global.toreplaced[dotArray[0]];
                    }
                    module = dotArray.join(".");
                }
                if (module.length === 0) {
                    const source = document.getText();
                    entries = this._global.getCacheLocal(document.fileName, ident, source, false, false);
                } else {
                    entries = this._global.query(ident, module, false, false);
                }
                // Показ сигнатур по имени функции
                // if (entry.length === 0) {
                //     entry = this._global.query(ident, "", false, false);
                // }
                if (!entry && entries.length === 0) {
                    return resolve(undefined);
                } else if (module.length === 0) {
                    entry = entries[0];
                    return resolve(this.GetSignature(entry, paramCount));
                } else {
                    for (let i = 0; i < entries.length; i++) {
                        const signatureElement = entries[i];
                        const arrayFilename = signatureElement.filename.split("/");
                        if (!signatureElement.oscriptLib && arrayFilename[arrayFilename.length - 4] !== "CommonModules" && !signatureElement.filename.endsWith("ManagerModule.bsl")) {
                            continue;
                        }
                        if (signatureElement._method.IsExport) {
                            return resolve(this.GetSignature(signatureElement, paramCount));
                        }
                    }
                    return resolve(undefined);
                    // }
                }
            }
            const signature = (!entry.signature) ? entry.oscript_signature : entry.signature;
            if (!signature) { return resolve(undefined); }
            const ret = new SignatureHelp();
            for (const element in signature) {
                const paramsString = signature[element].СтрокаПараметров;
                const signatureInfo = new SignatureInformation(entry.name + paramsString, "");

                const re = /([\wа-яА-Я]+)\??:\s+[а-яА-Я\w_\.\|]+/g;
                let match: RegExpExecArray;
                while ((match = re.exec(paramsString))) {
                    signatureInfo.parameters.push({ label: match[0], documentation: signature[element].Параметры[match[1]] });
                }

                if (signatureInfo.parameters.length - 1 < paramCount) {
                    continue;
                }
                ret.signatures.push(signatureInfo);
                ret.activeSignature = 0;
                ret.activeParameter = Math.min(paramCount, signatureInfo.parameters.length - 1);

            }
            return resolve(ret);
        });
    }

    private GetSignature(entry, paramCount): SignatureHelp {
        if (entry._method.Params.length !== 0) {
            const arraySignature = this._global.GetSignature(entry);
            const ret = new SignatureHelp();
            const signatureInfo = new SignatureInformation(entry.name + arraySignature.paramsString, "");

            const re = /([\wа-яА-Я]+)(:\s+[<а-яА-Я\w_\.>\|]+)?/g;
            let match: RegExpExecArray;
            while ((match = re.exec(arraySignature.paramsString))) {
                const documentationParam = this._global.GetDocParam(arraySignature.description, match[1]);
                signatureInfo.parameters.push({ label: match[0] + (documentationParam.optional ? "?" : ""), documentation: documentationParam.descriptionParam });
            }

            if (entry._method.Params.length - 1 < paramCount) {
                return undefined;
            }

            ret.signatures.push(signatureInfo);
            ret.activeSignature = 0;
            ret.activeParameter = Math.min(paramCount, signatureInfo.parameters.length - 1);

            return ret;
        } else {
            return undefined;
        }
    }

    private readArguments(iterator: BackwardIterator): number {
        let parentNesting = 0;
        let bracketNesting = 0;
        let curlyNesting = 0;
        let paramCount = 0;
        while (iterator.hasNext()) {
            const ch = iterator.next();
            switch (ch) {
                case _LParent:
                    parentNesting--;
                    if (parentNesting < 0) {
                        return paramCount;
                    }
                    break;
                case _RParent: parentNesting++; break;
                case _LCurly: curlyNesting--; break;
                case _RCurly: curlyNesting++; break;
                case _LBracket: bracketNesting--; break;
                case _RBracket: bracketNesting++; break;
                case _DQuote:
                case _Quote:
                    // while (iterator.hasNext() && ch !== iterator.next()) {
                    //     // find the closing quote or double quote
                    // }
                    break;
                case _Comma:
                    if (!parentNesting && !bracketNesting && !curlyNesting) {
                        paramCount++;
                    }
                    break;
                default:
            }
        }
        return -1;
    }

    private isIdentPart(ch: number): boolean {
        if (ch === _USC || // _
            ch >= _a && ch <= _z || // a-z
            ch >= _A && ch <= _Z || // A-Z
            ch >= _0 && ch <= _9 || // 0/9
            ch === _Dot ||
            ch >= 0x80 && ch <= 0xFFFF) { // nonascii

            return true;
        }
        return false;
    }

    private readIdent(iterator: BackwardIterator): string {
        let identStarted = false;
        let ident = "";
        while (iterator.hasNext()) {
            const ch = iterator.next();
            if (!identStarted && (ch === _WSB || ch === _TAB || ch === _NL)) {
                continue;
            }
            if (this.isIdentPart(ch)) {
                identStarted = true;
                ident = String.fromCharCode(ch) + ident;
            } else if (identStarted) {
                return ident;
            }
        }
        return ident;
    }
}
