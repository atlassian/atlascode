import * as path from 'path';
import slash from 'slash';
import * as vscode from 'vscode';

import { sourceLinkCopiedEvent } from '../../analytics';
import { Container } from '../../container';
import { CommandBase } from './command-base';

export class CopySourceLinkCommand extends CommandBase {
    private contextUri?: vscode.Uri;

    public setContextUri(uri?: vscode.Uri): void {
        this.contextUri = uri;
    }

    protected async execute(): Promise<void> {
        const backend = await this.getBackend();
        const remote = await backend.findBitbucketSite();

        // Try to get file path from context URI if available (from explorer), otherwise from editor
        let filePath: string;
        if (this.contextUri) {
            // Invoked from explorer context menu
            filePath = slash(path.relative(backend.root, this.contextUri.fsPath));
        } else {
            // Invoked from editor or command palette
            filePath = this.getFilePath(backend.root);
        }

        // Detect the repository's main branch (master or main)
        const branch = await backend.findMainBranch();
        const url = remote.getSourceUrl(branch, filePath, []);

        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage(`Source link copied to clipboard`);

        sourceLinkCopiedEvent().then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    }
}
