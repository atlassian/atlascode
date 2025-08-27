import { MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';

export const MAX_RESULTS = 100;

export async function issuesForJQL(jql: string, site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> {
    const client = await Container.clientManager.jiraClient(site);
    let issues: MinimalIssue<DetailedSiteInfo>[] = [];
    const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);
    const fields = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicFieldInfo);

    let index = 0;
    let total = 0;
    do {
        const res = await client.searchForIssuesUsingJqlGet(jql, fields, MAX_RESULTS, index);
        const searchResults = await readSearchResults(res, site, epicFieldInfo);
        // While Cloud will let us fetch 100 at a time it's possible server instances will be configured
        // with a lower maximum, so update the index to reflect what's actually being returned.
        index += searchResults.issues.length;
        issues = issues.concat(searchResults.issues);
        total = searchResults.total;
    } while (Container.config.jira.explorer.fetchAllQueryResults && index < total);
    if (issues.length > 0) {
        Container.jiraSettingsManager.getIssueLinkTypes(site);
        const currCache: string[] = [];
        for (let i = 0; i < issues.length; i++) {
            const projectKey = issues[i].key.substring(0, issues[i].key.indexOf('-'));
            if (!currCache.includes(projectKey)) {
                Container.jiraSettingsManager.getIssueCreateMetadata(projectKey, site);
                currCache.push(projectKey);
            }
        }
    }
    return issues;
}
