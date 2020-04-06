import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { JqlAutocompleteRestData, Suggestion } from '@atlassianlabs/guipi-jira-components';
import { FilterSearchResults, JQLErrors } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../atlclients/authInfo';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { ConfigAction, ConfigActionType } from '../../../lib/ipc/fromUI/config';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import { ConfigSection, ConfigSubSection, ConfigTarget, FlattenedConfig } from '../../../lib/ipc/models/config';
import {
    ConfigInitMessage,
    ConfigMessage,
    ConfigMessageType,
    ConfigResponse,
    emptyConfigInitMessage,
    FilterSearchResponseMessage,
    JQLOptionsResponseMessage,
    JQLSuggestionsResponseMessage,
    SectionChangeMessage,
    ValidateJqlResponseMessage
} from '../../../lib/ipc/toUI/config';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface ConfigControllerApi {
    postMessage: PostMessageFunc<ConfigAction>;
    updateConfig: (changes: ConfigChanges, removes?: string[]) => void;
    setConfigTarget: (target: ConfigTarget) => void;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    login: (site: SiteInfo, auth: AuthInfo) => void;
    logout: (site: DetailedSiteInfo) => void;
    fetchJqlOptions: (site: DetailedSiteInfo) => Promise<JqlAutocompleteRestData>;
    fetchJqlSuggestions: (
        site: DetailedSiteInfo,
        fieldName: string,
        userInput: string,
        predicateName?: string,
        abortSignal?: AbortSignal
    ) => Promise<Suggestion[]>;
    fetchFilterSearchResults: (
        site: DetailedSiteInfo,
        query: string,
        maxResults?: number,
        startAt?: number,
        abortSignal?: AbortSignal
    ) => Promise<FilterSearchResults>;
    validateJql: (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal) => Promise<JQLErrors>;
}

export const emptyApi: ConfigControllerApi = {
    postMessage: s => {
        return;
    },
    updateConfig: (changes, removes?) => {
        return;
    },
    setConfigTarget: (target: ConfigTarget) => {
        return;
    },
    refresh: (): void => {
        return;
    },
    openLink: linkId => {
        return;
    },
    login: (site: SiteInfo, auth: AuthInfo) => {
        return;
    },
    logout: (site: DetailedSiteInfo) => {
        return;
    },
    fetchJqlOptions: (site: DetailedSiteInfo): Promise<JqlAutocompleteRestData> => {
        return new Promise<JqlAutocompleteRestData>((resolve, reject) => {
            resolve({ visibleFieldNames: [], visibleFunctionNames: [], jqlReservedWords: [] });
        });
    },
    fetchJqlSuggestions: (
        site: DetailedSiteInfo,
        fieldName: string,
        userInput: string,
        predicateName?: string,
        abortSignal?: AbortSignal
    ): Promise<Suggestion[]> => {
        return new Promise<Suggestion[]>((resolve, reject) => {
            resolve([]);
        });
    },
    fetchFilterSearchResults: (
        site: DetailedSiteInfo,
        query: string,
        maxResults?: number,
        startAt?: number,
        abortSignal?: AbortSignal
    ): Promise<FilterSearchResults> => {
        return new Promise<FilterSearchResults>((resolve, reject) => {
            resolve(emptyFilterSearchResults);
        });
    },
    validateJql: (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
        return new Promise<JQLErrors>((resolve, reject) => {
            resolve({ errors: [] });
        });
    }
};

export const emptyFilterSearchResults: FilterSearchResults = {
    filters: [],
    isLast: true,
    maxResults: 25,
    offset: 0,
    total: 0
};

export const ConfigControllerContext = React.createContext(emptyApi);

export interface ConfigState extends ConfigInitMessage {
    isSomethingLoading: boolean;
    openSection: ConfigSection;
    openSubSections: ConfigSubSection[];
}

const emptyState: ConfigState = {
    ...emptyConfigInitMessage,
    isSomethingLoading: false,
    openSection: ConfigSection.Jira,
    openSubSections: []
};

export enum ConfigUIActionType {
    Init = 'init',
    SectionChange = 'sectionChange',
    ConfigChange = 'configChange',
    Loading = 'loading',
    SitesUpdate = 'sitesUpdate',
    LocalChange = 'localChange'
}

export type ConfigUIAction =
    | ReducerAction<ConfigUIActionType.Init, { data: ConfigInitMessage }>
    | ReducerAction<ConfigUIActionType.ConfigChange, { config: FlattenedConfig; target: ConfigTarget }>
    | ReducerAction<ConfigUIActionType.SectionChange, { data: SectionChangeMessage }>
    | ReducerAction<ConfigUIActionType.LocalChange, { changes: { [key: string]: any } }>
    | ReducerAction<ConfigUIActionType.Loading>
    | ReducerAction<
          ConfigUIActionType.SitesUpdate,
          { jiraSites: DetailedSiteInfo[]; bitbucketSites: DetailedSiteInfo[] }
      >;

export type ConfigChanges = { [key: string]: any };

