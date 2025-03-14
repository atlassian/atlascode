import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';
import {
    CreateBitbucketIssueInitMessage,
    emptyCreateBitbucketIssueInitMessage,
    CreateBitbucketIssueMessage,
    CreateBitbucketIssueMessageType,
    CreateBitbucketIssueResponse,
    SubmitResponseMessage,
} from '../../../lib/ipc/toUI/createBitbucketIssue';
import {
    CreateBitbucketIssueAction,
    SubmitCreateRequestAction,
    CreateBitbucketIssueActionType,
} from '../../../lib/ipc/fromUI/createBitbucketIssue';
import { BitbucketIssue } from '../../../bitbucket/model';
import { ConnectionTimeout } from '../../../util/time';

export interface CreateBitbucketIssueControllerApi {
    postMessage: PostMessageFunc<CreateBitbucketIssueAction>;
    refresh: () => void;
    submit: (data: SubmitCreateRequestAction) => Promise<BitbucketIssue>;
}

const emptyApi: CreateBitbucketIssueControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    submit: () => {
        throw new Error('empty api implementation');
    },
};

export const CreateBitbucketIssueControllerContext = React.createContext(emptyApi);

export interface CreateBitbucketIssueState extends CreateBitbucketIssueInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: CreateBitbucketIssueState = {
    ...emptyCreateBitbucketIssueInitMessage,
    isSomethingLoading: false,
};

enum CreateBitbucketIssueUIActionType {
    Init = 'init',
    Loading = 'loading',
}

type CreateBitbucketIssueUIAction =
    | ReducerAction<CreateBitbucketIssueUIActionType.Init, { data: CreateBitbucketIssueInitMessage }>
    | ReducerAction<CreateBitbucketIssueUIActionType.Loading, {}>;

function reducer(state: CreateBitbucketIssueState, action: CreateBitbucketIssueUIAction): CreateBitbucketIssueState {
    switch (action.type) {
        case CreateBitbucketIssueUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
            };
            return newstate;
        }
        case CreateBitbucketIssueUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useCreateBitbucketIssueController(): [CreateBitbucketIssueState, CreateBitbucketIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: CreateBitbucketIssueMessage): void => {
        switch (message.type) {
            case CreateBitbucketIssueMessageType.Init: {
                dispatch({ type: CreateBitbucketIssueUIActionType.Init, data: message });
                break;
            }
            default: {
                // not needed if there's only one possible message type; uncomment if more message types are added
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<
        CreateBitbucketIssueAction,
        CreateBitbucketIssueMessage,
        CreateBitbucketIssueResponse
    >(onMessageHandler);

    const submit = useCallback(
        (data: SubmitCreateRequestAction): Promise<BitbucketIssue> => {
            return new Promise<BitbucketIssue>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: CreateBitbucketIssueActionType.SubmitCreateRequest,
                                ...data,
                            },
                            CreateBitbucketIssueMessageType.SubmitResponse,
                            ConnectionTimeout,
                        );
                        resolve((response as SubmitResponseMessage).issue);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const refresh = useCallback((): void => {
        dispatch({ type: CreateBitbucketIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const controllerApi = useMemo<CreateBitbucketIssueControllerApi>((): CreateBitbucketIssueControllerApi => {
        return {
            postMessage,
            refresh,
            submit,
        };
    }, [postMessage, refresh, submit]);

    return [state, controllerApi];
}
