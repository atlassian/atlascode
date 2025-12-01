import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';

export function collectAssigneesFromResponse(response: any, assigneeMap: Map<string, any>): void {
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
    assigneeMap: Map<string, any>,
): MinimalIssue<DetailedSiteInfo>[] {
    return issues.map((issue) => {
        const assignee = assigneeMap.get(issue.key);
        if (assignee) {
            (issue as any).assignee = assignee;
        }
        return issue;
    });
}
