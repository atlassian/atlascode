import { ChildProcess, spawn } from 'child_process';
import { access, constants } from 'fs';
import fs from 'fs';
import path from 'path';
import { downloadAndUnzip } from 'src/util/downloadFile';
import { getFsPromise } from 'src/util/fsPromises';
import { Disposable, ExtensionContext, Uri, workspace, WorkspaceFolder } from 'vscode';

import { isBasicAuthInfo, ProductJira } from '../atlclients/authInfo';
import { rovodevInfo } from '../constants';
import { Container } from '../container';
import { RovoDevWebviewProvider } from './rovoDevWebviewProvider';

export const MIN_SUPPORTED_ROVODEV_VERSION = '0.10.4';

function GetRovoDevURIs(context: ExtensionContext) {
    const extensionPath = context.storageUri!.fsPath;
    const rovoDevBaseDir = path.join(extensionPath, 'atlascode-rovodev-bin');
    const rovoDevVersionDir = path.join(rovoDevBaseDir, MIN_SUPPORTED_ROVODEV_VERSION);
    const rovoDevBinPath = path.join(rovoDevVersionDir, 'atlassian_cli_rovodev');

    const platform = process.platform;
    const arch = process.arch;
    let rovoDevZipUrl = undefined;

    if (platform === 'win32' || platform === 'linux' || platform === 'darwin') {
        const platformDir = platform === 'win32' ? 'windows' : platform;
        if (arch === 'x64' || arch === 'arm64') {
            const archDir = arch === 'x64' ? 'amd64' : arch;
            const version = MIN_SUPPORTED_ROVODEV_VERSION;
            rovoDevZipUrl = Uri.parse(
                `https://acli.atlassian.com/plugins/rovodev/${platformDir}/${archDir}/${version}/rovodev.zip`,
            );
        }
    }

    return {
        RovoDevBaseDir: rovoDevBaseDir,
        RovoDevVersionDir: rovoDevVersionDir,
        RovoDevBinPath: rovoDevBinPath,
        RovoDevZipUrl: rovoDevZipUrl,
    };
}

type RovoDevURIs = ReturnType<typeof GetRovoDevURIs>;

// In-memory process map (not persisted, but safe for per-window usage)
const workspaceProcessMap: { [workspacePath: string]: ChildProcess } = {};

let disposables: Disposable[] = [];

// Reference to the RovoDev webview provider for sending errors to chat
// This is ensured to be initialized before the entrypoint `initializeRovoDevProcessManager` is invoked.
let rovoDevWebviewProvider: RovoDevWebviewProvider;

export function setRovoDevWebviewProvider(provider: any) {
    rovoDevWebviewProvider = provider;
}

async function downloadBinaryThenInitialize(context: ExtensionContext, rovoDevURIs: RovoDevURIs) {
    const baseDir = rovoDevURIs.RovoDevBaseDir;
    const versionDir = rovoDevURIs.RovoDevVersionDir;
    const zipUrl = rovoDevURIs.RovoDevZipUrl;

    if (!zipUrl) {
        rovoDevWebviewProvider.signalRovoDevDisabled();
        rovoDevWebviewProvider.sendErrorToChat(
            `Rovo Dev is not supported for the following platform/architecture: ${process.platform}/${process.arch}`,
        );
        return;
    }

    try {
        if (fs.existsSync(baseDir)) {
            await getFsPromise((callback) => fs.rm(baseDir, { recursive: true, force: true }, callback));
        }

        const onProgressChange = (downloadedBytes: number, totalBytes: number | undefined) => {
            if (totalBytes) {
                rovoDevWebviewProvider.signalDownloadProgress(downloadedBytes, totalBytes);
            }
        };

        await downloadAndUnzip(zipUrl, baseDir, versionDir, true, onProgressChange);

        await getFsPromise((callback) => fs.mkdir(versionDir, { recursive: true }, callback));
    } catch (error) {
        const message = `Unable to update Rovo Dev:\n${error.message}\n\nTo try again, please close VS Code and reopen it.`;
        rovoDevWebviewProvider.signalRovoDevDisabled();
        rovoDevWebviewProvider.sendErrorToChat(message);
        throw error;
    }

    rovoDevWebviewProvider.signalBinaryDownloadEnded();

    initializeRovoDevProcessManager(context);
}

export function initializeRovoDevProcessManager(context: ExtensionContext) {
    const rovoDevURIs = GetRovoDevURIs(context);

    if (!fs.existsSync(rovoDevURIs.RovoDevBinPath)) {
        rovoDevWebviewProvider.signalBinaryDownloadStarted();
        downloadBinaryThenInitialize(context, rovoDevURIs);
        return;
    }

    // Listen for workspace folder changes
    const listener = workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.added.length > 0) {
            showWorkspaceLoadedMessageAndStartProcess(event.added, context, rovoDevURIs);
        }
        if (event.removed.length > 0) {
            showWorkspaceClosedMessageAndStopProcess(event.removed);
        }
    });

    context.subscriptions.push(listener);
    disposables.push(listener);

    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
        showWorkspaceLoadedMessageAndStartProcess(workspace.workspaceFolders, context, rovoDevURIs);
    }
}

