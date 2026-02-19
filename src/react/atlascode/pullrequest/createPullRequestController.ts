import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { defaultActionGuard, defaultStateGuard, ReducerAction } from 'src/ipc/messaging';
import { v4 } from 'uuid';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { BitbucketSite, Commit, FileDiff, PullRequest, User } from '../../../bitbucket/model';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import {
    CreatePullRequestAction,
    CreatePullRequestActionType,
    SubmitCreateRequestAction,
} from '../../../lib/ipc/fromUI/createPullRequest';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    CreatePullRequestInitMessage,
    CreatePullRequestMessage,
    CreatePullRequestMessageType,
    CreatePullRequestResponse,
    emptyCreatePullRequestInitMessage,
} from '../../../lib/ipc/toUI/createPullRequest';
import { Branch } from '../../../typings/git';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface CreatePullRequestControllerApi {
    postMessage: PostMessageFunc<CreatePullRequestAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    fetchUsers: (site: BitbucketSite, query: string, abortSignal?: AbortSignal) => Promise<User[]>;
    fetchIssue: (branchName: string) => void;
    fetchDetails: (sourceBranch: Branch, destinationBranch: Branch) => void;
    openDiff: (filediff: FileDiff) => void;
    submit: (data: SubmitCreateRequestAction) => Promise<PullRequest>;
}

const emptyApi: CreatePullRequestControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    fetchUsers: async (site: BitbucketSite, query: string, abortSignal?: AbortSignal) => [],
    fetchIssue: () => {},
    fetchDetails: (sourceBranch: Branch, destinationBranch: Branch) => {},
    openDiff: (filediff: FileDiff) => {},
    submit: (data: SubmitCreateRequestAction) => {
        return undefined!;
    },
};

export const CreatePullRequestControllerContext = React.createContext(emptyApi);

export interface CreatePullRequestState extends CreatePullRequestInitMessage {
    issue: MinimalIssue<DetailedSiteInfo> | undefined;
    commits: Commit[];
    fileDiffs: FileDiff[];
    isSomethingLoading: boolean;
}

const emptyState: CreatePullRequestState = {
    ...emptyCreatePullRequestInitMessage,
    issue: undefined,
    commits: [],
    fileDiffs: [],
    isSomethingLoading: false,
};

enum CreatePullRequestUIActionType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateCommits = 'updateCommits',
    UpdateIssue = 'updateIssue',
    LocalChange = 'localChange',
    Loading = 'loading',
}

type CreatePullRequestUIAction =
    | ReducerAction<CreatePullRequestUIActionType.Init, { data: CreatePullRequestInitMessage }>
    | ReducerAction<CreatePullRequestUIActionType.UpdateIssue, { data: MinimalIssue<DetailedSiteInfo> }>
    | ReducerAction<CreatePullRequestUIActionType.UpdateCommits, { data: { commits: Commit[]; fileDiffs: FileDiff[] } }>
    | ReducerAction<CreatePullRequestUIActionType.LocalChange, { data: Partial<CreatePullRequestState> }>
    | ReducerAction<CreatePullRequestUIActionType.Loading, {}>;

function reducer(state: CreatePullRequestState, action: CreatePullRequestUIAction): CreatePullRequestState {
    switch (action.type) {
        case CreatePullRequestUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case CreatePullRequestUIActionType.UpdateIssue: {
            return {
                ...state,
                issue: action.data,
            };
        }
        case CreatePullRequestUIActionType.UpdateCommits: {
            return {
                ...state,
                commits: action.data.commits,
                fileDiffs: action.data.fileDiffs,
            };
        }
        case CreatePullRequestUIActionType.LocalChange: {
            return {
                ...state,
                ...action.data,
                isSomethingLoading: false,
            };
        }
        case CreatePullRequestUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useCreatePullRequestController(): [CreatePullRequestState, CreatePullRequestControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: CreatePullRequestMessage): void => {
        switch (message.type) {
            case CreatePullRequestMessageType.Init: {
                dispatch({ type: CreatePullRequestUIActionType.Init, data: message });
                break;
            }
            case CreatePullRequestMessageType.UpdateIssue: {
                dispatch({ type: CreatePullRequestUIActionType.UpdateIssue, data: message.issue });
                break;
            }
            case CreatePullRequestMessageType.UpdateDetails: {
                dispatch({ type: CreatePullRequestUIActionType.UpdateCommits, data: message });
                break;
            }
            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const { postMessage, postMessagePromise } = useMessagingApi<
        CreatePullRequestAction,
        CreatePullRequestMessage,
        CreatePullRequestResponse
    >(onMessageHandler);

    const fetchUsers = useCallback(
        (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return new Promise<User[]>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();

                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'bitbucket issue fetchUsers cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: CreatePullRequestActionType.FetchUsersRequest,
                                site: site,
                                query: query,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            CreatePullRequestMessageType.FetchUsersResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.users);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const fetchIssue = useCallback(
        (branchName: string): void => {
            dispatch({ type: CreatePullRequestUIActionType.LocalChange, data: { issue: undefined } });
            postMessage({ type: CreatePullRequestActionType.FetchIssue, branchName });
        },
        [postMessage],
    );

    const fetchDetails = useCallback(
        (sourceBranch: Branch, destinationBranch: Branch): void => {
            dispatch({ type: CreatePullRequestUIActionType.LocalChange, data: { commits: [], fileDiffs: [] } });
            postMessage({ type: CreatePullRequestActionType.FetchDetails, sourceBranch, destinationBranch });
        },
        [postMessage],
    );

    const openDiff = useCallback(
        (fileDiff: FileDiff): void => {
            postMessage({ type: CreatePullRequestActionType.OpenDiff, fileDiff });
        },
        [postMessage],
    );

    const submit = useCallback(
        (data: SubmitCreateRequestAction): Promise<PullRequest> => {
            return new Promise<PullRequest>((resolve, reject) => {
                (async () => {
                    postMessage({
                        type: CreatePullRequestActionType.CreatePullRequestButtonClicked,
                        isDraft: data.isDraft,
                        sourceSiteRemote: data.sourceSiteRemote,
                    });
                    try {
                        const response = await postMessagePromise(
                            {
                                type: CreatePullRequestActionType.SubmitCreateRequest,
                                ...data,
                            },
                            CreatePullRequestMessageType.SubmitResponse,
                            ConnectionTimeout,
                        );
                        resolve(response.pr);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise, postMessage],
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: CreatePullRequestUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.CreatePullRequest,
                linkId: linkId,
            }),
        [postMessage],
    );

    const controllerApi = useMemo<CreatePullRequestControllerApi>((): CreatePullRequestControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openLink,
            fetchUsers,
            fetchIssue,
            fetchDetails,
            openDiff,
            submit,
        };
    }, [openLink, postMessage, sendRefresh, fetchUsers, fetchIssue, fetchDetails, openDiff, submit]);

    return [state, controllerApi];
}
