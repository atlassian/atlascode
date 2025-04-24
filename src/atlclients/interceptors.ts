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
    const callMapPath = path.join(workspaceRoot, 'atlascodeCalls');

    transport.interceptors.response.use(
        (config) => {
            try {
                // let's make a folder under callMapPath with the name of the host
                const hostFolder = path.join(callMapPath, `${config.request.host}`);
                if (!fs.existsSync(hostFolder)) {
                    fs.mkdirSync(hostFolder, { recursive: true });
                }

                const requestUrl = config.request.path
                    .split('?')[0]
                    .replace(/[0-9a-fA-F-]{36}\//g, '--BRUH--/')
                    .replace(/[0-9a-fA-F-]{36}-/g, '--BRUH--');
                const filename = requestUrl.replace(/\//g, '_').replace(/:/g, '_');

                const callMapFile = path.join(hostFolder, filename + '.json');

                const method = config.request.method;
                const headers = config.headers;
                const data = config.data;

                // Recursively traverse the response body and replace anything token-related
                const traverseAndReplace = (obj: any) => {
                    if (Array.isArray(obj) && obj.length > 0) {
                        obj.length = 1;
                        traverseAndReplace(obj[0]);
                    } else if (typeof obj === 'object' && obj !== null) {
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                if (key.includes('token')) {
                                    obj[key] = 'REDACTED';
                                } else {
                                    traverseAndReplace(obj[key]);
                                }
                            }
                        }
                    }
                };

                traverseAndReplace(data);

                const jsonContent = {
                    request: {
                        method,
                        urlPathPattern: requestUrl.replace(/--BRUH--/g, '[^/]+'),
                    },
                    response: {
                        transformers: ['response-template'],
                        status: config.status,
                        body: JSON.stringify(data),
                        headers: {
                            'content-type': headers['content-type'],
                        },
                    },
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
