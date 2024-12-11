import { Uri } from 'vscode';
import { UriHandlerAction } from '../uriHandlerAction';

/**
 * Use a deep link to trigger a callback
 *
 * Expected link:
 * vscode://atlassian.atlascode/[uriSuffix]
 *
 * Query params:
 * - none
 */
export class SimpleCallbackAction implements UriHandlerAction {
    constructor(
        private uriSuffix: string,
        private callback: () => Promise<void>,
    ) {}

    isAccepted(uri: Uri): boolean {
        return uri.path.endsWith(this.uriSuffix);
    }

    async handle(uri: Uri): Promise<void> {
        return await this.callback();
    }
}
