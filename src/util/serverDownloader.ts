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
import * as extractZipWithCallback from "extract-zip";
import * as fs from "fs-extra";
import * as path from "path";
import * as requestPromise from "request-promise-native";
import * as semver from "semver";
import { promisify } from "util";
import { download } from "./downloadUtils";
import { IGitHubReleasesAPIResponse } from "./githubApi";
import { IStatus } from "./status";

const extractZip = promisify(extractZipWithCallback);

export interface IServerInfo {
    version: string;
    lastUpdate: number;
}

/**
 * Downloads language servers or debug adapters from GitHub releases.
 * The downloaded automatically manages versioning and downloads
 * updates if necessary.
 */
export class ServerDownloader {
    private displayName: string;
    private githubOrganization: string;
    private githubProjectName: string;
    private assetName: string;
    private installDir: string;
    private token: string;

    constructor(
        displayName: string,
        githubOrganization: string,
        githubProjectName: string,
        assetName: string,
        installDir: string,
        token: string
    ) {
        this.displayName = displayName;
        this.githubOrganization = githubOrganization;
        this.githubProjectName = githubProjectName;
        this.installDir = installDir;
        this.assetName = assetName;
        this.token = token;
    }

    public async downloadServerIfNeeded(status: IStatus): Promise<void> {
        const serverInfo = await this.installedServerInfo();
        const serverInfoOrDefault = serverInfo || {
            version: "0.0.0",
            lastUpdate: Number.MIN_SAFE_INTEGER
        };
        const secondsSinceLastUpdate = (Date.now() - serverInfoOrDefault.lastUpdate) / 1000;

        if (secondsSinceLastUpdate > 480) {
            // Only query GitHub API for latest version if some time has passed
            console.info(`Querying GitHub API for new ${this.displayName} version...`);
            let releaseInfo: IGitHubReleasesAPIResponse;

            try {
                releaseInfo = await this.latestReleaseInfo();
            } catch (error) {
                const message = `Could not fetch from GitHub releases API: ${error}.`;
                if (serverInfo == null) {
                    // No server is installed yet, so throw
                    throw new Error(message);
                } else {
                    // Do not throw since user might just be offline
                    // and a version of the server is already installed
                    console.warn(message);
                    return;
                }
            }

            const latestVersion = releaseInfo.tag_name;
            const installedVersion = serverInfoOrDefault.version;
            const serverNeedsUpdate = semver.gt(latestVersion, installedVersion);
            let newVersion = installedVersion;

            if (serverNeedsUpdate) {
                const serverAsset = releaseInfo.assets.find(asset => asset.name === this.assetName);
                if (serverAsset) {
                    const downloadUrl = serverAsset.browser_download_url;
                    await this.downloadServer(downloadUrl, latestVersion, status);
                } else {
                    throw new Error(
                        `Latest GitHub release for ${this.githubProjectName}` +
                            `does not contain the asset '${this.assetName}'!`
                    );
                }
                newVersion = latestVersion;
            }

            await this.updateInstalledServerInfo({
                version: newVersion,
                lastUpdate: Date.now()
            });
        }
    }

    private async latestReleaseInfo(): Promise<IGitHubReleasesAPIResponse> {
        const headers: any = { "User-Agent": "vsc-language-1c-bsl" };
        if (this.token) {
            headers.Authorization = `token ${this.token}`;
        }

        const rawJson = await requestPromise.get(
            `https://api.github.com/repos/${this.githubOrganization}/${this.githubProjectName}/releases/latest`,
            { headers }
        );
        return JSON.parse(rawJson) as IGitHubReleasesAPIResponse;
    }

    private serverInfoFile(): string {
        return path.join(this.installDir, "SERVER-INFO");
    }

    private async installedServerInfo(): Promise<IServerInfo> {
        try {
            const info = JSON.parse(
                (await fs.promises.readFile(this.serverInfoFile())).toString("utf8")
            ) as IServerInfo;
            return semver.valid(info.version) ? info : null;
        } catch {
            return null;
        }
    }

    private async updateInstalledServerInfo(info: IServerInfo): Promise<void> {
        await fs.promises.writeFile(this.serverInfoFile(), JSON.stringify(info), {
            encoding: "utf8"
        });
    }

    private async downloadServer(
        downloadUrl: string,
        version: string,
        status: IStatus
    ): Promise<void> {
        if (!(await fs.pathExists(this.installDir))) {
            await fs.promises.mkdir(this.installDir, { recursive: true });
        }

        const downloadDest = path.join(this.installDir, `download-${this.assetName}`);
        status.update(`Downloading ${this.displayName} ${version}...`);
        await download(downloadUrl, downloadDest, percent => {
            status.update(
                `Downloading ${this.displayName} ${version} :: ${(percent * 100).toFixed(2)} %`
            );
        });

        status.update(`Unpacking ${this.displayName} ${version}...`);
        await extractZip(downloadDest, { dir: this.installDir });
        await fs.promises.unlink(downloadDest);

        status.update(`Initializing ${this.displayName}...`);
    }
}
