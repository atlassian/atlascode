import { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
// import curlirize from 'axios-curlirize';
import { parse } from 'url';
import * as vscode from 'vscode';

import { Logger } from '../logger';

// interface CurlResult {
//     command: string;
//     object: any;
// }
export function addCurlLogging(transport: AxiosInstance): void {
    dumpEverythingIntoFile(transport);
    // curlirize(transport, (result: CurlResult, err: any) => {
    //     let { command } = result;
    //     command = command.replace('-H "Accept-Encoding:gzip, deflate" ', '');
    //     if (!err) {
    //         Logger.debug('-'.repeat(70));
    //         Logger.debug(command);
    //         Logger.debug('-'.repeat(70));
    //     }
    // });
}

export function dumpEverythingIntoFile(transport: AxiosInstance): void {
    // get vscode workspace folder
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        Logger.warn('No workspace root found. Cannot create call map file.');
        return;
    }
    const callMapFile = path.join(workspaceRoot, 'atlascodeCalls.json');

    transport.interceptors.response.use(
        (config) => {
            if (!fs.existsSync(callMapFile)) {
                fs.writeFileSync(callMapFile, JSON.stringify({}));
            }

            try {
                const fileContent = fs.readFileSync(callMapFile, 'utf8');
                const jsonContent = JSON.parse(fileContent);

                const url = config.request.path
                    .split('?')[0]
                    .replace(/[0-9a-fA-F-]{36}\//g, 'dummy-uuid/')
                    .replace(/[0-9a-fA-F-]{36}-/g, 'dummy-uuid-');
                const method = config.request.method;
                const headers = config.headers;
                const data = config.data;

                jsonContent[url] = {
                    method,
                    headers,
                    data,
                };

                fs.writeFileSync(callMapFile, JSON.stringify(jsonContent, null, 2));
            } catch (error) {
                console.error('Error reading or writing file:', error);
            }

            return config;
        },
        (error) => {
            // Do something with request error
            return Promise.reject(error);
        },
    );
    transport.interceptors.response.use(
        function (response) {
            Logger.debug('Response:', response);
            return response;
        },
        function (error) {
            // Do something with response error
            return Promise.reject(error);
        },
    );
}

/*
 * Jira has changed how to access avatars and attachements but doesn't trust themselves to not send the wrong URL.
 * https://community.developer.atlassian.com/t/updated-uris-for-avatars-attachments-and-attachment-thumbnails/53483
 */
export function rewriteSecureImageRequests(transport: AxiosInstance): void {
    transport.interceptors.request.use(
        function (config) {
            if (config.url?.includes('secure/attachment') || config.url?.includes('secure/thumbnail')) {
                config.url = urlForAttachmentAndThumbnail(config.url);
            } else if (config.url?.includes('secure/viewavatar') || config.url?.includes('secure/projectavatar')) {
                config.url = urlForAvatar(config.url);
            }
            return config;
        },
        function (error) {
            // Do something with request error
            return Promise.reject(error);
        },
    );
}

function urlForAttachmentAndThumbnail(url: string): string {
    Logger.debug(`re-writing url: ${url}`);
    const components = url.split('/');
    const imgType = components[7];
    const newPathComponent = imgType === 'attachment' ? 'content' : 'thumbnail';
    const fileId = components[8];
    if (!fileId) {
        Logger.warn(`Can't re-write image URL: ${url}`);
        return url;
    }
    const baseUrl = components.slice(0, 6).join('/');
    const newUrl = `${baseUrl}/rest/api/2/attachment/${newPathComponent}/${fileId}`;
    Logger.debug(`url is now ${newUrl}`);
    return newUrl;
}

function urlForAvatar(url: string): string {
    Logger.debug(`re-writing url: ${url}`);
    const urlComponents = parse(url, true);
    const query = urlComponents.query;
    const avatarId = query['avatarId'];
    const pathname = urlComponents.pathname;
    const imgType = pathname?.split('/')[2];
    if (!imgType) {
        Logger.warn(`Can't re-write image URL: ${url}`);
        return url;
    }
    const newPathComponent = imgType === 'viewavatar' ? 'issuetype' : 'project';
    const newUrl = `${urlComponents.protocol}//${urlComponents.host}/rest/api/3/universal_avatar/view/type/${newPathComponent}/avatar/${avatarId}`;
    Logger.debug(`url is now ${newUrl}`);
    return newUrl;
}
