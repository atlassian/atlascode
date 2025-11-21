import { Action } from './messaging';

export interface OpenPullRequest extends Action {
    action: 'openPullRequest';
    prHref: string;
}

export function isOpenPullRequest(a: Action): a is OpenPullRequest {
    return (<OpenPullRequest>a).action === 'openPullRequest';
}

export interface OpenExternalUrl extends Action {
    action: 'openExternalUrl';
    url: string;
}

export function isOpenExternalUrl(a: Action): a is OpenExternalUrl {
    return (<OpenExternalUrl>a).action === 'openExternalUrl';
}
