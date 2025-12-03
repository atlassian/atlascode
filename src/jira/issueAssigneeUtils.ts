import { MinimalIssue, User } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';

interface JiraIssueResponse {
    issues: {
        key: string;
        fields: {
            assignee: User;
        };
    }[];
}

export function collectAssigneesFromResponse(response: JiraIssueResponse, assigneeMap: Map<string, User>): void {
    if (!response?.issues) {
        return;
    }
    for (const issue of response.issues) {
        const assignee = issue.fields?.assignee;
        if (issue.key && assignee) {
            assigneeMap.set(issue.key, issue.fields.assignee);
        }
    }
}

export function attachAssigneesToIssues(
    issues: MinimalIssue<DetailedSiteInfo>[],
    assigneeMap: Map<string, User>,
): MinimalIssue<DetailedSiteInfo>[] {
    return issues.map((issue) => {
        const assignee = assigneeMap.get(issue.key);
        if (assignee) {
            (issue as MinimalIssue<DetailedSiteInfo> & { assignee: User }).assignee = assignee;
        }
        return issue;
    });
}
