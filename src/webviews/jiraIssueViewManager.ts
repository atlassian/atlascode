import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<MinimalIssue<DetailedSiteInfo>> {
    dataKey(data: MinimalIssue<DetailedSiteInfo>): string {
        return data.key;
    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }
}
