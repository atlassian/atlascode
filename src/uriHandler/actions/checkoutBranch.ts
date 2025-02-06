import { Uri, window } from 'vscode';
import { isAcceptedBySuffix, UriHandlerAction } from '../uriHandlerAction';
import { CheckoutHelper } from '../../bitbucket/interfaces';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { Logger } from '../../logger';
import * as vscode from 'vscode';

/**
 * Use a deep link to checkout a branch
 *
 * Expected link:
 * `vscode://atlassian.atlascode/checkoutBranch?cloneUrl=...&ref=...&refType=...`
 *
 * Query params:
 * - `cloneUrl`: the clone URL of the repository
 * - `ref`: the ref to check out
 * - `refType`: the type of ref to check out
 * - `sourceCloneUrl`: (optional) the clone URL of the source repository (for branches originating from a forked repo)
 */
export class CheckoutBranchUriHandlerAction implements UriHandlerAction {
    constructor(
        private bitbucketHelper: CheckoutHelper,
        private analyticsApi: AnalyticsApi,
    ) {}

    isAccepted(uri: Uri): boolean {
        return isAcceptedBySuffix(uri, 'checkoutBranch');
    }

    async handle(uri: Uri) {
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
            window.showErrorMessage(vscode.l10n.t('Error checkout out branch (check log for details)'));
        }
    }
}
