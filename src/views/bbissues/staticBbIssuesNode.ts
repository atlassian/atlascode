import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { SimpleNode } from '../nodes/simpleNode';

export class StaticBitbucketIssuesNode extends AbstractBaseNode {
    private _children: AbstractBaseNode[] | undefined = undefined;
    private collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

    constructor(
        private site: BitbucketSite,
        private issueKeys: string[],
    ) {
        super();
        this.collapsibleState =
            issueKeys.length > 1 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded;
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(vscode.l10n.t('Related Bitbucket issues'), this.collapsibleState);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            const bbApi = await clientForSite(this.site);
            let issues = await bbApi.issues?.getIssuesForKeys(this.site, this.issueKeys);
            if (!issues || issues.length === 0) {
                return [new SimpleNode(vscode.l10n.t('No issues found'))];
            }
            this._children = issues.map(
                (i) =>
                    new SimpleNode(`#${i.data.id} ${i.data.title!}`, {
                        command: Commands.ShowBitbucketIssue,
                        title: vscode.l10n.t('Open bitbucket issue'),
                        arguments: [i],
                    }),
            );
        }
        return this._children;
    }
}
