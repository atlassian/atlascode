import { Uri } from 'vscode';

export const enum NotificationSource {
    Unknown = 'unknown',
    JiraIssue = 'atlascode.jira.issue',
    BitbucketPullRequestDiff = 'atlascode.bitbucket.pullRequestDiff',
    BitbucketPullRequest = 'atlascode.bitbucket.pullRequest',
    BitbucketTerminalUri = '',
    BitbucketPipeline = '',
}

export function determineNotificationSource(uri: Uri | string): NotificationSource {
    const uriString = uri.toString();

    if (/^https:\/\/[^.]+\.atlassian.net\/browse\//.test(uriString)) {
        return NotificationSource.JiraIssue;
    } else if (/^https:\/\/bitbucket.org\/[^/]+\/[^/]+\/pull-requests\/[^/]+\/diff$/.test(uriString)) {
        return NotificationSource.BitbucketPullRequestDiff;
    } else if (/^https:\/\/bitbucket.org\/[^/]+\/[^/]+\/pull-requests\//.test(uriString)) {
        return NotificationSource.BitbucketPullRequest;
    } else {
        return NotificationSource.Unknown;
    }
}
