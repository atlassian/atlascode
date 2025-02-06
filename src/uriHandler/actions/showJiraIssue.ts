import { Uri, window } from 'vscode';
import { UriHandlerAction } from '../uriHandlerAction';
import { Logger } from '../../logger';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { showIssue } from '../../commands/jira/showIssue';
import { JiraIssueFetcher } from './util/jiraIssueFetcher';
import * as vscode from 'vscode';

/**
 * Use a deep link to show a Jira issue
 *
 * Expected link:
 * vscode://atlassian.atlascode/showJiraIssue?site=...&issueKey=...
 *
 * Query params:
 * - `site`: the site base URL, like `https://site.atlassian.net`
 * - `issueKey`: the issue key, like `PROJ-123`
 */
export class ShowJiraIssueUriHandlerAction implements UriHandlerAction {
    constructor(
        private analyticsApi: AnalyticsApi,
        private issueFetcher: JiraIssueFetcher,
    ) {}

    isAccepted(uri: Uri): boolean {
        return uri.path.endsWith('showJiraIssue');
    }

    async handle(uri: Uri) {
        const query = new URLSearchParams(uri.query);
        const siteBaseURL = query.get('site');
        const issueKey = query.get('issueKey');

        if (!siteBaseURL || !issueKey) {
            throw new Error(`Cannot parse request URL from: ${query}`);
        }

        try {
            const issue = await this.issueFetcher.fetchIssue(issueKey, siteBaseURL);
            showIssue(issue);
            this.analyticsApi.fireDeepLinkEvent(decodeURIComponent(query.get('source') || 'unknown'), 'showJiraIssue');
        } catch (e) {
            Logger.debug('error opening issue page:', e);
            window.showErrorMessage(vscode.l10n.t('Error opening issue page (check log for details)'));
        }
    }
}
