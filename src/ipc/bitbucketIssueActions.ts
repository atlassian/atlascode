import { BitbucketIssue } from '../bitbucket/model';
import { Action } from './messaging';

export interface CopyBitbucketIssueLink extends Action {
    action: 'copyBitbucketIssueLink';
}

export interface OpenBitbucketIssueAction extends Action {
    action: 'openBitbucketIssue';
    issue: BitbucketIssue;
}

export function isOpenBitbucketIssueAction(a: Action): a is OpenBitbucketIssueAction {
    return (<OpenBitbucketIssueAction>a).issue !== undefined;
}
