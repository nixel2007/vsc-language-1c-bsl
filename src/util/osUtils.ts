// Copied from https://github.com/fwcd/vscode-kotlin-ide and edited.
//
// Originaly licensed:
//
// The MIT License (MIT)
//
// Copyright (c) 2016 George Fraser
// Copyright (c) 2018 fwcd
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files(the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and / or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included
//  in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
export function isOSWindows(): boolean {
    return process.platform === "win32";
}

export function isOSUnixoid(): boolean {
    const platform = process.platform;
    return (
        platform === "linux" ||
        platform === "darwin" ||
        platform === "freebsd" ||
        platform === "openbsd"
    );
}

export function isOSUnix(): boolean {
    const platform = process.platform;
    return (
        platform === "linux" ||
        platform === "freebsd" ||
        platform === "openbsd"
    );
}

export function isOSMacOS(): boolean {
    return process.platform === "darwin";
}

export function correctBinname(binname: string): string {
    return binname + (process.platform === "win32" ? ".exe" : "");
}

export function correctScriptName(binname: string): string {
    return binname + (process.platform === "win32" ? ".bat" : "");
}
