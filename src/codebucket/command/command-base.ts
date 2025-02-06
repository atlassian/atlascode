import * as path from 'path';
import slash from 'slash';
import * as vscode from 'vscode';
import { Shell } from '../../util/shell';
import { FileDiffQueryParams } from '../../views/pullrequest/diffViewHelper';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { Backend } from '../backend/backend';

export abstract class CommandBase {
    /**
     * Run the command and handle any resulting errors
     */
    public async run(): Promise<void> {
        try {
            await this.execute();
        } catch (e) {
            if (e instanceof Error) {
                vscode.window.showInformationMessage(e.message);
            } else {
                // tslint:disable-next-line:no-console
                console.error(e);
                vscode.window.showErrorMessage(vscode.l10n.t('Encountered an unexpected error: {0}', e.message));
            }
        }
    }

    /**
     * Command implementation
     */
    protected abstract execute(): Promise<void>;

    /**
     * Get the backend (Git or Mercurial) for the current project.
     */
    protected async getBackend(): Promise<Backend> {
        const workingDirectory = this.getDirectory();
        const shell = new Shell(workingDirectory);
        for (const backend of [Backend]) {
            const { code, stdout } = await shell.exec(backend.root);
            if (code === 0) {
                return new backend(stdout.trim());
            }
        }
        throw new Error('Unable to find a Git/Hg repository');
    }

    /**
     * Get the open directory containing the current file.
     */
    protected getDirectory(): string {
        const editor = CommandBase.getOpenEditor();
        if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
            const queryParams = JSON.parse(editor.document.uri.query) as FileDiffQueryParams;
            return vscode.Uri.parse(queryParams.repoUri).fsPath;
        }
        return path.dirname(editor.document.fileName);
    }

    /**
     * Get the path to the current file, relative to the repository root.
     */
    protected getFilePath(root: string): string {
        const editor = CommandBase.getOpenEditor();
        if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
            const queryParams = JSON.parse(editor.document.uri.query) as FileDiffQueryParams;
            return queryParams.path;
        }
        return slash(path.relative(root, editor.document.fileName));
    }

    /**
     * Get the list of currently selected line ranges, in start:end format
     */
    protected getLineRanges(): string[] {
        const editor = CommandBase.getOpenEditor();
        return editor.selections.map((selection) => {
            // vscode provides 0-based line numbers but Bitbucket line numbers start with 1.
            return `${selection.start.line + 1}:${selection.end.line + 1}`;
        });
    }

    /**
     * Get the 1-based line number of the (first) currently selected line.
     */
    protected getCurrentLine(): number {
        const selection = CommandBase.getOpenEditor().selection;
        return selection.start.line + 1;
    }

    /**
     * Open a URL in the default browser.
     */
    protected openUrl(url: string): void {
        const uri = vscode.Uri.parse(url);
        vscode.env.openExternal(uri);
    }

    public static getOpenEditor(): vscode.TextEditor {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No open editor');
        }
        return editor;
    }
}
