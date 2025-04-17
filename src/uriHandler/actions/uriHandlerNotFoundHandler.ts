import { Uri } from 'vscode';

import { ExtensionId } from '../../constants';
import { BasicUriHandler } from './basicUriHandler';

/**
 * Handler for URIs for which we don't have a specific handler.
 */
export class UriHandlerNotFoundHandler extends BasicUriHandler {
    constructor() {
        super('', () => Promise.reject());
    }

    override isAccepted(uri: Uri): boolean {
        return true;
    }

    override getSource(uri: Uri): string {
        return 'unknown';
    }

    override getTarget(uri: Uri): string {
        const index = uri.path.indexOf(ExtensionId);
        if (index === -1) {
            return uri.path;
        }

        return uri.path.substring(index + ExtensionId.length + 1);
    }
}
