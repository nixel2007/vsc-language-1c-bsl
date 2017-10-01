import AbstractProvider from "./abstractProvider";
import * as path from "path";
import * as vscode from "vscode";


export default class BslQuickOpen extends AbstractProvider {
    public quickOpen() {
        vscode.window.showQuickPick(this.listOpen()).then(item => {
            if ( !item ) {
                console.log("canceled pick");
                return;
            }
            let file = item.description;
            if (file.startsWith(".")){
                file = path.join(this._global.getRootPath(), file);
            }
            vscode.workspace.openTextDocument(file).then(doc => {
                console.log("openTextDocument success", doc.fileName);
                vscode.window.showTextDocument(doc);
            });
        }
        );
    };

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
        let label: string = String(value.module);
        if ( !this._global.toreplaced[value.parenttype] ) {
            label = label.replace(value.parenttype + ".", "");
        }
        switch (value.type) {
            case "ObjectModule":
                label = label + ".МодульОбъекта";
                break;
            case "ManagerModule":
                label = label + ".МодульМенеджера";
                break;
            case "CommandModule":
                label = label + ".МодульКоманды";
                break;
            case "CommonModule":
                label = label;
                break;
            case "FormModule":
                label = label + ".МодульФормы";
                break;
            case "RecordSetModule":
                label = label + ".МодульНабораЗаписей";
                break;
            case "ValueManagerModule":
                label = label + ".МодульМенеджераЗначений"
            default:
                break;
        }
        let fullpath: string = String(value.fullpath);
        if (fullpath.startsWith(this._global.getRootPath())) {
            fullpath = fullpath.replace(this._global.getRootPath(), ".");
        }
        const newPick: vscode.QuickPickItem = {
            label: label,
            description: fullpath
        };
        if ( firstproject.length == 0 ){
            firstproject = value.project;
        } else if (firstproject !== value.project){
            newPick.detail = value.project;
        };
        result.push(newPick);
        });
        return result;
    }
}

