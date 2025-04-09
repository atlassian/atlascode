import { env } from 'process';
import { CheckoutHelper } from 'src/bitbucket/interfaces';
import { Disposable, Uri, UriHandler, window } from 'vscode';

import { Container } from '../container';
import { AnalyticsApi } from '../lib/analyticsApi';
import { Logger } from '../logger';

const ExtensionId = 'atlassian.atlascode';

export const SETTINGS_URL = `${env.uriScheme}://${ExtensionId}/openSettings`;
export const ONBOARDING_URL = `${env.uriScheme}://${ExtensionId}/openOnboarding`;

/**
 * AtlascodeUriHandler handles URIs of the format <scheme>://atlassian.atlascode/<path and query params>
 * where scheme can be vscode or vscode-insiders depending on which version the user is running
 *
 * Following URI paths are supported:
 * - openSettings: opens the extension's settings page
 * - openOnboarding: opens the onboarding webview
 * - openPullRequest: opens pull request based on the following query params (only supports Bitbucket Cloud)
 *      -- q: pull request URL (use encodeURIComponent to encode the URL)
 *      -- source: source from which the URI e.g. browser
 *      e.g. vscode://atlassian.atlascode/openPullRequest?q=https%3A%2F%2Fbitbucket.org%2Fatlassianlabs%2Fatlascode%2Fpull-requests%2F804&source=browser
 * - cloneRepository: opens pull request based on the following query params (only supports Bitbucket Cloud)
 *      -- q: repository URL (use encodeURIComponent to encode the URL)
 *      -- source: source from which the URI e.g. browser
 *      e.g. vscode://atlassian.atlascode/cloneRepository?q=https%3A%2F%2Fbitbucket.org%2Fatlassianlabs%2Fatlascode&source=browser
 *  - finalizeAuthentication:
 *  - startWorkOnJiraIssue:
 *  - checkoutBranch:
 *      -- cloneUrl: url of the repo from which to clone
 *      -- sourceCloneUrl: for forked repos, the url of the forked repo
 *      -- ref: name of branch or tag
 *      -- refType: branch|tag
 *      e.g. vscode://atlassian.atlascode/checkoutBranch?cloneUrl=git@bitbucket.org%3Aatlassianlabs%2Fatlascode.git&ref=VSCODE-1293-add-checkout-branch-deep-lin&refType=branch
 *      e.g. vscode://atlassian.atlascode/checkoutBranch?cloneUrl=git@bitbucket.org%3Aatlassianlabs%2Fatlascode.git&ref=2.7.0&refType=tag
 *      e.g. vscode://atlassian.atlascode/checkoutBranch?cloneUrl=git@bitbucket.org%3Aatlassianlabs%2Fatlascode.git&sourceCloneUrl=git@bitbucket.org%3Arundquist%2Fatlascode-fork-test.git&ref=VSCODE-1293-bravo&refType=branch
 *  - showJiraIssue:
 *      -- site: site for the jira issue
 *      -- issueKey: issue key to show
 *      e.g. vscode://atlassian.atlascode/showJiraIssue?site=https%3A%2F%2Fsome-test-site.atlassian.net&issueKey=VSCODE-1320
 */

export class LegacyAtlascodeUriHandler implements Disposable, UriHandler {
    private disposables: Disposable;

    constructor(
        private analyticsApi: AnalyticsApi,
        private bitbucketHelper: CheckoutHelper,
    ) {
        this.disposables = window.registerUriHandler(this);
    }

    async handleUri(uri: Uri) {
        if (uri.path.endsWith('openSettings')) {
            Container.settingsWebviewFactory.createOrShow();
        } else if (uri.path.endsWith('openOnboarding')) {
            Container.onboardingWebviewFactory.createOrShow();
        } else if (uri.path.endsWith('openPullRequest')) {
            await this.handlePullRequestUri(uri);
        } else if (uri.path.endsWith('cloneRepository')) {
            await this.handleCloneRepository(uri);
        } else if (uri.path.endsWith('checkoutBranch')) {
            await this.handleCheckoutBranch(uri);
        }
    }

    private async handleCheckoutBranch(uri: Uri) {
        const query = new URLSearchParams(uri.query);
        const cloneUrl = decodeURIComponent(query.get('cloneUrl') || '');
        const sourceCloneUrl = decodeURIComponent(query.get('sourceCloneUrl') || ''); //For branches originating from a forked repo
        const ref = query.get('ref');
        const refType = query.get('refType');
        if (!ref || !cloneUrl || !refType) {
            throw new Error(`Query params are missing data: ${query}`);
        }

        try {
            const success = await this.bitbucketHelper.checkoutRef(cloneUrl, ref, refType, sourceCloneUrl);

            if (success) {
                this.analyticsApi.fireDeepLinkEvent(
                    decodeURIComponent(query.get('source') || 'unknown'),
                    'checkoutBranch',
                );
            }
        } catch (e) {
            Logger.debug('error checkout out branch:', e);
            window.showErrorMessage('Error checkout out branch (check log for details)');
        }
    }

    private async handlePullRequestUri(uri: Uri) {
        try {
            const query = new URLSearchParams(uri.query);
            const prUrl = decodeURIComponent(query.get('q') || '');
            if (!prUrl) {
                throw new Error(`Cannot parse pull request URL from: ${query}`);
            }
            const repoUrl = prUrl.slice(0, prUrl.indexOf('/pull-requests'));
            const prUrlPath = Uri.parse(prUrl).path;
            const prId = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);

            await this.bitbucketHelper.pullRequest(repoUrl, parseInt(prId));
            this.analyticsApi.fireDeepLinkEvent(decodeURIComponent(query.get('source') || 'unknown'), 'pullRequest');
        } catch (e) {
            Logger.debug('error opening pull request:', e);
            window.showErrorMessage('Error opening pull request (check log for details)');
        }
    }

    private async handleCloneRepository(uri: Uri) {
        const query = new URLSearchParams(uri.query);
        const repoUrl = decodeURIComponent(query.get('q') || '');
        if (!repoUrl) {
            throw new Error(`Cannot parse clone URL from: ${query}`);
        }

        try {
            await this.bitbucketHelper.cloneRepository(repoUrl);
            this.analyticsApi.fireDeepLinkEvent(
                decodeURIComponent(query.get('source') || 'unknown'),
                'cloneRepository',
            );
        } catch (e) {
            Logger.debug('error cloning repository:', e);
            window.showErrorMessage('Error cloning repository (check log for details)');
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }
}
