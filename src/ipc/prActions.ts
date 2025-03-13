import { Action } from './messaging';

export interface OpenPullRequest extends Action {
    action: 'openPullRequest';
    prHref: string;
}

export function isOpenPullRequest(a: Action): a is OpenPullRequest {
    return (<OpenPullRequest>a).action === 'openPullRequest';
}
