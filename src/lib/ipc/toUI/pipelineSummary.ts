import { ReducerAction } from 'src/ipc/messaging';

import { Pipeline, PipelineStep } from '../../../pipelines/model';

export enum PipelineSummaryMessageType {
    Update = 'pipelineUpdate',
    StepsUpdate = 'stepsUpdate',
}

export type PipelineSummaryMessage =
    | ReducerAction<PipelineSummaryMessageType.Update, PipelineSummaryUpdateMessage>
    | ReducerAction<PipelineSummaryMessageType.StepsUpdate, PipelineSummaryStepsUpdateMessage>;

export interface PipelineSummaryInitMessage {
    pipeline: Pipeline;
}

export interface PipelineSummaryUpdateMessage {
    pipeline: Pipeline;
}

export interface PipelineSummaryStepsUpdateMessage {
    steps: PipelineStep[];
}
