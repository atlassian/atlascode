import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { JqlAutocompleteRestData, Suggestion } from '@atlassianlabs/guipi-jira-components';
import { FilterSearchResults, JQLErrors } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { UIErrorInfo } from 'src/analyticsTypes';
import { v4 } from 'uuid';

import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../atlclients/authInfo';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { ConfigAction, ConfigActionType } from '../../../lib/ipc/fromUI/config';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    ConfigSection,
    ConfigSubSection,
    ConfigTarget,
    ConfigV3Section,
    ConfigV3SubSection,
    FlattenedConfig,
} from '../../../lib/ipc/models/config';
import {
    ConfigInitMessage,
    ConfigMessage,
    ConfigMessageType,
    ConfigResponse,
    ConfigV3InitMessage,
    ConfigV3Message,
    emptyConfigInitMessage,
    emptyConfigV3InitMessage,
    SectionChangeMessage,
    SectionV3ChangeMessage,
    SiteWithAuthInfo,
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
    remoteLogin: () => void;
    logout: (site: DetailedSiteInfo) => void;
    fetchJqlOptions: (site: DetailedSiteInfo) => Promise<JqlAutocompleteRestData>;
    fetchJqlSuggestions: (
        site: DetailedSiteInfo,
        fieldName: string,
        userInput: string,
        predicateName?: string,
        abortSignal?: AbortSignal,
    ) => Promise<Suggestion[]>;
    fetchFilterSearchResults: (
        site: DetailedSiteInfo,
        query: string,
        maxResults?: number,
        startAt?: number,
        abortSignal?: AbortSignal,
    ) => Promise<FilterSearchResults>;
    validateJql: (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal) => Promise<JQLErrors>;
    createPullRequest: () => void;
    viewPullRequest: () => void;
    createJiraIssue: () => void;
    viewJiraIssue: () => void;
    openNativeSettings: () => void;
}

