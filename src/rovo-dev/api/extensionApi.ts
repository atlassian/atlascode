import { isMinimalIssue, MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { SearchJiraHelper } from 'src/views/jira/searchJiraHelper';

export class JiraApi {
    public getSites = (): DetailedSiteInfo[] => {
        return Container.siteManager.getSitesAvailable(ProductJira);
    };

    public fetchWorkItems = async (site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> => {
        // Fetch from cache first
        let assignedIssuesForSite = this.fetchWorkItemsFromCache(site);
        if (assignedIssuesForSite.length === 0) {
            assignedIssuesForSite = await this.fetchWorkItemsFromApi(site);
        }
        return assignedIssuesForSite;
    };

    private fetchWorkItemsFromCache(site: DetailedSiteInfo) {
        const issues = SearchJiraHelper.getAssignedIssuesPerSite(site.id);
        return issues.filter((issue) => isMinimalIssue(issue));
    }

    private async fetchWorkItemsFromApi(site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const jql = 'assignee = currentUser() AND StatusCategory = "To Do" ORDER BY updated DESC';

        const client = await Container.clientManager.jiraClient(site);
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);
        const fields = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicFieldInfo);

        const res = await client.searchForIssuesUsingJqlGet(jql, fields, 30, 0);
        const searchResults = await readSearchResults(res, site, epicFieldInfo);
        return searchResults.issues.filter((issue) => isMinimalIssue(issue));
    }
}

/**
 * This class defines what rovodev needs from the rest of the extension
 */
export class ExtensionApi {
    public readonly analytics = {
        sendTrackEvent: async (event: any) => {
            await Container.analyticsClient.sendTrackEvent(event);
        },
    };

    public readonly metadata = {
        isDebugging: (): boolean => {
            return Container.isDebugging;
        },
        isBoysenberry: (): boolean => {
            return Container.isBoysenberryMode;
        },
        isRovoDevEnabled: (): boolean => {
            return Container.isRovoDevEnabled;
        },
        version: (): string => {
            return Container.version;
        },
        appInstanceId: (): string => {
            return Container.appInstanceId;
        },
    };

    public readonly config = {
        isDebugPanelEnabled: (): boolean => {
            return Container.config.rovodev.debugPanelEnabled;
        },
        isThinkingBlockEnabled: (): boolean => {
            return Container.config.rovodev.thinkingBlockEnabled;
        },
    };

    public readonly auth = {
        // TODO delete?
        getPrimarySite: (): DetailedSiteInfo | undefined => {
            return Container.siteManager.primarySite;
        },
        // TODO delete?
        getAuthInfoForSite: async (site: DetailedSiteInfo) => {
            return Container.credentialManager.getAuthInfo(site);
        },

        getPrimaryAuthInfo: async () => {
            const primarySite = Container.siteManager.primarySite;
            if (primarySite) {
                return Container.credentialManager.getAuthInfo(primarySite);
            }
            return undefined;
        },

        validateJiraCredentials: async (site: DetailedSiteInfo): Promise<boolean> => {
            try {
                await Container.clientManager.jiraClient(site);
                return true;
            } catch {
                return false;
            }
        },
    };

    public readonly jira = new JiraApi();
}
