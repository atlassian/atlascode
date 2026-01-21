import { isMinimalIssue, MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { ValidBasicAuthSiteData } from 'src/atlclients/clientManager';
import { showIssueForURL } from 'src/commands/jira/showIssue';
import { configuration } from 'src/config/configuration';
import { Commands } from 'src/constants';
import { Container } from 'src/container';
import { Logger } from 'src/logger';
import { SearchJiraHelper } from 'src/views/jira/searchJiraHelper';
import { getHtmlForView } from 'src/webview/common/getHtmlForView';
import { commands, ConfigurationChangeEvent, Uri } from 'vscode';

import { RovodevAnalyticsApi } from '../analytics/rovodevAnalyticsApi';
import { AuthInfo, DetailedSiteInfo, ProductJira } from './extensionApiTypes';

// Re-export types for convenience
export * from './extensionApiTypes';
export * from '../analytics/events';

// TODO: getAxiosInstance is being re-exported for now, to not break compatability with curl logging
//       in the future, we'd need to re-implement it, or just use the library directly
export { getAxiosInstance } from 'src/jira/jira-client/providers';

export class JiraApi {
    public getSites = (): DetailedSiteInfo[] => {
        return Container.siteManager.getSitesAvailable(ProductJira);
    };

    public showIssue = async (issueURL: string): Promise<void> => {
        await showIssueForURL(issueURL);
    };

    public fetchWorkItems = async (site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> => {
        // Fetch from cache first
        let assignedIssuesForSite = this.fetchWorkItemsFromCache(site);
        if (assignedIssuesForSite.length === 0) {
            try {
                assignedIssuesForSite = await this.fetchWorkItemsFromApi(site);
            } catch (error) {
                // If API fails (e.g., scoped token limitations), return empty array
                // The UI will handle hiding the section when empty
                Logger.error(error, 'Failed to fetch work items from API:' + error.message);
                return [];
            }
        }
        return assignedIssuesForSite;
    };

    private fetchWorkItemsFromCache(site: DetailedSiteInfo) {
        const issues = SearchJiraHelper.getAssignedIssuesPerSite(site.id);
        return issues.filter((issue) => isMinimalIssue(issue));
    }

    private async fetchWorkItemsFromApi(site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const client = await Container.clientManager.jiraClient(site);
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);
        const fields = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicFieldInfo);

        const jql = 'assignee = currentUser() AND StatusCategory = "To Do" ORDER BY updated DESC';

        try {
            const res = await client.searchForIssuesUsingJqlGet(jql, fields, 30, 0);
            const searchResults = await readSearchResults(res, site, epicFieldInfo);
            return searchResults.issues.filter((issue) => isMinimalIssue(issue));
        } catch (error) {
            // If the query fails (likely due to scoped API token that doesn't support currentUser()),
            // throw the error to indicate that work items cannot be fetched
            // This will cause the entire Jira work items section to be hidden
            throw new Error(
                `Cannot fetch work items: ${error.message || 'API token may have insufficient permissions'}`,
            );
        }
    }
}

/**
 * This class defines what rovodev needs from the rest of the extension
 */
export class ExtensionApi {
    public readonly analytics = new RovodevAnalyticsApi();

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
        onDidChange: (listener: (e: ConfigurationChangeEvent) => any, thisArg?: any) => {
            return configuration.onDidChange(listener, thisArg);
        },
        changed(e: ConfigurationChangeEvent, section: string, resource?: Uri | null): boolean {
            return configuration.changed(e, section, resource);
        },
    };

    public readonly auth = {
        // TODO [AXON-1531]: rectify these 2 methods

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
        getCloudPrimaryAuthSite: async (): Promise<ValidBasicAuthSiteData | undefined> => {
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

        saveRovoDevAuthInfo: async (authInfo: any): Promise<void> => {
            await Container.credentialManager.saveRovoDevAuthInfo(authInfo);
        },

        getRovoDevAuthInfo: async (): Promise<any | undefined> => {
            return await Container.credentialManager.getRovoDevAuthInfo();
        },

        removeRovoDevAuthInfo: async (): Promise<void> => {
            await Container.credentialManager.removeRovoDevAuthInfo();
        },

        /**
         * Get credential hints (host + email) from all configured Jira sites.
         * Used for autocomplete suggestions in credential forms.
         *
         * @returns Array of unique {host, email} combinations from all sites
         */
        getCredentialHints: async (): Promise<{ host: string; email: string }[]> => {
            const sites = Container.siteManager.getSitesAvailable(ProductJira);
            const credentialsPromises = sites.map(async (site) => {
                try {
                    const authInfo = await Container.credentialManager.getAuthInfo(site);
                    if (!authInfo || !authInfo.user?.email) {
                        return null;
                    }
                    return {
                        host: site.host,
                        email: authInfo.user.email,
                    };
                } catch {
                    return null;
                }
            });

            const allCredentials = await Promise.all(credentialsPromises);
            const credentials = allCredentials.filter((c): c is { host: string; email: string } => c !== null);

            // Remove duplicates by creating a unique key
            return Array.from(new Map(credentials.map((c) => [`${c.host}-${c.email}`, c])).values());
        },
    };

    commands = {
        openFolder: async (): Promise<void> => {
            await commands.executeCommand(Commands.WorkbenchOpenFolder);
        },
        focusRovodevView: async (): Promise<void> => {
            await commands.executeCommand('atlascode.views.rovoDev.webView.focus');
        },
        showUserAuthentication: async ({ openApiTokenLogin }: { openApiTokenLogin: boolean }) => {
            if (openApiTokenLogin) {
                await commands.executeCommand(Commands.JiraAPITokenLogin);
            } else {
                await commands.executeCommand(Commands.ShowJiraAuth);
            }
        },
        showDiff: async (args: { left: Uri; right: Uri; title: string }) => {
            await commands.executeCommand('vscode.diff', args.left, args.right, args.title);
        },
        setCommandContext: async (key: string, value: any) => {
            await commands.executeCommand('setContext', key, value);
        },
    };

    public readonly jira = new JiraApi();

    // Not technically part of the ExtensionApi, but convenient to have here for now
    public getHtmlForView({
        extensionPath,
        cspSource,
        viewId,
        baseUri,
        stylesUri,
    }: {
        extensionPath: string;
        baseUri: Uri;
        cspSource: string;
        viewId: string;
        stylesUri?: Uri;
    }): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, viewId, stylesUri);
    }
}
