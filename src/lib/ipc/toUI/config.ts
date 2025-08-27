import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import {
    AutocompleteSuggestion,
    FilterSearchResults,
    JQLAutocompleteData,
    JQLErrors,
} from '@atlassianlabs/jira-pi-common-models';
import { flatten } from 'flatten-anything';

import { AuthInfo, DetailedSiteInfo, emptyBasicAuthInfo, emptySiteInfo } from '../../../atlclients/authInfo';
import { emptyConfig } from '../../../config/model';
import { emptyFeedbackUser, FeedbackUser } from '../models/common';
import {
    ConfigSection,
    ConfigSubSection,
    ConfigTarget,
    ConfigV3Section,
    ConfigV3SubSection,
    FlattenedConfig,
} from '../models/config';

export enum ConfigMessageType {
    Init = 'init',
    SectionChange = 'sectionChange',
    Update = 'configUpdate',
    SitesUpdate = 'sitesAvailableUpdate',
    JQLOptionsResponse = 'jqlOptionsResponse',
    JQLSuggestionsResponse = 'JQLSuggestionsResponse',
    FilterSearchResponse = 'filterSearchResponse',
    ValidateJqlResponse = 'validateJqlResponse',
}

export type ConfigMessage =
    | ReducerAction<ConfigMessageType.Init, ConfigInitMessage>
    | ReducerAction<ConfigMessageType.Update, ConfigUpdateMessage>
    | ReducerAction<ConfigMessageType.SectionChange, SectionChangeMessage>
    | ReducerAction<ConfigMessageType.SitesUpdate, SitesUpdateMessage>;

export type ConfigV3Message =
    | ReducerAction<ConfigMessageType.Init, ConfigV3InitMessage>
    | ReducerAction<ConfigMessageType.Update, ConfigUpdateMessage>
    | ReducerAction<ConfigMessageType.SectionChange, SectionV3ChangeMessage>
    | ReducerAction<ConfigMessageType.SitesUpdate, SitesUpdateMessage>;

export type ConfigResponse =
    | ReducerAction<ConfigMessageType.JQLOptionsResponse, JQLOptionsResponseMessage>
    | ReducerAction<ConfigMessageType.JQLSuggestionsResponse, JQLSuggestionsResponseMessage>
    | ReducerAction<ConfigMessageType.FilterSearchResponse, FilterSearchResponseMessage>
    | ReducerAction<ConfigMessageType.ValidateJqlResponse, ValidateJqlResponseMessage>;

export interface ConfigInitMessage {
    config: FlattenedConfig;
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
    feedbackUser: FeedbackUser;
    isRemote: boolean;
    showTunnelOption: boolean;
    target: ConfigTarget;
    section?: ConfigSection;
    subSection?: ConfigSubSection;
}
export interface ConfigV3InitMessage {
    config: FlattenedConfig;
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
    feedbackUser: FeedbackUser;
    isRemote: boolean;
    showTunnelOption: boolean;
    target: ConfigTarget;
    section?: ConfigV3Section;
    subSection?: ConfigV3SubSection;
}

export const emptyConfigInitMessage: ConfigInitMessage = {
    config: flatten(emptyConfig),
    jiraSites: [],
    bitbucketSites: [],
    feedbackUser: emptyFeedbackUser,
    isRemote: false,
    showTunnelOption: false,
    target: ConfigTarget.User,
    section: ConfigSection.Jira,
};

export const emptyConfigV3InitMessage: ConfigV3InitMessage = {
    config: flatten(emptyConfig),
    jiraSites: [],
    bitbucketSites: [],
    feedbackUser: emptyFeedbackUser,
    isRemote: false,
    showTunnelOption: false,
    target: ConfigTarget.User,
    section: ConfigV3Section.Auth,
};

export interface ConfigUpdateMessage {
    config: FlattenedConfig;
    target: ConfigTarget;
}

export interface SiteWithAuthInfo {
    site: DetailedSiteInfo;
    auth: AuthInfo;
}

export const emptySiteWithAuthInfo: SiteWithAuthInfo = {
    site: emptySiteInfo,
    auth: emptyBasicAuthInfo,
};

export interface SitesUpdateMessage {
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
}

export interface JQLOptionsResponseMessage {
    data: JQLAutocompleteData;
}

export interface JQLSuggestionsResponseMessage {
    data: AutocompleteSuggestion[];
}

export interface FilterSearchResponseMessage {
    data: FilterSearchResults;
}

export interface ValidateJqlResponseMessage {
    data: JQLErrors;
}

export interface SectionChangeMessage {
    section: ConfigSection;
    subSection: ConfigSubSection | undefined;
}

export interface SectionV3ChangeMessage {
    section: ConfigV3Section;
    subSection: ConfigV3SubSection | undefined;
}
