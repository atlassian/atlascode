import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';

export interface SidebarIssue extends MinimalIssue<DetailedSiteInfo> {
    fields: {
        assignee?: {
            accountId: string | null;
            _updateTimestamp?: number;
        };
    };
}
