import { ReducerAction } from 'src/ipc/messaging';

import { PipelineLogReference } from '../../../pipelines/model';
import { CommonAction } from './common';

export enum PipelineSummaryActionType {
    FetchLogRange = 'fetchLogRange',
    ReRunPipeline = 'reRunPipeline',
}

export type PipelineSummaryAction =
    | ReducerAction<PipelineSummaryActionType.FetchLogRange, ViewLogsAction>
    | ReducerAction<PipelineSummaryActionType.ReRunPipeline, ReRunPipelineAction>
    | CommonAction;

export interface ViewLogsAction {
    uuid: string;
    reference: PipelineLogReference;
}

export interface ReRunPipelineAction {}
