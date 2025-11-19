import { MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Container } from 'src/container';

import { QuickPickUser } from './QuickPickUtils';

export class JiraIssueService {
    static async getAssignedIssuesFromAllSites(
        users: readonly QuickPickUser[],
        sites: DetailedSiteInfo[],
        hasCurrentUser: boolean,
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const issuesPromises = sites.map((site) => this.fetchIssues(users, site, hasCurrentUser));
        const issues = await Promise.all(issuesPromises);
        return this.getUniqueIssues(issues.flat());
    }

    private static getUniqueIssues(issues: MinimalIssue<DetailedSiteInfo>[]): MinimalIssue<DetailedSiteInfo>[] {
        const uniqueIssues = new Map<string, MinimalIssue<DetailedSiteInfo>>();
        for (const issue of issues) {
            if (issue.key) {
                uniqueIssues.set(issue.key, issue);
            }
        }
        return Array.from(uniqueIssues.values());
    }

    private static async fetchIssues(
        users: readonly QuickPickUser[],
        site: DetailedSiteInfo,
        hasCurrentUser: boolean,
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        try {
            return await this.getAssignedIssuesFromSite(users, site, hasCurrentUser);
        } catch (err) {
            console.error(`Failed to fetch issues from ${site.host}:`, err);
            return [];
        }
    }

    private static buildJQLConditions(users: readonly QuickPickUser[], hasCurrentUser: boolean): string[] {
        const conditions: string[] = [];

        if (users.length > 0) {
            const userAccountIds = users.map((u) => u.user?.accountId).filter((id): id is string => id !== null);
            if (userAccountIds.length > 0) {
                conditions.push(`assignee in (${userAccountIds.map((id) => `"${id}"`).join(', ')})`);
            }
        }

        if (hasCurrentUser) {
            conditions.push('assignee = currentUser()');
        }

        return conditions;
    }

    static async getAssignedIssuesFromSite(
        users: readonly QuickPickUser[],
        site: DetailedSiteInfo,
        hasCurrentUser: boolean,
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        try {
            const jqlConditions = this.buildJQLConditions(users, hasCurrentUser);

            if (jqlConditions.length === 0) {
                return [];
            }

            const jql = `(${jqlConditions.join(' OR ')}) AND StatusCategory != Done ORDER BY updated DESC`;

            const client = await Container.clientManager.jiraClient(site);
            const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);
            const fields = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicFieldInfo);

            const allIssues: MinimalIssue<DetailedSiteInfo>[] = [];
            const assigneeMap = new Map<string, any>();
            const MAX_RESULTS = 100;
            let startAt = 0;
            let isLast = false;

            do {
                const response = await client.searchForIssuesUsingJqlGet(jql, fields, MAX_RESULTS, startAt);
                const searchResults = await readSearchResults(response, site, epicFieldInfo);

                this.collectAssigneesFromResponse(response, assigneeMap);
                allIssues.push(...searchResults.issues);

                const issuesCount = searchResults.issues.length;
                startAt += issuesCount;

                isLast = (response as any)?.isLast ?? (issuesCount === 0 || issuesCount < MAX_RESULTS);
            } while (!isLast);

            return this.attachAssigneesToIssues(allIssues, assigneeMap);
        } catch (siteError) {
            console.error(`Error fetching issues from site ${site.name}: ${siteError}`);
            return [];
        }
    }

    private static collectAssigneesFromResponse(response: any, assigneeMap: Map<string, any>): void {
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

    private static attachAssigneesToIssues(
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
}
