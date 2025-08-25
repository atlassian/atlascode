import {
    AutocompleteSuggestion,
    FilterSearchResults,
    JQLAutocompleteData,
    JQLErrors,
} from '@atlassianlabs/jira-pi-common-models';

import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../../atlclients/authInfo';
import { FeedbackUser } from '../../../ipc/models/common';
import { ConfigTarget, FlattenedConfig } from '../../../ipc/models/config';
import { SiteWithAuthInfo } from '../../../ipc/toUI/config';

export interface ConfigActionApi {
    authenticateServer(site: SiteInfo, authInfo: AuthInfo): Promise<void>;
    authenticateCloud(site: SiteInfo, callback: string): Promise<void>;
    clearAuth(site: DetailedSiteInfo): Promise<void>;
    openJsonSettingsFile(target: ConfigTarget): Promise<void>;
    fetchJqlOptions: (site: DetailedSiteInfo) => Promise<JQLAutocompleteData>;
    fetchJqlSuggestions: (
        site: DetailedSiteInfo,
        fieldName: string,
        userInput: string,
        predicateName?: string,
        abortKey?: string,
    ) => Promise<AutocompleteSuggestion[]>;
    fetchFilterSearchResults: (
        site: DetailedSiteInfo,
        query: string,
        maxResults?: number,
        startAt?: number,
        abortKey?: string,
    ) => Promise<FilterSearchResults>;
    validateJql: (site: DetailedSiteInfo, jql: string, abortKey?: string) => Promise<JQLErrors>;
    updateSettings(target: ConfigTarget, changes: { [key: string]: any }, removes?: string[]): Promise<void>;
    getSitesAvailable(): [DetailedSiteInfo[], DetailedSiteInfo[]];

    getSitesWithAuth(): Promise<[SiteWithAuthInfo[], SiteWithAuthInfo[]]>;
    getFeedbackUser(): Promise<FeedbackUser>;
    getIsRemote(): boolean;
    getConfigTarget(): ConfigTarget;
    setConfigTarget(target: ConfigTarget): void;
    shouldShowTunnelOption(): boolean;
    flattenedConfigForTarget(target: ConfigTarget): FlattenedConfig;
    createJiraIssue(): void;
    viewJiraIssue(): void;
    createPullRequest(): void;
    viewPullRequest(): void;
    openNativeSettings(): Promise<void>;
}
