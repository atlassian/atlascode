import { MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';

export const MAX_RESULTS = 100;

export async function issuesForJQL(jql: string, site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> {
    const client = await Container.clientManager.jiraClient(site);
    const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(site);
    const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);

    let index = 0;
    let total = 0;
    let issues: MinimalIssue<DetailedSiteInfo>[] = [];
    do {
        const res = await client.searchForIssuesUsingJqlGet(jql, fields, MAX_RESULTS, index);
        const searchResults = await readSearchResults(res, site, epicFieldInfo);
        // While Cloud will let us fetch 100 at a time it's possible server instances will be configured
        // with a lower maximum, so update the index to reflect what's actually being returned.
        index += searchResults.issues.length;
        issues = issues.concat(searchResults.issues);
        total = searchResults.total;
    } while (Container.config.jira.explorer.fetchAllQueryResults && index < total);
    return issues;
}
