import * as vscode from 'vscode';

import { ProductJira } from '../../atlclients/authInfo';
import { extractIssueKeys } from '../../bitbucket/issueKeysExtractor';
import { Comment, Commit, PullRequest } from '../../bitbucket/model';
import { Container } from '../../container';
import { StaticIssuesNode } from '../jira/staticIssuesNode';
import { AbstractBaseNode } from './abstractBaseNode';
import { IssueNode } from './issueNode';

export class RelatedIssuesNode extends AbstractBaseNode {
    private _delegate: StaticIssuesNode | undefined;

    private constructor() {
        super();
    }

    public static async create(
        pr: PullRequest,
        commits: Commit[],
        allComments: Comment[],
    ): Promise<AbstractBaseNode | undefined> {
        // TODO: [VSCODE-503] handle related issues across cloud/server
        if (
            !Container.siteManager.productHasAtLeastOneSite(ProductJira) ||
            !Container.config.bitbucket.explorer.relatedJiraIssues.enabled
        ) {
            return undefined;
        }

        // [mmura] TODO is this broken now? or at least it should migrate to a simpler logic
        const issueKeys = await extractIssueKeys(pr, commits, allComments);
        if (issueKeys.length > 0) {
            const node = new RelatedIssuesNode();
            node._delegate = new StaticIssuesNode(issueKeys, 'Related Jira issues');
            await node._delegate.updateJqlEntry();
            return node;
        }
        return undefined;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        return this._delegate!.getTreeItem();
    }

    getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return this._delegate!.getChildren(element);
    }
}
