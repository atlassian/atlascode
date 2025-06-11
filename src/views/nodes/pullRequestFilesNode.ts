import * as crypto from 'crypto';
import path from 'path';
import * as vscode from 'vscode';

import { FileStatus, PullRequest } from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { DiffViewArgs } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';

export class PullRequestFilesNode extends AbstractBaseNode {
    constructor(
        private diffViewData: DiffViewArgs,
        private section: 'files' | 'commits' = 'files',
        private pr: PullRequest,
        private commitHash?: string,
    ) {
        super();
    }

    get fileId(): string {
        const prUrl = this.pr.data.url;
        const repoUrl = prUrl.slice(0, prUrl.indexOf('/pull-requests'));
        const repoId = repoUrl.slice(repoUrl.lastIndexOf('/') + 1);

        const fileId =
            this.section === 'commits'
                ? `repo-${repoId}-pr-${this.pr.data.id}-section-${this.section}-commit-${this.commitHash}-file-${this.diffViewData.fileDisplayData.fileDisplayName}-${this.diffViewData.latestFileContentHash}`
                : `repo-${repoId}-pr-${this.pr.data.id}-section-${this.section}-file-${this.diffViewData.fileDisplayData.fileDisplayName}-${this.diffViewData.latestFileContentHash}`;
        return crypto.createHash('md5').update(fileId).digest('hex');
    }

    get checked(): boolean {
        return Container.checkboxStateManager.isChecked(this.fileId);
    }

    set checked(value: boolean) {
        Container.checkboxStateManager.setChecked(this.fileId, value);
    }

    createFileChangeUri(fileName: string, status: FileStatus, prUrl: string, hasComments: boolean): vscode.Uri {
        return vscode.Uri.parse(`${prUrl}/${fileName}`).with({
            scheme: 'pullRequest',
            query: JSON.stringify({
                status: status,
                hasComments: hasComments,
            }),
        });
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const itemData = this.diffViewData.fileDisplayData;
        let fileDisplayString = itemData.fileDisplayName;
        if (configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled')) {
            fileDisplayString = path.basename(itemData.fileDisplayName);
        }
        const item = new vscode.TreeItem(fileDisplayString, vscode.TreeItemCollapsibleState.None);

        item.checkboxState = this.checked
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
        item.id = this.fileId;

        item.tooltip = itemData.fileDisplayName;
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: this.diffViewData.diffArgs,
        };

        item.resourceUri = this.createFileChangeUri(
            itemData.fileDisplayName,
            itemData.fileDiffStatus,
            itemData.prUrl,
            itemData.numberOfComments > 0,
        );
        item.iconPath = undefined;

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
