import { ProductBitbucket } from '../../../../atlclients/authInfo';
import {
    Pipeline,
    PipelineLogRange,
    PipelineLogReference,
    PipelineLogStage,
    PipelineStep,
} from '../../../../pipelines/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { PipelineSummaryAction, PipelineSummaryActionType } from '../../../ipc/fromUI/pipelineSummary';
import { CommonMessage } from '../../../ipc/toUI/common';
import {
    PipelineSummaryMessage,
    PipelineSummaryMessageType,
    PipelineSummaryResponse,
} from '../../../ipc/toUI/pipelineSummary';
import { Logger } from '../../../logger';
import { MessagePoster, WebviewController } from '../webviewController';
import { PipelinesSummaryActionApi } from './pipelinesSummaryActionApi';

export const id: string = 'pipelineSummaryV2';
export const title: string = 'Pipeline Summary';

export class PipelineSummaryWebviewController implements WebviewController<Pipeline> {
    public readonly requiredFeatureFlags = [];
    public readonly requiredExperiments = [];

    private steps: PipelineStep[];

    constructor(
        private messagePoster: MessagePoster,
        private api: PipelinesSummaryActionApi,
        private logger: Logger,
        private analytics: AnalyticsApi,
        private pipeline?: Pipeline,
    ) {
        this.steps = [];
    }

    private postMessage(message: PipelineSummaryMessage | PipelineSummaryResponse | CommonMessage) {
        this.messagePoster(message);
    }

    public title(): string {
        if (this.pipeline) {
            return `Pipeline ${this.pipeline.build_number}`;
        } else {
            return `Bitbucket Pipeline`;
        }
    }

    public screenDetails() {
        return { id: 'pipelineSummaryScreen', site: this.pipeline?.site.details, product: ProductBitbucket };
    }

    // From UI
    public async onMessageReceived(msg: PipelineSummaryAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                if (this.pipeline) {
                    const newPipeline = await this.api.refresh(this.pipeline);
                    if (newPipeline) {
                        this.update(newPipeline);
                    }
                }
                break;
            }
            case PipelineSummaryActionType.FetchLogRange: {
                if (!this.pipeline) {
                    this.logger.error(new Error(`Missing a pipeline. no idea`));
                    return;
                }
                const logRef = msg.reference;
                const range = this.rangeForReference(logRef);

                const logs = await this.api.fetchLogRange(this.pipeline.site, this.pipeline.uuid, msg.uuid, range);

                this.attachLogsForReference(logRef, logs);

                this.postMessage({
                    type: PipelineSummaryMessageType.StepsUpdate,
                    steps: this.steps,
                });
                break;
            }
            case PipelineSummaryActionType.ReRunPipeline: {
                if (!this.pipeline) {
                    this.logger.error(new Error(`Missing a pipeline. no idea`));
                    return;
                }

                this.analytics.firePipelineRerunEvent(this.pipeline.site.details, 'summaryWebview');

                this.api.rerunPipeline(this.pipeline);
            }
        }
    }

    public async update(pipeline: Pipeline) {
        this.pipeline = pipeline;

        this.postMessage({
            type: PipelineSummaryMessageType.Update,
            pipeline: this.pipeline,
        });

        this.steps = await this.api.fetchSteps(pipeline.site, pipeline.uuid, pipeline.build_number);
        this.postMessage({
            type: PipelineSummaryMessageType.StepsUpdate,
            steps: this.steps,
        });
    }

    private attachLogsForReference(logRef: PipelineLogReference, logs: string) {
        if (logRef.stepIndex < this.steps.length) {
            const step = this.steps[logRef.stepIndex];
            switch (logRef.stage) {
                case PipelineLogStage.SETUP: {
                    step.setup_logs = logs;
                    break;
                }
                case PipelineLogStage.TEARDOWN: {
                    step.teardown_logs = logs;
                    break;
                }
                case PipelineLogStage.BUILD: {
                    const commandIndex = logRef.commandIndex ?? 0;
                    if (commandIndex < step.script_commands.length) {
                        step.script_commands[commandIndex].logs = logs;
                    }
                }
            }
        }
    }

    private rangeForReference(logRef: PipelineLogReference): PipelineLogRange {
        let logRange: PipelineLogRange | undefined = undefined;

        if (logRef.stepIndex < this.steps.length) {
            const step = this.steps[logRef.stepIndex];
            switch (logRef.stage) {
                case PipelineLogStage.SETUP: {
                    logRange = step.setup_log_range;
                    break;
                }
                case PipelineLogStage.TEARDOWN: {
                    logRange = step.teardown_log_range;
                    break;
                }
                case PipelineLogStage.BUILD: {
                    const commandIndex = logRef.commandIndex ?? 0;
                    if (commandIndex < step.script_commands.length) {
                        logRange = step.script_commands[commandIndex].log_range;
                    }
                }
            }
        }

        return logRange ?? { firstByte: 0, lastByte: 0, byteCount: 0 };
    }
}
