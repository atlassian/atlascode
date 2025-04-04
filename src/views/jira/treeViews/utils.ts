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

export interface TreeViewIssue extends MinimalIssue<DetailedSiteInfo> {
    jqlSource: JQLEntry;
    children: TreeViewIssue[];
}

/** This function returns a Promise that never rejects. */
export async function executeJqlQuery(jqlEntry: JQLEntry): Promise<TreeViewIssue[]> {
    try {
        if (jqlEntry) {
            const jqlSite = Container.siteManager.getSiteForId(ProductJira, jqlEntry.siteId);
            if (jqlSite) {
                const issues = (await issuesForJQL(jqlEntry.query, jqlSite)) as TreeViewIssue[];

                issues.forEach((i) => {
                    i.jqlSource = jqlEntry;
                    i.children = [];
                });

                return issues;
            }
        }
    } catch (e) {
        Logger.error(new Error(`Failed to execute default JQL query for site "${jqlEntry.siteId}": ${e}`));
    }

    return [];
}

export const loginToJiraMessageNode = createLabelItem('Please login to Jira', {
    command: Commands.ShowConfigPage,
    title: 'Login to Jira',
    arguments: [ProductJira],
});

/** Takes only the last group of the UUID if it's a real UUID. Otherwise, it returns the input as is. */
function anonymizeUUID(uuid: string) {
    // checks if the string is really a UUID, faster than a regex
    if (uuid.length === 36 && uuid[8] === '-' && uuid[13] === '-' && uuid[18] === '-' && uuid[23] === '-') {
        return uuid.substring(24);
    }
    return uuid;
}

export class JiraIssueNode extends TreeItem {
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
        //
        // we anonymize the UUID taking just a segment of it, so it can't be considered PII.
        this.id = `atlascode_${issue.key}_${anonymizeUUID(issue.siteDetails.id)}_${anonymizeUUID(issue.jqlSource.id)}`;

        this.description = isMinimalIssue(issue) && issue.isEpic ? issue.epicName : issue.summary;
        this.command = { command: Commands.ShowIssue, title: 'Show Issue', arguments: [issue] };
        this.iconPath = Uri.parse(issue.issuetype.iconUrl);
        this.contextValue = this.getIssueContextValue(nodeType, issue);
        this.tooltip = `${issue.key} - ${issue.summary}\n\n${issue.priority.name}    |    ${issue.status.name}`;
        this.resourceUri = Uri.parse(`${issue.siteDetails.baseLinkUrl}/browse/${issue.key}`);

        this.children = issue.children.map((x) => new JiraIssueNode(nodeType, x));
    }

    private getIssueContextValue(nodeType: JiraIssueNode.NodeType, issue: MinimalIssue<DetailedSiteInfo>): string {
        const TO_DO_ISSUE_POSTFIX = '_todo';
        const IN_PROGRESS_ISSUE_POSTFIX = '_inProgress';
        const DONE_ISSUE_POSTFIX = '_done';

        const statusCategory = issue.status.statusCategory.name;
        switch (statusCategory.toLowerCase()) {
            case 'to do':
                return nodeType + TO_DO_ISSUE_POSTFIX;
            case 'in progress':
                return nodeType + IN_PROGRESS_ISSUE_POSTFIX;
            case 'done':
                return nodeType + DONE_ISSUE_POSTFIX;
            default:
                return nodeType;
        }
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
