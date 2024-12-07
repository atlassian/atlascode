import { Uri } from 'vscode';

export function isAcceptedBySuffix(uri: Uri, suffix: string): boolean {
    return uri.path.endsWith(suffix);
}

// Helper interface to route URIs to the correct action
export interface UriHandlerAction {
    // Return true if the URI is accepted by this action
    // In that case, handle() will be called, and the URI
    // will be considered handled by this action
    isAccepted(uri: Uri): boolean;

    // Handle the URI - put your logic here
    handle(uri: Uri): Promise<void>;
}
