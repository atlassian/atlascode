import { Uri, window } from 'vscode';
import { UriHandlerAction } from '../uriHandlerAction';
import { startWorkOnIssue } from '../../commands/jira/startWorkOnIssue';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { Logger } from '../../logger';
import { JiraIssueFetcher } from './util/jiraIssueFetcher';
import * as vscode from 'vscode';

/**
 * Use a deep link to start work on a Jira issue
 *
 * Expected link:
 * vscode://atlassian.atlascode/startWorkOnJiraIssue?site=...&issueKey=...
 *
 * Query params:
 * - `site`: the site base URL, like `https://site.atlassian.net`
 * - `issueKey`: the issue key, like `PROJ-123`
 */
export class StartWorkUriHandlerAction implements UriHandlerAction {
    constructor(
        private analyticsApi: AnalyticsApi,
        private issueFetcher: JiraIssueFetcher,
    ) {}

    isAccepted(uri: Uri): boolean {
        return uri.path.endsWith('startWorkOnJiraIssue');
    }

    async handle(uri: Uri) {
        const query = new URLSearchParams(uri.query);
        const siteBaseURL = query.get('site');
        const issueKey = query.get('issueKey');
        // const aaid = query.get('aaid'); aaid is not currently used for anything is included in the url and may be useful to have in the future

        if (!siteBaseURL || !issueKey) {
            throw new Error(`Cannot parse request URL from: ${query}`);
        }

        try {
            const issue = await this.issueFetcher.fetchIssue(issueKey, siteBaseURL);
            startWorkOnIssue(issue);

            this.analyticsApi.fireDeepLinkEvent(
                decodeURIComponent(query.get('source') || 'unknown'),
                'startWorkOnJiraIssue',
            );
        } catch (e) {
            Logger.debug('error opening start work page:', e);
            window.showErrorMessage(vscode.l10n.t('Error opening start work page (check log for details)'));
        }
    }
}