export const emptyApi: ConfigControllerApi = {
    postMessage: (s) => {
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
    openLink: (linkId) => {
        return;
    },
    login: (site: SiteInfo, auth: AuthInfo) => {
        return;
    },
    remoteLogin: () => {
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
        abortSignal?: AbortSignal,
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
        abortSignal?: AbortSignal,
    ): Promise<FilterSearchResults> => {
        return new Promise<FilterSearchResults>((resolve, reject) => {
            resolve(emptyFilterSearchResults);
        });
    },
    validateJql: (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
        return new Promise<JQLErrors>((resolve, reject) => {
            resolve({ errors: [] });
        });
    },
    createPullRequest: (): void => {
        return;
    },
    viewPullRequest: (): void => {
        return;
    },
    createJiraIssue: (): void => {
        return;
    },
    viewJiraIssue: (): void => {
        return;
    },
    openNativeSettings: (): void => {
        return;
    },
};

const emptyFilterSearchResults: FilterSearchResults = {
    filters: [],
    isLast: true,
    maxResults: 25,
    offset: 0,
    total: 0,
};

export const ConfigControllerContext = React.createContext(emptyApi);

export interface ConfigState extends ConfigInitMessage {
    isSomethingLoading: boolean;
    openSection: ConfigSection;
    openSubSections: ConfigSubSection[];
}

export interface ConfigV3State extends ConfigV3InitMessage {
    isSomethingLoading: boolean;
    openSection: ConfigV3Section;
    openSubSections: ConfigV3SubSection[];
}

const emptyState: ConfigState = {
    ...emptyConfigInitMessage,
    isSomethingLoading: false,
    openSection: ConfigSection.Jira,
    openSubSections: [],
};

const emptyStateV3: ConfigV3State = {
    ...emptyConfigV3InitMessage,
    isSomethingLoading: false,
    openSection: ConfigV3Section.Auth,
    openSubSections: [],
};

enum ConfigUIActionType {
    Init = 'init',
    SectionChange = 'sectionChange',
    ConfigChange = 'configChange',
    Loading = 'loading',
    SitesUpdate = 'sitesUpdate',
    LocalChange = 'localChange',
}

type ConfigUIAction =
    | ReducerAction<CommonActionType.SendAnalytics, { errorInfo: UIErrorInfo }>
    | ReducerAction<ConfigUIActionType.Init, { data: ConfigInitMessage }>
    | ReducerAction<ConfigUIActionType.ConfigChange, { config: FlattenedConfig; target: ConfigTarget }>
    | ReducerAction<ConfigUIActionType.SectionChange, { data: SectionChangeMessage }>
    | ReducerAction<ConfigUIActionType.LocalChange, { changes: { [key: string]: any } }>
    | ReducerAction<ConfigUIActionType.Loading>
    | ReducerAction<
          ConfigUIActionType.SitesUpdate,
          { jiraSites: SiteWithAuthInfo[]; bitbucketSites: SiteWithAuthInfo[] }
      >;

type ConfigV3UIAction =
    | ReducerAction<CommonActionType.SendAnalytics, { errorInfo: UIErrorInfo }>
    | ReducerAction<ConfigUIActionType.Init, { data: ConfigV3InitMessage }>
    | ReducerAction<ConfigUIActionType.ConfigChange, { config: FlattenedConfig; target: ConfigTarget }>
    | ReducerAction<ConfigUIActionType.SectionChange, { data: SectionV3ChangeMessage }>
    | ReducerAction<ConfigUIActionType.LocalChange, { changes: { [key: string]: any } }>
    | ReducerAction<ConfigUIActionType.Loading>
    | ReducerAction<
          ConfigUIActionType.SitesUpdate,
          { jiraSites: SiteWithAuthInfo[]; bitbucketSites: SiteWithAuthInfo[] }
      >;

export type ConfigChanges = { [key: string]: any };

function configReducerV3(state: ConfigV3State, action: ConfigV3UIAction): ConfigV3State {
    switch (action.type) {
        case ConfigUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                openSection: action.data.section ? action.data.section : ConfigV3Section.Auth,
                openSubSections: action.data.subSection ? [action.data.subSection] : [],
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                machineId: action.data.machineId,
                errorDetails: undefined,
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
                errorDetails: undefined,
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
                    errorDetails: undefined,
                },
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
                    errorDetails: undefined,
                },
            };
        }
        case ConfigUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        case CommonActionType.SendAnalytics: {
            return state;
        }

        default:
            return defaultStateGuard(state, action);
    }
}

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
                machineId: action.data.machineId,
                errorDetails: undefined,
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
                errorDetails: undefined,
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
                    errorDetails: undefined,
                },
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
                    errorDetails: undefined,
                },
            };
        }
        case ConfigUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        case CommonActionType.SendAnalytics: {
            return state;
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function useConfigControllerV3(): [ConfigV3State, ConfigControllerApi] {
    const [state, dispatch] = useReducer(configReducerV3, emptyStateV3);

    const onMessageHandler = useCallback((message: ConfigV3Message): void => {
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
                    bitbucketSites: message.bitbucketSites,
                });
                break;
            }

            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const { postMessage, postMessagePromise } = useMessagingApi<ConfigAction, ConfigV3Message, ConfigResponse>(
        onMessageHandler,
    );

    const handleConfigChange = useCallback(
        (changes: ConfigChanges, removes?: string[]): void => {
            dispatch({ type: ConfigUIActionType.LocalChange, changes: changes });
            postMessage({
                type: ConfigActionType.SaveSettings,
                changes: changes,
                removes: removes,
                target: state.target,
            });
        },
        [postMessage, state.target],
    );

    const setConfigTarget = useCallback(
        (target: ConfigTarget) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.SetTarget, target: target });
        },
        [postMessage],
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.ConfigWebview,
                linkId: linkId,
            }),
        [postMessage],
    );

    const login = useCallback(
        (site: SiteInfo, auth: AuthInfo) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.Login, siteInfo: site, authInfo: auth });
        },
        [postMessage],
    );

    const remoteLogin = useCallback(() => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.RemoteLogin });
    }, [postMessage]);

    const logout = useCallback(
        (site: DetailedSiteInfo) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.Logout, siteInfo: site });
        },
        [postMessage],
    );

    const fetchJqlOptions = useCallback(
        (site: DetailedSiteInfo): Promise<JqlAutocompleteRestData> => {
            return new Promise<JqlAutocompleteRestData>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.JQLOptionsRequest,
                                site: site,
                            },
                            ConfigMessageType.JQLOptionsResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const fetchJqlSuggestions = useCallback(
        (
            site: DetailedSiteInfo,
            fieldName: string,
            userInput: string,
            predicateName?: string,
            abortSignal?: AbortSignal,
        ): Promise<Suggestion[]> => {
            return new Promise<Suggestion[]>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();
                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'fetchJqlSuggestions cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.JQLSuggestionsRequest,
                                site: site,
                                fieldName: fieldName,
                                userInput: userInput,
                                predicateName: predicateName,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            ConfigMessageType.JQLSuggestionsResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const fetchFilterSearchResults = useCallback(
        (
            site: DetailedSiteInfo,
            query: string,
            maxResults?: number,
            startAt?: number,
            abortSignal?: AbortSignal,
        ): Promise<FilterSearchResults> => {
            return new Promise<FilterSearchResults>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();
                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'fetchFilterSearchResults cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.FilterSearchRequest,
                                site: site,
                                query: query,
                                maxResults: maxResults,
                                startAt: startAt,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            ConfigMessageType.FilterSearchResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const validateJql = useCallback(
        (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
            return new Promise<JQLErrors>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();
                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'validateJql cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.ValidateJqlRequest,
                                site: site,
                                jql: jql,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            ConfigMessageType.ValidateJqlResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const createPullRequest = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.CreatePullRequest });
    }, [postMessage]);

    const viewPullRequest = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.ViewPullRequest });
    }, [postMessage]);

    const createJiraIssue = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.CreateJiraIssue });
    }, [postMessage]);

    const viewJiraIssue = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.ViewJiraIssue });
    }, [postMessage]);

    const openNativeSettings = useCallback((): void => {
        postMessage({ type: ConfigActionType.OpenNativeSettings });
    }, [postMessage]);

    const controllerApi = useMemo<ConfigControllerApi>((): ConfigControllerApi => {
        return {
            postMessage: postMessage,
            updateConfig: handleConfigChange,
            setConfigTarget: setConfigTarget,
            refresh: sendRefresh,
            openLink: openLink,
            login: login,
            remoteLogin: remoteLogin,
            logout: logout,
            fetchJqlSuggestions: fetchJqlSuggestions,
            fetchJqlOptions: fetchJqlOptions,
            fetchFilterSearchResults: fetchFilterSearchResults,
            validateJql: validateJql,
            createJiraIssue: createJiraIssue,
            createPullRequest: createPullRequest,
            viewPullRequest: viewPullRequest,
            viewJiraIssue: viewJiraIssue,
            openNativeSettings: openNativeSettings,
        };
    }, [
        handleConfigChange,
        login,
        remoteLogin,
        logout,
        openLink,
        postMessage,
        sendRefresh,
        setConfigTarget,
        fetchJqlOptions,
        fetchJqlSuggestions,
        fetchFilterSearchResults,
        validateJql,
        createJiraIssue,
        createPullRequest,
        viewPullRequest,
        viewJiraIssue,
        openNativeSettings,
    ]);

    return [state, controllerApi];
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
                    bitbucketSites: message.bitbucketSites,
                });
                break;
            }

            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const { postMessage, postMessagePromise } = useMessagingApi<ConfigAction, ConfigMessage, ConfigResponse>(
        onMessageHandler,
    );

    const handleConfigChange = useCallback(
        (changes: ConfigChanges, removes?: string[]): void => {
            dispatch({ type: ConfigUIActionType.LocalChange, changes: changes });
            postMessage({
                type: ConfigActionType.SaveSettings,
                changes: changes,
                removes: removes,
                target: state.target,
            });
        },
        [postMessage, state.target],
    );

    const setConfigTarget = useCallback(
        (target: ConfigTarget) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.SetTarget, target: target });
        },
        [postMessage],
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.ConfigWebview,
                linkId: linkId,
            }),
        [postMessage],
    );

    const login = useCallback(
        (site: SiteInfo, auth: AuthInfo) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.Login, siteInfo: site, authInfo: auth });
        },
        [postMessage],
    );

    const remoteLogin = useCallback(() => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.RemoteLogin });
    }, [postMessage]);

    const logout = useCallback(
        (site: DetailedSiteInfo) => {
            dispatch({ type: ConfigUIActionType.Loading });
            postMessage({ type: ConfigActionType.Logout, siteInfo: site });
        },
        [postMessage],
    );

    const fetchJqlOptions = useCallback(
        (site: DetailedSiteInfo): Promise<JqlAutocompleteRestData> => {
            return new Promise<JqlAutocompleteRestData>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.JQLOptionsRequest,
                                site: site,
                            },
                            ConfigMessageType.JQLOptionsResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const fetchJqlSuggestions = useCallback(
        (
            site: DetailedSiteInfo,
            fieldName: string,
            userInput: string,
            predicateName?: string,
            abortSignal?: AbortSignal,
        ): Promise<Suggestion[]> => {
            return new Promise<Suggestion[]>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();
                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'fetchJqlSuggestions cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.JQLSuggestionsRequest,
                                site: site,
                                fieldName: fieldName,
                                userInput: userInput,
                                predicateName: predicateName,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            ConfigMessageType.JQLSuggestionsResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const fetchFilterSearchResults = useCallback(
        (
            site: DetailedSiteInfo,
            query: string,
            maxResults?: number,
            startAt?: number,
            abortSignal?: AbortSignal,
        ): Promise<FilterSearchResults> => {
            return new Promise<FilterSearchResults>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();
                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'fetchFilterSearchResults cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.FilterSearchRequest,
                                site: site,
                                query: query,
                                maxResults: maxResults,
                                startAt: startAt,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            ConfigMessageType.FilterSearchResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const validateJql = useCallback(
        (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
            return new Promise<JQLErrors>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();
                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'validateJql cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: ConfigActionType.ValidateJqlRequest,
                                site: site,
                                jql: jql,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            ConfigMessageType.ValidateJqlResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.data);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const createPullRequest = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.CreatePullRequest });
    }, [postMessage]);

    const viewPullRequest = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.ViewPullRequest });
    }, [postMessage]);

    const createJiraIssue = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.CreateJiraIssue });
    }, [postMessage]);

    const viewJiraIssue = useCallback((): void => {
        dispatch({ type: ConfigUIActionType.Loading });
        postMessage({ type: ConfigActionType.ViewJiraIssue });
    }, [postMessage]);

    const openNativeSettings = useCallback((): void => {
        postMessage({ type: ConfigActionType.OpenNativeSettings });
    }, [postMessage]);

    const controllerApi = useMemo<ConfigControllerApi>((): ConfigControllerApi => {
        return {
            postMessage: postMessage,
            updateConfig: handleConfigChange,
            setConfigTarget: setConfigTarget,
            refresh: sendRefresh,
            openLink: openLink,
            login: login,
            remoteLogin: remoteLogin,
            logout: logout,
            fetchJqlSuggestions: fetchJqlSuggestions,
            fetchJqlOptions: fetchJqlOptions,
            fetchFilterSearchResults: fetchFilterSearchResults,
            validateJql: validateJql,
            createJiraIssue: createJiraIssue,
            createPullRequest: createPullRequest,
            viewPullRequest: viewPullRequest,
            viewJiraIssue: viewJiraIssue,
            openNativeSettings: openNativeSettings,
        };
    }, [
        handleConfigChange,
        login,
        remoteLogin,
        logout,
        openLink,
        postMessage,
        sendRefresh,
        setConfigTarget,
        fetchJqlOptions,
        fetchJqlSuggestions,
        fetchFilterSearchResults,
        validateJql,
        createJiraIssue,
        createPullRequest,
        viewPullRequest,
        viewJiraIssue,
        openNativeSettings,
    ]);

    return [state, controllerApi];
}
