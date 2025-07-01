import { it } from '@jest/globals';
import { Uri } from 'vscode';

import { determineNotificationSource, NotificationSource } from './notificationSources';

describe('NotificationSource', () => {
    describe('determineNotificationSource', () => {
        it.each([
            ['https://jirasite.atlassian.net/browse/ABCD-70', NotificationSource.JiraIssue],
            ['https://jirasite.atlassian.net/browse/AA-2638', NotificationSource.JiraIssue],
            ['https://bitbucket.org/org-name/repo-name/pull-requests/3068', NotificationSource.BitbucketPullRequest],
            [
                'https://bitbucket.org/another-org-name/another-repo-name/pull-requests/1824',
                NotificationSource.BitbucketPullRequest,
            ],
            ['https://bitbucket.org/org/repo/pull-requests/1201/diff', NotificationSource.BitbucketPullRequestDiff],
        ])('determineNotificationSource correctly identifies the resource from its url', (uriString, source) => {
            // it works with both uri strings...
            expect(determineNotificationSource(uriString)).toBe(source);

            // ...and Uri instances
            const uri = Uri.parse(uriString);
            expect(determineNotificationSource(uri)).toBe(source);
        });
    });
});
