import * as vscode from 'vscode';
import { ProductBitbucket } from '../../atlclients/authInfo';
import { extractBitbucketIssueKeys } from '../../bitbucket/issueKeysExtractor';
import { Comment, Commit, PullRequest } from '../../bitbucket/model';
import { Container } from '../../container';
import { StaticBitbucketIssuesNode } from '../bbissues/staticBbIssuesNode';
import { AbstractBaseNode } from './abstractBaseNode';

export class RelatedBitbucketIssuesNode extends AbstractBaseNode {
    private _delegate: StaticBitbucketIssuesNode | undefined;

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
            !Container.siteManager.productHasAtLeastOneSite(ProductBitbucket) ||
            !Container.config.bitbucket.explorer.relatedBitbucketIssues.enabled
        ) {
            return undefined;
        }
        const issueKeys = await extractBitbucketIssueKeys(pr, commits, allComments);
        if (issueKeys.length > 0) {
            const node = new RelatedBitbucketIssuesNode();
            node._delegate = new StaticBitbucketIssuesNode(pr.site, issueKeys);
            return node;
        }
        return undefined;
    }

    getTreeItem(): vscode.TreeItem {
        return this._delegate!.getTreeItem();
    }

    getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return this._delegate!.getChildren(element);
    }
}
