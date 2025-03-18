import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../atlclients/authInfo';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { OnboardingAction, OnboardingActionType } from '../../../lib/ipc/fromUI/onboarding';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import { ConfigSection, ConfigSubSection, ConfigTarget, FlattenedConfig } from '../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../lib/ipc/toUI/config';
import {
    emptyOnboardingInitMessage,
    OnboardingInitMessage,
    OnboardingMessage,
    OnboardingMessageType,
    OnboardingResponse,
} from '../../../lib/ipc/toUI/onboarding';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface OnboardingControllerApi {
    postMessage: PostMessageFunc<OnboardingAction>;
    updateConfig: (changes: ConfigChanges, removes?: string[]) => void;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    login: (site: SiteInfo, auth: AuthInfo) => void;
    logout: (site: DetailedSiteInfo) => void;
    createPullRequest: () => void;
    viewPullRequest: () => void;
    createJiraIssue: () => void;
    viewJiraIssue: () => void;
    closePage: () => void;
    openSettings: (section?: ConfigSection, subsection?: ConfigSubSection) => void;
    setIsLoginComplete: React.Dispatch<React.SetStateAction<boolean>>;
    isLoginComplete: boolean;
}

const emptyApi: OnboardingControllerApi = {
    postMessage: (s) => {
        return;
    },
    updateConfig: (changes, removes?) => {
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
    logout: (site: DetailedSiteInfo) => {
        return;
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
    closePage: (): void => {
        return;
    },
    openSettings: (section?, subsection?): void => {
        return;
    },
    setIsLoginComplete: (): boolean => {
        return false;
    },
    isLoginComplete: false,
};

export const OnboardingControllerContext = React.createContext(emptyApi);

export interface OnboardingState extends OnboardingInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: OnboardingState = {
    ...emptyOnboardingInitMessage,
    isSomethingLoading: false,
};

enum OnboardingUIActionType {
    Init = 'init',
    ConfigChange = 'configChange',
    Loading = 'loading',
    SitesUpdate = 'sitesUpdate',
    LocalChange = 'localChange',
}

type OnboardingUIAction =
    | ReducerAction<OnboardingUIActionType.Init, { data: OnboardingInitMessage }>
    | ReducerAction<OnboardingUIActionType.ConfigChange, { config: FlattenedConfig; target: ConfigTarget }>
    | ReducerAction<OnboardingUIActionType.LocalChange, { changes: { [key: string]: any } }>
    | ReducerAction<OnboardingUIActionType.Loading>
    | ReducerAction<
          OnboardingUIActionType.SitesUpdate,
          { jiraSites: SiteWithAuthInfo[]; bitbucketSites: SiteWithAuthInfo[] }
      >;

export type ConfigChanges = { [key: string]: any };

function onboardingReducer(state: OnboardingState, action: OnboardingUIAction): OnboardingState {
    switch (action.type) {
        case OnboardingUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case OnboardingUIActionType.LocalChange: {
            return { ...state, config: { ...state.config, ...action.changes } };
        }
        case OnboardingUIActionType.ConfigChange: {
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
        case OnboardingUIActionType.SitesUpdate: {
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
        case OnboardingUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function useOnboardingController(): [OnboardingState, OnboardingControllerApi] {
    const [state, dispatch] = useReducer(onboardingReducer, emptyState);

    const [isLoginComplete, setIsLoginComplete] = React.useState(false);

    const onMessageHandler = useCallback((message: OnboardingMessage): void => {
        switch (message.type) {
            case OnboardingMessageType.Init: {
                dispatch({ type: OnboardingUIActionType.Init, data: message });
                break;
            }
            case OnboardingMessageType.Update: {
                dispatch({ type: OnboardingUIActionType.ConfigChange, config: message.config, target: message.target });
                break;
            }
            case OnboardingMessageType.SitesUpdate: {
                dispatch({
                    type: OnboardingUIActionType.SitesUpdate,
                    jiraSites: message.jiraSites,
                    bitbucketSites: message.bitbucketSites,
                });
                break;
            }
            case OnboardingMessageType.LoginResponse: {
                setIsLoginComplete(true);
                break;
            }
            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<OnboardingAction, OnboardingMessage, OnboardingResponse>(onMessageHandler);

    const handleConfigChange = useCallback(
        (changes: ConfigChanges, removes?: string[]): void => {
            dispatch({ type: OnboardingUIActionType.LocalChange, changes: changes });
            postMessage({
                type: OnboardingActionType.SaveSettings,
                changes: changes,
                removes: removes,
                target: state.target,
            });
        },
        [postMessage, state.target],
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: OnboardingUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({ type: CommonActionType.ExternalLink, source: WebViewID.OnboardingWebview, linkId: linkId }),
        [postMessage],
    );

    const login = useCallback(
        (site: SiteInfo, auth: AuthInfo) => {
            dispatch({ type: OnboardingUIActionType.Loading });
            setIsLoginComplete(false);
            postMessage({ type: OnboardingActionType.Login, siteInfo: site, authInfo: auth });
        },
        [postMessage],
    );

    const logout = useCallback(
        (site: DetailedSiteInfo) => {
            dispatch({ type: OnboardingUIActionType.Loading });
            postMessage({ type: OnboardingActionType.Logout, siteInfo: site });
        },
        [postMessage],
    );

    const createPullRequest = useCallback((): void => {
        dispatch({ type: OnboardingUIActionType.Loading });
        postMessage({ type: OnboardingActionType.CreatePullRequest });
    }, [postMessage]);

    const viewPullRequest = useCallback((): void => {
        dispatch({ type: OnboardingUIActionType.Loading });
        postMessage({ type: OnboardingActionType.ViewPullRequest });
    }, [postMessage]);

    const createJiraIssue = useCallback((): void => {
        dispatch({ type: OnboardingUIActionType.Loading });
        postMessage({ type: OnboardingActionType.CreateJiraIssue });
    }, [postMessage]);

    const viewJiraIssue = useCallback((): void => {
        dispatch({ type: OnboardingUIActionType.Loading });
        postMessage({ type: OnboardingActionType.ViewJiraIssue });
    }, [postMessage]);

    const closePage = useCallback((): void => {
        dispatch({ type: OnboardingUIActionType.Loading });
        postMessage({ type: OnboardingActionType.ClosePage });
    }, [postMessage]);

    const openSettings = useCallback(
        (section?: ConfigSection, subsection?: ConfigSubSection): void => {
            dispatch({ type: OnboardingUIActionType.Loading });
            postMessage({ type: OnboardingActionType.OpenSettings, section: section, subsection: subsection });
        },
        [postMessage],
    );

    const controllerApi = useMemo<OnboardingControllerApi>((): OnboardingControllerApi => {
        return {
            postMessage: postMessage,
            updateConfig: handleConfigChange,
            refresh: sendRefresh,
            openLink: openLink,
            login: login,
            logout: logout,
            createJiraIssue: createJiraIssue,
            createPullRequest: createPullRequest,
            viewPullRequest: viewPullRequest,
            viewJiraIssue: viewJiraIssue,
            closePage: closePage,
            openSettings: openSettings,
            setIsLoginComplete: setIsLoginComplete,
            isLoginComplete: isLoginComplete,
        };
    }, [
        handleConfigChange,
        login,
        logout,
        openLink,
        postMessage,
        sendRefresh,
        createJiraIssue,
        createPullRequest,
        viewPullRequest,
        viewJiraIssue,
        closePage,
        openSettings,
        setIsLoginComplete,
        isLoginComplete,
    ]);

    return [state, controllerApi];
}
