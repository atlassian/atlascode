import { commands } from 'vscode';

export enum CommandContext {
    CustomJQLExplorer = 'atlascode:customJQLExplorerEnabled',
    AssignedIssueExplorer = 'atlascode:assignedIssueExplorerEnabled',
    BitbucketExplorer = 'atlascode:bitbucketExplorerEnabled',
    PipelineExplorer = 'atlascode:pipelineExplorerEnabled',
    BitbucketIssuesExplorer = 'atlascode:bitbucketIssuesExplorerEnabled',
    OpenIssuesTree = 'atlascode:openIssuesTreeEnabled',
    AssignedIssuesTree = 'atlascode:assignedIssuesTreeEnabled',
    JiraLoginTree = 'atlascode:jiraLoginTreeEnabled',
    IsJiraAuthenticated = 'atlascode:isJiraAuthenticated',
    IsBBAuthenticated = 'atlascode:isBBAuthenticated',
    RovoDevEnabled = 'atlascode:rovoDevEnabled',
    BbyEnvironmentActive = 'atlascode:bbyEnvironmentActive',
}

export function setCommandContext(key: CommandContext | string, value: any) {
    return commands.executeCommand('setContext', key, value);
}
