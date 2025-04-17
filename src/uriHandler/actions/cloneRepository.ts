import { Uri, window } from 'vscode';

import { CheckoutHelper } from '../../bitbucket/interfaces';
import { Logger } from '../../logger';
import { BasicUriHandler } from './basicUriHandler';

/**
 * Use a deep link to clone a repository
 *
 * Expected link:
 * `vscode://atlassian.atlascode/cloneRepository?q=...[&source=...]`
 *
 * Query params:
 * - `q`: the clone URL of the repository
 */
export class CloneRepositoryUriHandler extends BasicUriHandler {
    constructor(private bitbucketHelper: CheckoutHelper) {
        super('cloneRepository', (uri) => this.customHandle(uri));
    }

    private async customHandle(uri: Uri): Promise<void> {
        const query = new URLSearchParams(uri.query);
        const repoUrl = decodeURIComponent(query.get('q') || '');
        if (!repoUrl) {
            throw new Error(`Cannot parse clone URL from: ${query}`);
        }

        try {
            await this.bitbucketHelper.cloneRepository(repoUrl);
        } catch (e) {
            Logger.debug('error cloning repository:', e);
            window.showErrorMessage('Error cloning repository (check log for details)');
            throw e;
        }
    }
}
