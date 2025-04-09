import path from 'path';
import * as vscode from 'vscode';
import { FileStatus } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { Resources } from '../../resources';
import { DiffViewArgs } from '../pullrequest/diffViewHelper';
import { PullRequestContextValue } from '../pullrequest/pullRequestNode';
import { AbstractBaseNode } from './abstractBaseNode';
import { Container } from '../../container';
import { Logger } from 'src/logger';

export class PullRequestFilesNode extends AbstractBaseNode {
    constructor(
        private diffViewData: DiffViewArgs,
        private section: 'files' | 'commits' = 'files',
        private commitHash?: string, // Add this for commit-specific files
    ) {
        super();
    }

    // Get unique identifier for this file
    get fileId(): string {
        const prUrl = this.diffViewData.fileDisplayData.prUrl;
        const prUrlPath = vscode.Uri.parse(prUrl).path;
        const prId = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);
        const repoUrl = prUrl.slice(0, prUrl.indexOf('/pull-requests'));
        const repoId = repoUrl.slice(repoUrl.lastIndexOf('/') + 1);
        const fileName = this.diffViewData.fileDisplayData.fileDisplayName;
        // Include section and commit hash in the ID if it's in the commits section
        const sectionPart = this.section === 'commits' ? `-commit-${this.commitHash || 'unknown'}` : '';
        Logger.debug('FILE ID', `repo-${repoId}-pr-${prId}${sectionPart}-section-${this.section}-file-${fileName}`);
        return `repo-${repoId}-pr-${prId}${sectionPart}-section-${this.section}-file-${fileName}`;
    }

    // Use the Container's checkbox manager
    get checked(): boolean {
        return Container.checkboxStateManager.isChecked(this.fileId);
    }

    set checked(value: boolean) {
        Container.checkboxStateManager.setChecked(this.fileId, value);
    }

    get getDiffViewData(): DiffViewArgs {
        return this.diffViewData;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const itemData = this.diffViewData.fileDisplayData;
        let fileDisplayString = itemData.fileDisplayName;
        if (configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled')) {
            fileDisplayString = path.basename(itemData.fileDisplayName);
        }

        const item = new vscode.TreeItem(
            `${itemData.numberOfComments > 0 ? '💬 ' : ''}${fileDisplayString}`,
            vscode.TreeItemCollapsibleState.None,
        );

        // Set checkbox state based on persisted state
        item.checkboxState = this.checked
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;

        // Set unique id for the tree item
        item.id = this.fileId;

        item.tooltip = itemData.fileDisplayName;
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: this.diffViewData.diffArgs,
        };

        item.contextValue = `${PullRequestContextValue}${this.checked ? '.checked' : ''}`;
        item.resourceUri = vscode.Uri.parse(`${itemData.prUrl}#chg-${itemData.fileDisplayName}`);

        switch (itemData.fileDiffStatus) {
            case FileStatus.ADDED:
                item.iconPath = Resources.icons.get('add-circle');
                break;
            case FileStatus.DELETED:
                item.iconPath = Resources.icons.get('delete');
                break;
            case FileStatus.CONFLICT:
                item.iconPath = Resources.icons.get('warning');
                break;
            default:
                item.iconPath = Resources.icons.get('edit');
                break;
        }

        if (this.diffViewData.fileDisplayData.isConflicted) {
            item.iconPath = Resources.icons.get('warning');
        }

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
