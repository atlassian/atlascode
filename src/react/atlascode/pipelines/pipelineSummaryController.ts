import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PipelineSummaryAction, PipelineSummaryActionType } from '../../../lib/ipc/fromUI/pipelineSummary';
import { emptyPipeline } from '../../../lib/ipc/models/pipelineSummary';
import {
    PipelineSummaryInitMessage,
    PipelineSummaryMessage,
    PipelineSummaryMessageType,
    PipelineSummaryResponse,
} from '../../../lib/ipc/toUI/pipelineSummary';
import { PipelineLogReference, PipelineStep } from '../../../pipelines/model';
import { useMessagingApi } from '../messagingApi';

export interface PipelineSummaryControllerApi {
    refresh: () => void;
    rerun: () => void;
    fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void;
    postMessage: (a: PipelineSummaryAction) => void;
}

const emptyApi: PipelineSummaryControllerApi = {
    refresh: (): void => {
        return;
    },
    rerun: (): void => {
        return;
    },
    fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => {
        return Promise.resolve('');
    },
    postMessage: () => {},
};

enum PipelineSummaryUIActionType {
    Update = 'update',
    StepsUpdate = 'stepsUpdate',
    Refreshing = 'refreshing',
}

type PipelineSummaryUIAction =
    | ReducerAction<PipelineSummaryUIActionType.Update, { data: any }>
    | ReducerAction<PipelineSummaryUIActionType.StepsUpdate, { steps: PipelineStep[] }>
    | ReducerAction<PipelineSummaryUIActionType.Refreshing, { data: any }>;

export const PipelineSummaryControllerContext = React.createContext(emptyApi);

export interface PipelineSummaryState extends PipelineSummaryInitMessage {
    // pipeline is inherited from initMessage.
    isSomethingLoading: boolean;
    isRefreshing: boolean;
    steps?: PipelineStep[];
}

const emptyState: PipelineSummaryState = {
    pipeline: emptyPipeline,
    isSomethingLoading: false,
    isRefreshing: false,
};

function pipelineSummaryReducer(state: PipelineSummaryState, action: PipelineSummaryUIAction): PipelineSummaryState {
    switch (action.type) {
        case PipelineSummaryUIActionType.Update: {
            const newState = {
                ...state,
                pipeline: action.data,
                steps: undefined,
                isRefreshing: false,
            };
            return newState;
        }
        case PipelineSummaryUIActionType.StepsUpdate: {
            const newState = {
                ...state,
                steps: action.steps,
            };
            return newState;
        }
        case PipelineSummaryUIActionType.Refreshing: {
            const newState = {
                ...state,
                isRefreshing: true,
            };
            return newState;
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function usePipelineSummaryController(): [PipelineSummaryState, PipelineSummaryControllerApi] {
    const [state, dispatch] = useReducer(pipelineSummaryReducer, emptyState);

    const onMessageHandler = useCallback((message: PipelineSummaryMessage): void => {
        switch (message.type) {
            case PipelineSummaryMessageType.Update: {
                dispatch({ type: PipelineSummaryUIActionType.Update, data: message.pipeline });
                break;
            }
            case PipelineSummaryMessageType.StepsUpdate: {
                dispatch({ type: PipelineSummaryUIActionType.StepsUpdate, steps: message.steps });
                break;
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<PipelineSummaryAction, PipelineSummaryMessage, PipelineSummaryResponse>(
        onMessageHandler,
    );

    const sendRefresh = useCallback((): void => {
        dispatch({
            type: PipelineSummaryUIActionType.Refreshing,
            data: {},
        });
        postMessage({
            type: CommonActionType.Refresh,
        });
    }, [postMessage]);

    const rerun = useCallback((): void => {
        postMessage({
            type: PipelineSummaryActionType.ReRunPipeline,
        });
    }, [postMessage]);

    const fetchLogs = useCallback(
        (stepUuid: string, logReference: PipelineLogReference) => {
            postMessage({
                type: PipelineSummaryActionType.FetchLogRange,
                uuid: stepUuid,
                reference: logReference,
            });
        },
        [postMessage],
    );

    const pipelineSummaryApi = useMemo<PipelineSummaryControllerApi>((): PipelineSummaryControllerApi => {
        return {
            refresh: sendRefresh,
            rerun: rerun,
            fetchLogs: fetchLogs,
            postMessage: postMessage,
        };
    }, [sendRefresh, rerun, fetchLogs, postMessage]);

    return [state, pipelineSummaryApi];
}
