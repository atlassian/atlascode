import { commands } from 'vscode';

import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { PipelinesSummaryActionApi } from '../../lib/webview/controller/pipelines/pipelinesSummaryActionApi';
import { Logger } from '../../logger';
import { Pipeline, PipelineLogRange, PipelineStep, PipelineStepLogRanges } from '../../pipelines/model';

export class PipelineSummaryActionImplementation implements PipelinesSummaryActionApi {
    constructor() {}

    async refresh(pipeline: Pipeline): Promise<Pipeline> {
        const bbApi = await clientForSite(pipeline.site);

        const refreshedPipeline = await bbApi.pipelines!.getPipeline(pipeline.site, pipeline.uuid);

        return refreshedPipeline;
    }

    async fetchSteps(site: BitbucketSite, uuid: string, buildNumber: number): Promise<PipelineStep[]> {
        const bbApi = await clientForSite(site);

        let logRanges: PipelineStepLogRanges[] = [];
        try {
            logRanges = await bbApi.pipelines!.getLogRanges(site as any, buildNumber);
        } catch (e) {
            Logger.error(e, `Failed to fetch log ranges.`);
        }
        const steps = await bbApi.pipelines!.getSteps(site as any, uuid);
        steps.forEach((step: PipelineStep, index) => {
            if (index < logRanges.length) {
                const stepRanges = logRanges[index];
                step.setup_log_range = stepRanges.setupLogRange;
                step.script_commands.forEach((command, cIndex) => {
                    if (cIndex < stepRanges.buildLogRanges.length) {
                        const buildRange = stepRanges.buildLogRanges[cIndex];
                        command.log_range = buildRange;
                    }
                });
                step.teardown_log_range = stepRanges.teardownLogRange;
            }
        });
        return steps;
    }

    async fetchLogRange(
        site: BitbucketSite,
        pipelineUuid: string,
        stepUuid: string,
        range: PipelineLogRange,
    ): Promise<string> {
        const bbApi = await clientForSite(site);

        const logs = await bbApi.pipelines!.getPipelineLogRange(site, pipelineUuid, stepUuid, range);
        return logs;
    }

    async rerunPipeline(pipeline: Pipeline) {
        const bbApi = await clientForSite(pipeline.site);
        try {
            const newPipeline = await bbApi.pipelines!.triggerPipeline(pipeline.site, pipeline.target);
            commands.executeCommand(Commands.ShowPipeline, newPipeline);
        } catch (e) {
            Logger.error(e, 'Error executing PipelineSummaryActionImplementation.rerunPipeline');
        }
    }
}
