import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { v4 } from 'uuid';

import { BitbucketIssueData, Comment, emptyComment, emptyUser, User } from '../../../bitbucket/model';
import { BitbucketIssueAction, BitbucketIssueActionType } from '../../../lib/ipc/fromUI/bbIssue';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    AddCommentResponseMessage,
    AssignResponseMessage,
    BitbucketIssueChangesMessage,
    BitbucketIssueCommentsMessage,
    BitbucketIssueInitMessage,
    BitbucketIssueMessage,
    BitbucketIssueMessageType,
    emptyBitbucketIssueCommentsMessage,
    emptyBitbucketIssueInitMessage,
    FetchUsersResponseMessage,
    UpdateStatusResponseMessage,
} from '../../../lib/ipc/toUI/bbIssue';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface BitbucketIssueControllerApi {
    postMessage: PostMessageFunc<BitbucketIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    copyLink: (url: string) => void;
    updateStatus: (status: string) => Promise<string>;
    postComment: (content: string) => Promise<Comment>;
    fetchUsers: (query: string, abortSignal?: AbortSignal) => Promise<User[]>;
    assign: (accountId?: string) => Promise<User>;
    applyChange: (change: { issue?: Partial<BitbucketIssueData>; comments?: Comment[] }) => void;
    startWork: () => void;
    createJiraIssue: () => void;
}

const emptyApi: BitbucketIssueControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    copyLink: () => {},
    updateStatus: async (status: string) => status,
    postComment: async (content: string) => emptyComment,
    fetchUsers: async (query: string, abortSignal?: AbortSignal) => [],
    assign: async (accountId?: string) => emptyUser,
    applyChange: (change: { issue: Partial<BitbucketIssueData>; comments: Comment[] }) => {},
    startWork: () => {},
    createJiraIssue: () => {},
};

export const BitbucketIssueControllerContext = React.createContext(emptyApi);

export interface BitbucketIssueState extends BitbucketIssueInitMessage {
    comments: Comment[];
    isSomethingLoading: boolean;
}

const emptyState: BitbucketIssueState = {
    ...emptyBitbucketIssueInitMessage,
    ...emptyBitbucketIssueCommentsMessage,
    isSomethingLoading: false,
};

enum BitbucketIssueUIActionType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateComments = 'updateComments',
    LocalChange = 'localChange',
    Loading = 'loading',
}

type BitbucketIssueUIAction =
    | ReducerAction<BitbucketIssueUIActionType.Init, { data: BitbucketIssueInitMessage }>
    | ReducerAction<BitbucketIssueUIActionType.InitComments, { data: BitbucketIssueCommentsMessage }>
    | ReducerAction<BitbucketIssueUIActionType.UpdateComments, { data: BitbucketIssueCommentsMessage }>
    | ReducerAction<BitbucketIssueUIActionType.LocalChange, { data: BitbucketIssueChangesMessage }>
    | ReducerAction<BitbucketIssueUIActionType.Loading, {}>;

function reducer(state: BitbucketIssueState, action: BitbucketIssueUIAction): BitbucketIssueState {
    switch (action.type) {
        case BitbucketIssueUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case BitbucketIssueUIActionType.InitComments: {
            return {
                ...state,
                comments: action.data.comments,
                isSomethingLoading: false,
            };
        }
        case BitbucketIssueUIActionType.UpdateComments: {
            return {
                ...state,
                comments: [...state.comments, ...action.data.comments],
                isSomethingLoading: false,
            };
        }
        case BitbucketIssueUIActionType.LocalChange: {
            return {
                ...state,
                issue: action.data.issue
                    ? {
                          ...state.issue,
                          data: { ...state.issue.data, ...action.data.issue },
                      }
                    : state.issue,
                comments: action.data.comments ? [...state.comments, ...action.data.comments] : state.comments,
                isSomethingLoading: false,
            };
        }
        case BitbucketIssueUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useBitbucketIssueController(): [BitbucketIssueState, BitbucketIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: BitbucketIssueMessage): void => {
        switch (message.type) {
            case BitbucketIssueMessageType.Init: {
                dispatch({ type: BitbucketIssueUIActionType.Init, data: message });
                break;
            }
            case BitbucketIssueMessageType.InitComments: {
                dispatch({ type: BitbucketIssueUIActionType.InitComments, data: message });
                break;
            }
            case BitbucketIssueMessageType.UpdateComments: {
                dispatch({ type: BitbucketIssueUIActionType.UpdateComments, data: message });
                break;
            }
            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<BitbucketIssueAction, BitbucketIssueMessage, {}>(
        onMessageHandler,
    );

    const updateStatus = useCallback(
        (status: string): Promise<string> => {
            return new Promise<string>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            { type: BitbucketIssueActionType.UpdateStatusRequest, status: status },
                            BitbucketIssueMessageType.UpdateStatusResponse,
                            ConnectionTimeout,
                        );
                        resolve((response as UpdateStatusResponseMessage).status);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const postComment = useCallback(
        (content: string): Promise<Comment> => {
            return new Promise<Comment>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            { type: BitbucketIssueActionType.AddCommentRequest, content: content },
                            BitbucketIssueMessageType.AddCommentResponse,
                            ConnectionTimeout,
                        );
                        resolve((response as AddCommentResponseMessage).comment);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const assign = useCallback(
        (accountId?: string): Promise<User> => {
            return new Promise<User>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            { type: BitbucketIssueActionType.AssignRequest, accountId: accountId },
                            BitbucketIssueMessageType.AssignResponse,
                            ConnectionTimeout,
                        );
                        resolve((response as AssignResponseMessage).assignee);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const fetchUsers = useCallback(
        (query: string, abortSignal?: AbortSignal): Promise<User[]> => {
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
                                type: BitbucketIssueActionType.FetchUsersRequest,
                                query: query,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            BitbucketIssueMessageType.FetchUsersResponse,
                            ConnectionTimeout,
                        );
                        resolve((response as FetchUsersResponseMessage).users);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const applyChange = useCallback(
        (change: { issue: Partial<BitbucketIssueData>; comments: Comment[] }) => {
            dispatch({
                type: BitbucketIssueUIActionType.LocalChange,
                data: change,
            });
        },
        [dispatch],
    );

    const startWork = useCallback(() => {
        postMessage({ type: BitbucketIssueActionType.StartWork });
    }, [postMessage]);

    const createJiraIssue = useCallback(() => {
        postMessage({ type: BitbucketIssueActionType.CreateJiraIssue });
    }, [postMessage]);

    const copyLink = useCallback(
        (url: string) => postMessage({ type: CommonActionType.CopyLink, linkType: 'bbIssue', url }),
        [postMessage],
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: BitbucketIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.BitbucketIssueWebview,
                linkId: linkId,
            }),
        [postMessage],
    );

    const controllerApi = useMemo<BitbucketIssueControllerApi>((): BitbucketIssueControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openLink,
            copyLink,
            updateStatus,
            postComment,
            fetchUsers,
            assign,
            applyChange,
            startWork,
            createJiraIssue,
        };
    }, [
        openLink,
        copyLink,
        postMessage,
        sendRefresh,
        updateStatus,
        postComment,
        fetchUsers,
        assign,
        applyChange,
        startWork,
        createJiraIssue,
    ]);

    return [state, controllerApi];
}
