import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { JQLEntry } from '../../../config/model';
import { Container } from '../../../container';
import { Commands } from '../../../commands';
import { Logger } from '../../../logger';
import { issuesForJQL } from '../../../jira/issuesForJql';
import { TreeItem, TreeItemCollapsibleState, Command, Uri } from 'vscode';

export function createLabelItem(label: string, command?: Command): TreeItem {
    const item = new TreeItem(label);
    item.command = command;
    return item;
}

/** This function returns a Promise that never rejects. */
export async function executeJqlQuery(jqlEntry: JQLEntry): Promise<MinimalIssue<DetailedSiteInfo>[]> {
    try {
        if (jqlEntry) {
            const jqlSite = Container.siteManager.getSiteForId(ProductJira, jqlEntry.siteId);
            if (jqlSite) {
                const issues = await issuesForJQL(jqlEntry.query, jqlSite);

                // We already have everything that matches the JQL. The subtasks likely include things that
                // don't match the query so we get rid of them.
                issues.forEach((i) => {
                    i.subtasks = [];
                });

                return issues;
            }
        }
    } catch (e) {
        Logger.error(new Error(`Failed to execute default JQL query for site "${jqlEntry.siteId}": ${e}`));
    }

    return [];
}

export class JiraIssueNode extends TreeItem {
    private children: JiraIssueNode[];

    constructor(
        nodeType: JiraIssueNode.NodeType,
        public issue: MinimalIssue<DetailedSiteInfo>,
    ) {
        const collapsibleState = issue.subtasks.length
            ? TreeItemCollapsibleState.Expanded
            : TreeItemCollapsibleState.None;
        super(issue.key, collapsibleState);

        this.id = `${issue.key}_${issue.siteDetails.id}`;

        this.description = isMinimalIssue(issue) && issue.isEpic ? issue.epicName : issue.summary;
        this.command = { command: Commands.ShowIssue, title: 'Show Issue', arguments: [issue] };
        this.iconPath = Uri.parse(issue.issuetype.iconUrl);
        this.contextValue = nodeType;
        this.tooltip = `${issue.key} - ${issue.summary}\n\n${issue.priority.name}    |    ${issue.status.name}`;
        this.resourceUri = Uri.parse(`${issue.siteDetails.baseLinkUrl}/browse/${issue.key}`);

        this.children = issue.subtasks.map((x: MinimalIssue<DetailedSiteInfo>) => new JiraIssueNode(nodeType, x));
    }

    async getTreeItem(): Promise<any> {
        return {
            resourceUri: this.resourceUri,
        };
    }

    getChildren(): Promise<TreeItem[]> {
        return Promise.resolve(this.children);
    }
}

export namespace JiraIssueNode {
    export enum NodeType {
        JiraAssignedIssuesNode = 'assignedJiraIssue',
        CustomJqlQueriesNode = 'jiraIssue',
    }
}
