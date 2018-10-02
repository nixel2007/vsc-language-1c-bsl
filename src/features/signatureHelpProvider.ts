// tslint:disable:variable-name
import {Position, SignatureHelp, SignatureHelpProvider,
    SignatureInformation, TextDocument} from "vscode";
import AbstractProvider from "./abstractProvider";
import BackwardIterator from "./backwardIterator";

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

export default class GlobalSignatureHelpProvider extends AbstractProvider implements SignatureHelpProvider {

    public provideSignatureHelp(document: TextDocument,
                                position: Position): Thenable<SignatureHelp> {

        return new Promise((resolve) => {
            const iterator = new BackwardIterator(document, position.character - 1, position.line);

            const paramCount = this.readArguments(iterator);
            if (paramCount < 0) {
                return resolve(undefined);
            }

            let ident = this.readIdent(iterator);
            if (!ident) {
                return resolve(undefined);
            }

            let entry = undefined;
            if (this._global.libClasses[ident.toLowerCase()]) {
                entry = this._global.libClasses[ident.toLowerCase()].constructors["По умолчанию"]; 
            } else if (this._global.globalfunctions[ident.toLowerCase()]) {
                entry = this._global.globalfunctions[ident.toLowerCase()];
            }
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
                    entries = this._global.getCacheLocal(ident, source, false);
                } else {
                    entries = this._global.query(ident, module, false, false);
                }
                if (!entry && entries.length === 0) {
                    return resolve(undefined);
                } else if (module.length === 0) {
                    entry = entries[0];
                    return resolve(this.GetSignature(entry, paramCount));
                } else {
                    for (const signatureElement of entries) {
                        const arrayFilename = signatureElement.filename.split("/");
                        if (!signatureElement.oscriptLib
                            && arrayFilename[arrayFilename.length - 4] !== "CommonModules"
                            && !signatureElement.filename.endsWith("ManagerModule.bsl")) {
                            continue;
                        }
                        if (signatureElement._method.IsExport) {
                            return resolve(this.GetSignature(signatureElement, paramCount));
                        }
                    }
                    return resolve(undefined);
                }
            }
            const signature = (!entry.signature) ? entry.oscript_signature : entry.signature;
            if (!signature) { return resolve(undefined); }
            const ret = new SignatureHelp();
            for (const element in signature) {
                const paramsString = signature[element].СтрокаПараметров;
                const signatureInfo = new SignatureInformation(entry.name + paramsString, "");

                const re = /([\wа-яА-Я]+)\??:\s+[а-яА-Я\w_\.\|]+/g;
                let match: RegExpExecArray = re.exec(paramsString);
                while (match) {
                    signatureInfo.parameters.push({
                        label: match[0],
                        documentation: signature[element].Параметры[match[1]]
                    });
                    match = re.exec(paramsString);
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

            const re = /((Знач )?[\wа-яА-Я]+)(:\s+[<а-яА-Я\w_\.>\|]+)?( = [^ :]+)?/g;
            let match: RegExpExecArray = re.exec(arraySignature.paramsString);
            while (match) {
                const documentationParam = this._global.GetDocParam(arraySignature.description, match[1]);
                signatureInfo.parameters.push({
                    label: match[0] + (documentationParam.optional ? "?" : ""),
                    documentation: documentationParam.descriptionParam
                });
                match = re.exec(arraySignature.paramsString);
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
