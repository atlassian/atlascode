import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
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

/** This function returns a Promise that never rejects. */
export async function executeJqlQuery(jqlEntry: JQLEntry): Promise<TreeViewIssue[]> {
    try {
        if (jqlEntry) {
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
        Logger.error(e, 'Failed to execute default JQL query for site', jqlEntry.siteId);
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