function configReducer(state: ConfigState, action: ConfigUIAction): ConfigState {
    switch (action.type) {
        case ConfigUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                openSection: action.data.section ? action.data.section : ConfigSection.Jira,
                openSubSections: action.data.subSection ? [action.data.subSection] : [],
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined
            };
            return newstate;
        }
        case ConfigUIActionType.SectionChange: {
            const newstate = {
                ...state,
                openSection: action.data.section ? action.data.section : state.openSection,
                openSubSections: action.data.subSection ? [action.data.subSection] : state.openSubSections,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined
            };
            return newstate;
        }
        case ConfigUIActionType.LocalChange: {
            return { ...state, config: { ...state.config, ...action.changes } };
        }
        case ConfigUIActionType.ConfigChange: {
            return {
                ...state,
                ...{
                    config: action.config,
                    target: action.target,
                    isSomethingLoading: false,
                    isErrorBannerOpen: false,
                    errorDetails: undefined
                }
            };
        }
        case ConfigUIActionType.SitesUpdate: {
            return {
                ...state,
                ...{
                    jiraSites: action.jiraSites,
                    bitbucketSites: action.bitbucketSites,
                    isSomethingLoading: false,
                    isErrorBannerOpen: false,
                    errorDetails: undefined
                }
            };
        }
        case ConfigUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function useConfigController(): [ConfigState, ConfigControllerApi] {
    const [state, dispatch] = useReducer(configReducer, emptyState);

    const onMessageHandler = useCallback((message: ConfigMessage): void => {
        switch (message.type) {
            case ConfigMessageType.Init: {
                dispatch({ type: ConfigUIActionType.Init, data: message });
                break;
            }
            case ConfigMessageType.SectionChange: {
                dispatch({ type: ConfigUIActionType.SectionChange, data: message });
                break;
            }
            case ConfigMessageType.Update: {
                dispatch({ type: ConfigUIActionType.ConfigChange, config: message.config, target: message.target });
                break;
            }
            case ConfigMessageType.SitesUpdate: {
                dispatch({
                    type: ConfigUIActionType.SitesUpdate,
                    jiraSites: message.jiraSites,
                    bitbucketSites: message.bitbucketSites
                });
                break;
            }

            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<ConfigAction, ConfigMessage, ConfigResponse>(
        onMessageHandler
    );

    const handleConfigChange = useCallback(
        (changes: ConfigChanges, removes?: string[]): void => {
            dispatch({ type: ConfigUIActionType.LocalChange, changes: changes });
            postMessage({
                type: ConfigActionType.SaveSettings,
                changes: changes,
                removes: removes,
                target: state.target
            });
        },
        [postMessage, state.target]
    );

    const setConfigTarget = useCallback(
        (target: ConfigTarget) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.SetTarget, target: target });
        },
        [postMessage]
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) => postMessage({ type: CommonActionType.ExternalLink, linkId: linkId }),
        [postMessage]
    );

    const login = useCallback(
        (site: SiteInfo, auth: AuthInfo) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.Login, siteInfo: site, authInfo: auth });
        },
        [postMessage]
    );

    const logout = useCallback(
        (site: DetailedSiteInfo) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.Logout, siteInfo: site });
        },
        [postMessage]
    );

    const fetchJqlOptions = useCallback(
        (site: DetailedSiteInfo): Promise<JqlAutocompleteRestData> => {
            return new Promise<JqlAutocompleteRestData>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.JQLOptionsRequest,
                                site: site
                            },
                            ConfigMessageType.JQLOptionsResponse,
                            ConnectionTimeout
                        );
                        resolve((response as JQLOptionsResponseMessage).data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const fetchJqlSuggestions = useCallback(
        (
            site: DetailedSiteInfo,
            fieldName: string,
            userInput: string,
            predicateName?: string,
            abortSignal?: AbortSignal
        ): Promise<Suggestion[]> => {
            return new Promise<Suggestion[]>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.JQLSuggestionsRequest,
                                site: site,
                                fieldName: fieldName,
                                userInput: userInput,
                                predicateName: predicateName,
                                abortSignal: abortSignal
                            },
                            ConfigMessageType.JQLSuggestionsResponse,
                            ConnectionTimeout
                        );
                        resolve((response as JQLSuggestionsResponseMessage).data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const fetchFilterSearchResults = useCallback(
        (
            site: DetailedSiteInfo,
            query: string,
            maxResults?: number,
            startAt?: number,
            abortSignal?: AbortSignal
        ): Promise<FilterSearchResults> => {
            return new Promise<FilterSearchResults>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.FilterSearchRequest,
                                site: site,
                                query: query,
                                maxResults: maxResults,
                                startAt: startAt,
                                abortSignal: abortSignal
                            },
                            ConfigMessageType.FilterSearchResponse,
                            ConnectionTimeout
                        );
                        resolve((response as FilterSearchResponseMessage).data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const validateJql = useCallback(
        (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
            return new Promise<JQLErrors>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.ValidateJqlRequest,
                                site: site,
                                jql: jql,
                                abortSignal: abortSignal
                            },
                            ConfigMessageType.ValidateJqlResponse,
                            ConnectionTimeout
                        );
                        resolve((response as ValidateJqlResponseMessage).data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const controllerApi = useMemo<ConfigControllerApi>((): ConfigControllerApi => {
        return {
            postMessage: postMessage,
            updateConfig: handleConfigChange,
            setConfigTarget: setConfigTarget,
            refresh: sendRefresh,
            openLink: openLink,
            login: login,
            logout: logout,
            fetchJqlSuggestions: fetchJqlSuggestions,
            fetchJqlOptions: fetchJqlOptions,
            fetchFilterSearchResults: fetchFilterSearchResults,
            validateJql: validateJql
        };
    }, [
        handleConfigChange,
        login,
        logout,
        openLink,
        postMessage,
        sendRefresh,
        setConfigTarget,
        fetchJqlOptions,
        fetchJqlSuggestions,
        fetchFilterSearchResults,
        validateJql
    ]);

    return [state, controllerApi];
}
