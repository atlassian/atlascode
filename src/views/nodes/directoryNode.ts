import * as crypto from 'crypto';
import { PullRequest } from 'src/bitbucket/model';
import { Container } from 'src/container';
import * as vscode from 'vscode';

import { PRDirectory } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';
import { PullRequestFilesNode } from './pullRequestFilesNode';

export class DirectoryNode extends AbstractBaseNode {
    constructor(
        private directoryData: PRDirectory,
        private section: 'files' | 'commits' = 'files',
        private pr: PullRequest,
        private commitHash?: string,
    ) {
        super();
    }

    get directoryId(): string {
        const prUrl = this.pr.data.url;
        const prUrlPath = vscode.Uri.parse(prUrl).path;
        const prId = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);
        const repoUrl = prUrl.slice(0, prUrl.indexOf('/pull-requests'));
        const repoId = repoUrl.slice(repoUrl.lastIndexOf('/') + 1);
        const dirPath = this.directoryData.dirPath;

        const dirId =
            this.section === 'commits'
                ? `repo-${repoId}-pr-${prId}-section-${this.section}-commit-${this.commitHash}-directory-${dirPath}`
                : `repo-${repoId}-pr-${prId}-section-${this.section}-directory-${dirPath}`;
        return crypto.createHash('md5').update(dirId).digest('hex');
    }

    set checked(value: boolean) {
        Container.checkboxStateManager.setChecked(this.directoryId, value);
    }

    get checked(): boolean {
        return Container.checkboxStateManager.isChecked(this.directoryId);
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const item = new vscode.TreeItem(this.directoryData.name, vscode.TreeItemCollapsibleState.Expanded);
        item.tooltip = this.directoryData.name;
        item.checkboxState = this.checked
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;

        item.id = this.directoryId;
        return item;
    }

    async getChildren(): Promise<AbstractBaseNode[]> {
        const fileNodes: AbstractBaseNode[] = this.directoryData.files.map(
            (diffViewArg) => new PullRequestFilesNode(diffViewArg, this.section, this.pr),
        );
        const directoryNodes: DirectoryNode[] = Array.from(
            this.directoryData.subdirs.values(),
            (subdir) => new DirectoryNode(subdir, this.section, this.pr),
        );

        return [...directoryNodes, ...fileNodes];
    }
}
