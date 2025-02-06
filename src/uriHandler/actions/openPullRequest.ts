import { Uri, window } from 'vscode';
import { Logger } from '../../logger';
import { UriHandlerAction } from '../uriHandlerAction';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CheckoutHelper } from '../../bitbucket/interfaces';
import * as vscode from 'vscode';

/**
 * Use a deep link to open pull request
 *
 * Expected link:
 * `vscode://atlassian.atlascode/openPullRequest?q=...[&source=...]`
 *
 * Query params:
 * - `q`: the pull request URL
 * - `source`: (optional) the source of the deep link
 */
export class OpenPullRequestUriHandlerAction implements UriHandlerAction {
    constructor(
        private analyticsApi: AnalyticsApi,
        private bitbucketHelper: CheckoutHelper,
    ) {}

    isAccepted(uri: Uri): boolean {
        return uri.path.endsWith('openPullRequest');
    }

    async handle(uri: Uri) {
        const query = new URLSearchParams(uri.query);
        const source = decodeURIComponent(query.get('source') || 'unknown');
        const prUrl = decodeURIComponent(query.get('q') || '');
        const { repoUrl, prId } = this.parsePrUrl(prUrl);
        if (!prUrl) {
            throw new Error(`Cannot parse pull request URL from: ${query}`);
        }

        try {
            await this.bitbucketHelper.pullRequest(repoUrl, prId);
            this.analyticsApi.fireDeepLinkEvent(source, 'pullRequest');
        } catch (e) {
            Logger.debug('error opening pull request:', e);
            window.showErrorMessage(vscode.l10n.t('Error opening pull request (check log for details)'));
        }
    }

    parsePrUrl(url: string): { repoUrl: string; prId: number } {
        // TODO: this feels very sketchy. Redo in a follow-up using a proper URL parser and some regex?
        const repoUrl = url.slice(0, url.indexOf('/pull-requests'));
        const prUrlPath = Uri.parse(url).path;
        const prId = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);
        return { repoUrl, prId: parseInt(prId) };
    }
}
