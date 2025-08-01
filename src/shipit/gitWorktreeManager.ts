import { window, workspace } from 'vscode';

import { Container } from '../container';
import { Logger } from '../logger';
import {
    getAllRovoDevServers,
    getOrAssignPortForWorkspace,
    getPortForWorkspace,
    startWorkspaceProcess,
    stopWorkspaceProcess,
} from '../rovo-dev/rovoDevProcessManager';
import { Shell } from '../util/shell';

export class GitWorktreeManager {
    public async createWorktree(customName?: string, customDirectory?: string): Promise<void> {
        try {
            // Get the current workspace folder
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                window.showErrorMessage('No workspace folder is open. Please open a folder first.');
                return;
            }

            const currentWorkspace = workspaceFolders[0];
            const workspaceRoot = currentWorkspace.uri.fsPath;

            // Check if current workspace is a Git repository
            const shell = new Shell(workspaceRoot);
            try {
                await shell.output('git', 'rev-parse', '--git-dir');
            } catch {
                window.showErrorMessage('Current workspace is not a Git repository.');
                return;
            }

            // Get worktree name from user or use custom name or generate timestamp
            let worktreeName: string;
            if (customName) {
                worktreeName = customName;
            } else {
                // Generate a timestamp-based worktree name
                const now = new Date();
                const timestamp = now
                    .toISOString()
                    .replace(/:/g, '-') // Replace colons with hyphens
                    .replace(/\./g, '-') // Replace dots with hyphens
                    .slice(0, 19); // Remove milliseconds and timezone (YYYY-MM-DDTHH-MM-SS)
                worktreeName = `worktree-${timestamp}`;
            }

            // Get parent directory for worktrees
            let parentDirPath: string;
            if (customDirectory) {
                parentDirPath = customDirectory;
            } else {
                // Generate default directory: ~/.worktrees/{reponame}
                const repoName = require('path').basename(workspaceRoot);
                const os = require('os');
                parentDirPath = `${os.homedir()}/.worktrees/${repoName}`;
            }

            const worktreePath = `${parentDirPath}/${worktreeName.trim()}`;

            // Create the worktree
            try {
                await shell.output('git', 'worktree', 'add', worktreePath);

                // Start RovoDev for the new worktree using existing process manager
                const port = getOrAssignPortForWorkspace(Container.context, worktreePath);
                startWorkspaceProcess(Container.context, worktreePath, port);
                Logger.info(`Started RovoDev for worktree ${worktreePath} on port ${port}`);

                window.showInformationMessage(`Git worktree created successfully at: ${worktreePath}`);
            } catch (error) {
                Logger.error(new Error(`Failed to create worktree: ${error}`));
                window.showErrorMessage(`Failed to create Git worktree: ${error}`);
                throw error; // Re-throw so the caller knows it failed
            }
        } catch (error) {
            Logger.error(new Error(`Error in createGitWorktree: ${error}`));
            window.showErrorMessage(`An error occurred while creating the Git worktree: ${error}`);
        }
    }

    public async listWorktrees(): Promise<string[]> {
        try {
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return [];
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const shell = new Shell(workspaceRoot);

            const output = await shell.output('git', 'worktree', 'list', '--porcelain');
            const worktrees: string[] = [];

            const lines = output.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('worktree ')) {
                    worktrees.push(line.substring(9)); // Remove 'worktree ' prefix
                }
            }

            return worktrees;
        } catch (error) {
            Logger.error(new Error(`Failed to list worktrees: ${error}`));
            return [];
        }
    }

    public async removeWorktree(worktreePath: string): Promise<boolean> {
        try {
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return false;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const shell = new Shell(workspaceRoot);

            // Stop RovoDev process for this worktree
            stopWorkspaceProcess(worktreePath);

            await shell.output('git', 'worktree', 'remove', worktreePath, '--force');
            return true;
        } catch (error) {
            Logger.error(new Error(`Failed to remove worktree: ${error}`));
            window.showErrorMessage(`Failed to remove Git worktree: ${error}`);
            return false;
        }
    }

    public getWorktreeRovoDevPort(worktreePath: string): number | undefined {
        return getPortForWorkspace(worktreePath);
    }

    public getAllRovoDevServers(): Array<{ path: string; port: number; type: 'workspace' | 'worktree' }> {
        return getAllRovoDevServers();
    }
}
