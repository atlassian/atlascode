import { Uri } from 'vscode';

/**
 * Basic deep link handler.
 *
 * Expected link:
 * `vscode://atlassian.atlascode/<suffix>[?source=...]`
 *
 * Query params:
 * - `source`: (optional) the source of the deep link
 */
export class BasicUriHandler {
    constructor(
        protected readonly suffix: string,
        protected readonly callback: (uri: Uri) => Promise<void>,
    ) {}

    /** Return true if the URI is accepted by this action */
    public isAccepted(uri: Uri): boolean {
        return uri.path.endsWith('/' + this.suffix);
    }

    /** Invokes the handler for the specified uri */
    public handle(uri: Uri): Promise<void> {
        return this.callback(uri);
    }

    /** Gets the source information for the uri */
    public getSource(uri: Uri): string {
        const query = new URLSearchParams(uri.query);
        return decodeURIComponent(query.get('source') || 'unknown');
    }

    /** Gets the target information for the uri */
    public getTarget(uri: Uri): string {
        return this.suffix;
    }
}
