import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { Pipeline, PipelineStep } from '../../../pipelines/model';

export enum PipelineSummaryMessageType {
    Update = 'pipelineUpdate',
    StepsUpdate = 'stepsUpdate',
}

export type PipelineSummaryMessage =
    | ReducerAction<PipelineSummaryMessageType.Update, PipelineSummaryUpdateMessage>
    | ReducerAction<PipelineSummaryMessageType.StepsUpdate, PipelineSummaryStepsUpdateMessage>;

export type PipelineSummaryResponse = {};

export interface PipelineSummaryInitMessage {
    pipeline: Pipeline;
}

export interface PipelineSummaryUpdateMessage {
    pipeline: Pipeline;
}

export interface PipelineSummaryStepsUpdateMessage {
    steps: PipelineStep[];
}
