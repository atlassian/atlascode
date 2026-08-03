import { isMinimalIssue, MinimalIssue } from '@atlassian-pi/jira-pi-common-models';
import { Command, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { JQLEntry } from '../../../config/model';
import { Commands } from '../../../constants';
import { Container } from '../../../container';
import { issuesForJQL } from '../../../jira/issuesForJql';
import { Logger } from '../../../logger';
import { AbstractBaseNode } from '../../../views/nodes/abstractBaseNode';

export function createLabelItem(label: string, command?: Command): TreeItem {
    const item = new TreeItem(label);
    item.resourceUri = Uri.parse(label);
    item.command = command;
    return item;
}

export interface TreeViewIssue extends MinimalIssue<DetailedSiteInfo> {
    source: { id: string };
    children: TreeViewIssue[];
}

const _failedJqlSiteIds = new Set<string>();

export function clearFailedJqlSites(): void {
    _failedJqlSiteIds.clear();
}

const _failedDevInfoSiteIds = new Set<string>();

export function clearFailedDevInfoSites(): void {
    _failedDevInfoSiteIds.clear();
}

export function isFailedDevInfoSite(siteId: string): boolean {
    return _failedDevInfoSiteIds.has(siteId);
}

export function markFailedDevInfoSite(siteId: string): void {
    _failedDevInfoSiteIds.add(siteId);
}

export function is401Error(e: unknown): boolean {
    return (e as any)?.response?.status === 401;
}

export function isExpectedAuthError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalizedMessage = message.toLowerCase();
    const expectedAuthErrorMessages = ['site previously failed authentication', 'please sign in again to continue'];

    return expectedAuthErrorMessages.some((expectedMessage) => normalizedMessage.includes(expectedMessage));
}

/** This function returns a Promise that never rejects. */
export async function executeJqlQuery(jqlEntry: JQLEntry): Promise<TreeViewIssue[]> {
    try {
        if (jqlEntry) {
            if (_failedJqlSiteIds.has(jqlEntry.siteId)) {
                return [];
            }

            const trimmedQuery = jqlEntry.query.trim();
            const hasOperator = /(=|!=|<|>|<=|>=|~|!~|\b(IN|NOT\s+IN|IS|IS\s+NOT|AND|OR)\b)/i.test(trimmedQuery);
            if (!hasOperator) {
                Logger.warn(
                    'Skipping JQL query execution: query appears incomplete (no operators found)',
                    jqlEntry.siteId,
                    jqlEntry.id,
                    trimmedQuery,
                );
                return [];
            }

            const jqlSite = Container.siteManager.getSiteForId(ProductJira, jqlEntry.siteId);
            if (jqlSite) {
                const issues = (await issuesForJQL(jqlEntry.query, jqlSite)) as TreeViewIssue[];

                issues.forEach((i) => {
                    i.source = jqlEntry;
                    i.children = [];
                });

                return issues;
            }
        }
    } catch (e) {
        if (is401Error(e)) {
            _failedJqlSiteIds.add(jqlEntry.siteId);
            // 401 is silently suppressed - site is now blocked until auth changes
        } else if (isExpectedAuthError(e)) {
            const message = e instanceof Error ? e.message : String(e);
            Logger.warn('Failed to execute default JQL query for site', jqlEntry.siteId, message);
        } else {
            Logger.error(e as Error, 'Failed to execute default JQL query for site', jqlEntry.siteId);
        }
    }

    return [];
}

export function getJiraIssueUri(issue: MinimalIssue<DetailedSiteInfo>): Uri {
    return Uri.parse(`${issue.siteDetails.baseLinkUrl}/browse/${issue.key}`);
}

export const loginToJiraMessageNode = createLabelItem('Please login to Jira', {
    command: Commands.JiraLogin,
    title: 'Login to Jira',
});

export class JiraIssueNode extends TreeItem implements AbstractBaseNode {
    private children: JiraIssueNode[];

    constructor(
        nodeType: JiraIssueNode.NodeType,
        public issue: TreeViewIssue,
    ) {
        const collapsibleState = issue.children.length
            ? TreeItemCollapsibleState.Expanded
            : TreeItemCollapsibleState.None;
        super(issue.key, collapsibleState);

        // this id is constructed to ensure unique values for the same jira issue across multiple jql queries.
        // therefore, multiple jql entries must have a unique id for the same site.
        this.id = `${issue.key}_${issue.siteDetails.id}_${issue.source.id}`;

        const summary = isMinimalIssue(issue) && issue.isEpic ? issue.epicName : issue.summary;
        this.description = `${summary} | ${issue.status.name}`;
        this.command = { command: Commands.ShowIssue, title: 'Show Issue', arguments: [issue] };
        this.iconPath = Uri.parse(issue.issuetype.iconUrl);
        this.contextValue = nodeType;
        this.tooltip = `${issue.key} - ${issue.summary}\n\n${issue.priority.name}    |    ${issue.status.name}`;
        this.resourceUri = getJiraIssueUri(issue);
        this.children = issue.children.map((x) => new JiraIssueNode(nodeType, x));
    }

    getTreeItem(): Promise<TreeItem> | TreeItem {
        return this;
    }

    getChildren(): Promise<JiraIssueNode[]> {
        return Promise.resolve(this.children);
    }

    dispose(): void {}
}

export namespace JiraIssueNode {
    export enum NodeType {
        JiraAssignedIssuesNode = 'assignedJiraIssue',
        CustomJqlQueriesNode = 'jiraIssue',
        RelatedJiraIssueInBitbucketPR = 'relatedJiraIssueBB',
    }
}
