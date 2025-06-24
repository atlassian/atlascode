import { ChildProcess, spawn } from 'child_process';
import { Disposable, ExtensionContext, window, workspace } from 'vscode';

import { rovodevInfo } from '../constants';

export const isRovoDevEnabled = true;

// In-memory process map (not persisted, but safe for per-window usage)
const workspaceProcessMap: { [workspacePath: string]: ChildProcess } = {};

let disposables: Disposable[] = [];

export function initializeRovoDevProcessManager(context: ExtensionContext) {
    // Listen for workspace folder changes
    const listener = workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.added.length > 0) {
            showWorkspaceLoadedMessageAndStartProcess(context);
        }
        if (event.removed.length > 0) {
            showWorkspaceClosedMessageAndStopProcess(event.removed);
        }
    });

    context.subscriptions.push(listener);
    disposables.push(listener);

    showWorkspaceLoadedMessageAndStartProcess(context);
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
function startWorkspaceProcess(context: ExtensionContext, workspacePath: string, port: number) {
    stopWorkspaceProcess(workspacePath);
    const rovoDevPath = workspace.getConfiguration('atlascode.rovodev').get<string>('executablePath') || undefined;
    const userEmail = workspace.getConfiguration('atlascode.rovodev').get<string>('email') || undefined;
    const authToken = workspace.getConfiguration('atlascode.rovodev').get<string>('apiKey') || undefined;
    if (!rovoDevPath || !userEmail || !authToken) {
        window.showErrorMessage('Environment variables is not set for Rovo Dev. Cannot start the process.');
        return;
    }
    // Use 'yes' as a dummy process, replace with your real service as needed
    const proc = spawn(rovoDevPath, [`serve`, `${port}`], {
        cwd: workspacePath,
        stdio: 'ignore', // Don't clutter output
        detached: true,
        env: {
            // pass vars one  by one
            USER_EMAIL: userEmail,
            USER_API_TOKEN: authToken,
        },
    });

    proc.on('exit', (code, signal) => {
        window.showErrorMessage(
            `Process for workspace ${workspacePath} exited unexpectedly with code ${code} and signal ${signal}`,
        );
        delete workspaceProcessMap[workspacePath];
    });

    workspaceProcessMap[workspacePath] = proc;
}

function showWorkspaceLoadedMessageAndStartProcess(context: ExtensionContext) {
    const folders = workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        window.showInformationMessage('No workspace folders loaded.');
        return;
    }

    const globalPort = process.env[rovodevInfo.envVars.port];
    if (globalPort) {
        window.showInformationMessage(`Expecting RovoDev on port ${globalPort}. No new process started.`);
    } else {
        for (const folder of folders) {
            const port = getOrAssignPortForWorkspace(context, folder.uri.fsPath);
            window.showInformationMessage(`Workspace loaded: ${folder.name} (port ${port})`);
            startWorkspaceProcess(context, folder.uri.fsPath, port);
        }
    }
}

function showWorkspaceClosedMessageAndStopProcess(
    removedFolders: readonly { uri: { fsPath: string }; name: string }[],
) {
    for (const folder of removedFolders) {
        stopWorkspaceProcess(folder.uri.fsPath);
        window.showInformationMessage(`Workspace closed: ${folder.name}`);
    }
}

function showWorkspaceClosedMessage() {
    window.showInformationMessage('Workspace closed or extension deactivated.');
}
