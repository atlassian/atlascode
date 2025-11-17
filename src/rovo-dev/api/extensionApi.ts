import { isMinimalIssue, MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { AuthInfo, DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { ValidBasicAuthSiteData } from 'src/atlclients/clientManager';
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
        // TODO: rectify these 2 methods

        /**
         * Get valid credentials for the 1st available cloud site with an API token,
         * resolved alphabetically and with priority given to staging sites.
         *
         * ONLY returns sites with API token auth (not OAuth).
         * Validates that credentials actually work before returning.
         * Used primarily for Rovo Dev credential validation.
         *
         * @returns ValidBasicAuthSiteData with working API token credentials, or undefined
         */
        getCloudPrimaryAuthInfo: async (): Promise<ValidBasicAuthSiteData | undefined> => {
            return await Container.clientManager.getCloudPrimarySite();
        },

        /**
         * Get auth info from the "primary" site determined by siteManager.
         *
         * Returns the first cloud site alphabetically (with "hello" site prioritized for internal users).
         * Accepts ANY auth type (OAuth or API token).
         * Does NOT validate credentials.
         * Used for feature flags tenant ID and general-purpose primary site resolution.
         *
         * @returns AuthInfo for the primary site (any auth type), or undefined if no cloud sites
         */
        getPrimaryAuthInfo: async (): Promise<AuthInfo | undefined> => {
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
