import * as path from "path";
import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

export default class BslQuickOpen extends AbstractProvider {
    public quickOpen() {
        vscode.window.showQuickPick(this.listOpen()).then((item) => {
            if (!item) {
                console.log("canceled pick");
                return;
            }
            let file = item.description;
            if (file.startsWith(".")) {
                file = path.join(this._global.getRootPath(), file);
            }
            vscode.workspace.openTextDocument(file).then((doc) => {
                console.log("openTextDocument success", doc.fileName);
                vscode.window.showTextDocument(doc);
            });
        }
        );
    }

    private async listOpen(): Promise<vscode.QuickPickItem[]> {
        const result: vscode.QuickPickItem[] = [];
        const querystring = {
            module: {
                $regex: new RegExp(".*", "i")
            }
        };
        let firstproject: string = "";
        const search = await this._global.dbmodules.chain().find(querystring).simplesort("module").data();
        search.forEach((value, index, array) => {
        let locLabel: string = String(value.module);
        if (!this._global.toreplaced[value.parenttype]) {
            locLabel = locLabel.replace(value.parenttype + ".", "");
        }
        switch (value.type) {
            case "ObjectModule":
                locLabel = locLabel + ".МодульОбъекта";
                break;
            case "ManagerModule":
                locLabel = locLabel + ".МодульМенеджера";
                break;
            case "CommandModule":
                locLabel = locLabel + ".МодульКоманды";
                break;
            case "CommonModule":
                locLabel = locLabel;
                break;
            case "FormModule":
                locLabel = locLabel + ".МодульФормы";
                break;
            case "RecordSetModule":
                locLabel = locLabel + ".МодульНабораЗаписей";
                break;
            case "ValueManagerModule":
                locLabel = locLabel + ".МодульМенеджераЗначений";
            default:
                break;
        }
        let fullpath: string = String(value.fullpath);
        if (fullpath.startsWith(this._global.getRootPath())) {
            fullpath = fullpath.replace(this._global.getRootPath(), ".");
        }
        const newPick: vscode.QuickPickItem = {
            label: locLabel,
            description: fullpath
        };
        if (firstproject.length === 0) {
            firstproject = value.project;
        } else if (firstproject !== value.project) {
            newPick.detail = value.project;
        }
        result.push(newPick);
        });
        return result;
    }
}
