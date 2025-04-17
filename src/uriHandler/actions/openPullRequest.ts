import { Uri, window } from 'vscode';

import { CheckoutHelper } from '../../bitbucket/interfaces';
import { Logger } from '../../logger';
import { BasicUriHandler } from './basicUriHandler';

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
export class OpenPullRequestUriHandler extends BasicUriHandler {
    constructor(private bitbucketHelper: CheckoutHelper) {
        super('openPullRequest', (uri) => this.customHandle(uri));
    }

    private async customHandle(uri: Uri): Promise<void> {
        const query = new URLSearchParams(uri.query);
        const prUrl = decodeURIComponent(query.get('q') || '');
        if (!prUrl) {
            throw new Error(`Cannot parse pull request URL from: ${query}`);
        }

        const { repoUrl, prId } = this.parsePrUrl(prUrl);

        try {
            await this.bitbucketHelper.pullRequest(repoUrl, prId);
        } catch (e) {
            Logger.debug('error opening pull request:', e);
            window.showErrorMessage('Error opening pull request (check log for details)');
            throw e;
        }
    }

    // TODO: this feels very sketchy. Redo in a follow-up using a proper URL parser and some regex?
    private parsePrUrl(url: string): { repoUrl: string; prId: number } {
        const prIndex = url.indexOf('/pull-requests');
        if (prIndex === -1) {
            throw new Error(`Cannot parse repository's URL: ${url}`);
        }

        const repoUrl = url.slice(0, prIndex);
        const prUrlPath = Uri.parse(url).path;
        const prIdRaw = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);

        const prId = parseInt(prIdRaw);
        if (isNaN(prId)) {
            throw new Error(`Cannot parse repository's URL: ${url}`);
        }

        return { repoUrl, prId };
    }
}
