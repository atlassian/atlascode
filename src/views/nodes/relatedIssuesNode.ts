import * as vscode from 'vscode';
import { AbstractBaseNode } from './abstractBaseNode';
import { StaticIssuesNode } from '../jira/staticIssuesNode';
import { IssueNode } from './issueNode';
import { PullRequest } from '../../bitbucket/model';
import { Container } from '../../container';
import { extractIssueKeys } from '../../bitbucket/issueKeysExtractor';
import { OAuthProvider } from '../../atlclients/authInfo';

export class RelatedIssuesNode extends AbstractBaseNode {
    private _delegate: StaticIssuesNode;

    private constructor() {
        super();
    }

    public static async create(pr: PullRequest, commits: Bitbucket.Schema.Commit[], allComments: Bitbucket.Schema.Comment[]): Promise<AbstractBaseNode | undefined> {
        if (!await Container.authManager.isProductAuthenticatedticated(OAuthProvider.JiraCloud) || !Container.config.bitbucket.explorer.relatedJiraIssues.enabled) {
            return undefined;
        }
        const issueKeys = await extractIssueKeys(pr, commits, allComments);
        if (issueKeys.length > 0) {
            const node = new RelatedIssuesNode();
            node._delegate = new StaticIssuesNode(issueKeys, 'Related Jira issues');
            return node;
        }
        return undefined;
    }

    getTreeItem(): vscode.TreeItem {
        return this._delegate.getTreeItem();
    }
    getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return this._delegate.getChildren(element);
    }
}