import { Uri, window } from 'vscode';
import { isAcceptedBySuffix, UriHandlerAction } from '../uriHandlerAction';
import { CheckoutHelper } from '../../bitbucket/interfaces';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { Logger } from '../../logger';
import * as vscode from 'vscode';

/**
 * Use a deep link to clone a repository
 *
 * Expected link:
 * `vscode://atlassian.atlascode/cloneRepository?q=...`
 *
 * Query params:
 * - `q`: the clone URL of the repository
 */
export class CloneRepositoryUriHandlerAction implements UriHandlerAction {
    constructor(
        private bitbucketHelper: CheckoutHelper,
        private analyticsApi: AnalyticsApi,
    ) {}

    isAccepted(uri: Uri): boolean {
        return isAcceptedBySuffix(uri, 'cloneRepository');
    }

    async handle(uri: Uri) {
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
            window.showErrorMessage(vscode.l10n.t('Error cloning repository (check log for details)'));
        }
    }
}
