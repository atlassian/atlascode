import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { IssueNode } from '../../views/nodes/issueNode';
import { currentUserJira } from './currentUser';
import { Commands } from '../../commands';
import { commands } from 'vscode';

export async function assignIssue(param: MinimalIssue<DetailedSiteInfo> | IssueNode, accountId?: string) {
    const issue = isMinimalIssue(param) ? param : param.issue;
    const client = await Container.clientManager.jiraClient(issue.siteDetails);

    if (!accountId) {
        const me = await currentUserJira(issue.siteDetails);
        accountId = me ? me.accountId : undefined;
    }

    const response = await client.assignIssue(issue.id, accountId);
    Logger.info(response);

    commands.executeCommand(Commands.RefreshJiraExplorer);
    commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
    commands.executeCommand(Commands.RefreshCustomJqlExplorer);
}

export async function unassignIssue(issue: MinimalIssue<DetailedSiteInfo>) {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);

    const response = await client.assignIssue(issue.id, undefined);
    Logger.info(response);

    commands.executeCommand(Commands.RefreshJiraExplorer);
    commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
    commands.executeCommand(Commands.RefreshCustomJqlExplorer);
}
