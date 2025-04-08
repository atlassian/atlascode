import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

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