export function deactivateRovoDevProcessManager() {
    for (const obj of disposables) {
        obj.dispose();
    }
    disposables = [];

    // On deactivate, stop all workspace processes
    if (workspace.workspaceFolders) {
        for (const folder of workspace.workspaceFolders) {
            stopWorkspaceProcess(folder.uri.fsPath);
        }
    }

    showWorkspaceClosedMessage();
}

// Helper to get a unique port for a workspace
function getOrAssignPortForWorkspace(context: ExtensionContext, workspacePath: string): number {
    const mapping = context.globalState.get<{ [key: string]: number }>(rovodevInfo.mappingKey) || {};
    if (mapping[workspacePath]) {
        return mapping[workspacePath];
    }
    // Find an unused port
    const usedPorts = new Set(Object.values(mapping));
    let port = rovodevInfo.portRange.start;
    while (usedPorts.has(port) && port <= rovodevInfo.portRange.end) {
        port++;
    }
    mapping[workspacePath] = port;
    context.globalState.update(rovodevInfo.mappingKey, mapping);
    return port;
}

// Helper to stop a process by terminal name
function stopWorkspaceProcess(workspacePath: string) {
    const proc = workspaceProcessMap[workspacePath];
    if (proc) {
        proc.kill();
        delete workspaceProcessMap[workspacePath];
    }
}

// Helper to start the background process
function startWorkspaceProcess(workspacePath: string, port: number, rovoDevURIs: RovoDevURIs) {
    stopWorkspaceProcess(workspacePath);

    access(rovoDevURIs.RovoDevBinPath, constants.X_OK, (err) => {
        if (err) {
            rovoDevWebviewProvider.sendErrorToChat(`Executable not found at path: ${rovoDevURIs.RovoDevBinPath}`);
            return;
        }

        getCloudCredentials().then((creds) => {
            const defaultUsername = 'cooluser@atlassian.com';
            const { username, key, host } = creds || {};

            if (host) {
                console.log(`Rovo Dev: using cloud credentials for ${username} on ${host}`);
            } else {
                console.log('Rovo Dev: No cloud credentials found. Using default authentication.');
            }

            const env: NodeJS.ProcessEnv = {
                USER: process.env.USER,
                USER_EMAIL: username || defaultUsername,
                ...(key ? { USER_API_TOKEN: key } : {}),
            };
            let stderrData = '';

            const proc = spawn(rovoDevURIs.RovoDevBinPath, [`serve`, `${port}`, `--application-id`, `vscode`], {
                cwd: workspacePath,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: true,
                env,
            })
                .on('spawn', () => rovoDevWebviewProvider.signalProcessStarted())
                .on('exit', (code, signal) => {
                    if (code !== 0) {
                        let errorMsg: string;
                        if (stderrData.includes('auth token')) {
                            errorMsg = `Please login by providing an API Token. You can do this via Atlassian: Open Settings -> Authentication -> Other Options`;
                        } else {
                            // default error message
                            errorMsg = `Process exited with code ${code}, see the log for details.`;
                        }

                        rovoDevWebviewProvider.sendErrorToChat(errorMsg);

                        console.error(`Process exited with code ${code} and signal ${signal}, stderr: ${stderrData}`);
                    }
                    delete workspaceProcessMap[workspacePath];
                });

            if (proc.stderr) {
                proc.stderr.on('data', (data) => {
                    stderrData += data.toString();
                });
            }

            workspaceProcessMap[workspacePath] = proc;
        });
    });
}

function showWorkspaceLoadedMessageAndStartProcess(
    folders: readonly WorkspaceFolder[],
    context: ExtensionContext,
    rovoDevURIs: RovoDevURIs,
) {
    const globalPort = process.env[rovodevInfo.envVars.port];
    if (globalPort) {
        if (!process.env.ROVODEV_BBY) {
            console.log(`Rovo Dev: Expecting Rovo Dev on port ${globalPort}. No new process started.`);
        }
        return;
    }

    for (const folder of folders) {
        const port = getOrAssignPortForWorkspace(context, folder.uri.fsPath);
        console.log(`Rovo Dev: Workspace loaded: ${folder.name} (port ${port})`);
        startWorkspaceProcess(folder.uri.fsPath, port, rovoDevURIs);
    }
}

function showWorkspaceClosedMessageAndStopProcess(
    removedFolders: readonly { uri: { fsPath: string }; name: string }[],
) {
    for (const folder of removedFolders) {
        stopWorkspaceProcess(folder.uri.fsPath);
        console.log(`Rovo Dev: Workspace closed: ${folder.name}`);
    }
}

function showWorkspaceClosedMessage() {
    console.log('Rovo Dev: Workspace closed or extension deactivated.');
}

/**
 * Placeholder implementation for Rovo Dev CLI credential storage
 */
async function getCloudCredentials(): Promise<{ username: string; key: string; host: string } | undefined> {
    const sites = Container.siteManager.getSitesAvailable(ProductJira);

    const promises = sites.map(async (site) => {
        if (!site.isCloud) {
            return undefined;
        }

        if (!site.host.endsWith('.atlassian.net')) {
            return undefined;
        }

        const authInfo = await Container.credentialManager.getAuthInfo(sites[0]);
        if (!isBasicAuthInfo(authInfo)) {
            return undefined;
        }

        return {
            username: authInfo.username,
            key: authInfo.password,
            host: site.host,
        };
    });

    const results = (await Promise.all(promises)).filter((result) => result !== undefined);
    return results.length > 0 ? results[0] : undefined;
}
