import { CloudRepositoriesApi } from '../bitbucket/bitbucket-cloud/repositories';
import { HTTPClient } from '../bitbucket/httpClient';
import { BitbucketSite } from '../bitbucket/model';
import { Logger } from '../logger';
import {
    PaginatedPipelines,
    Pipeline,
    PipelineCommand,
    PipelineCommitTarget,
    PipelineLogRange,
    PipelinePullRequestTarget,
    PipelineReferenceTarget,
    PipelineReferenceType,
    PipelineResult,
    PipelineSelector,
    PipelineSelectorType,
    PipelineStep,
    PipelineStepLogRanges,
    PipelineTarget,
    PipelineTargetType,
} from './model';

export class PipelineApiImpl {
    constructor(private client: HTTPClient) {}

    async getRecentActivity(site: BitbucketSite): Promise<Pipeline[]> {
        return this.getSinglepagePipelines(site);
    }

    async getPipeline(site: BitbucketSite, uuid: string): Promise<Pipeline> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pipelines/${uuid}`);

        return this.cleanPipelineData(site, data);
    }

    async triggerPipeline(site: BitbucketSite, target: any): Promise<Pipeline> {
        const { ownerSlug, repoSlug } = site;
        const { data } = await this.client.post(`/repositories/${ownerSlug}/${repoSlug}/pipelines/`, {
            target: target,
        });
        return this.cleanPipelineData(site, data);
    }

    async getSteps(site: BitbucketSite, uuid: string): Promise<PipelineStep[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pipelines/${uuid}/steps/`);

        return data.values!.map((s: any) => PipelineApiImpl.pipelineStepForPipelineStep(s));
    }

    async getListForRemote(site: BitbucketSite, branchName: string): Promise<Pipeline[]> {
        return this.getSinglepagePipelines(site, { 'target.branch': branchName });
    }

    // A simplified version of getPaginatedPipelines() which assumes you just want some pipelines
    private async getSinglepagePipelines(site: BitbucketSite, query?: any): Promise<Pipeline[]> {
        const firstPaginatedPage = await this.getPaginatedPipelines(site, query);
        return firstPaginatedPage.values;
    }

    // Returns a paginated pipeline which contains information like page length and page number
    async getPaginatedPipelines(site: BitbucketSite, query?: any): Promise<PaginatedPipelines> {
        const { ownerSlug, repoSlug } = site;

        const { data: responseBody } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pipelines/`, {
            ...query,
            fields: ['+values.target.commit.message', '+values.target.commit.summary.*'],
            sort: '-created_on',
        });

        //Take the response and clean it up; in particular, clean up the pipelines it sends back
        let cleanedPipelines: Pipeline[] = [];
        if (responseBody.values) {
            cleanedPipelines = responseBody.values.map((pipeline: any) => this.cleanPipelineData(site, pipeline));
        }

        const cleanedPaginatedPipelines: PaginatedPipelines = {
            pagelen: responseBody.pagelen,
            page: responseBody.page,
            size: responseBody.size,
            values: cleanedPipelines,
        };
        return cleanedPaginatedPipelines;
    }

    async getPipelineLogRange(
        site: BitbucketSite,
        pipelineUuid: string,
        stepUuid: string,
        range: PipelineLogRange,
    ): Promise<string> {
        const { ownerSlug, repoSlug } = site;
        const { data } = await this.client.getOctetStream(
            `/repositories/${ownerSlug}/${repoSlug}/pipelines/${pipelineUuid}/steps/${stepUuid}/log`,
            { start: range.firstByte, end: range.lastByte },
        );

        return data;
    }

    /**
     * This is an undocumented API call. It probably won't disappear, but code like you expect it to.
     * @param site the bitbucket site
     * @param buildNumber the build number for which you want log ranges.
     */
    async getLogRanges(site: BitbucketSite, buildNumber: number): Promise<PipelineStepLogRanges[]> {
        const { ownerSlug, repoSlug } = site;
        let url: string | undefined =
            `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pipelines/${buildNumber}/steps/`;
        let steps: any[] = [];
        do {
            const data: any = (await this.client.getUrl(url)).data;
            steps = steps.concat(data.values);
            url = data.next;
        } while (url);
        const stepRanges: PipelineStepLogRanges[] = [];
        if (Array.isArray(steps)) {
            steps.forEach((step) => {
                const phases = step.tasks?.execution_phases;
                const setupLogRange = this.splitPhase(phases.SETUP)[0];
                const buildLogRanges = this.splitPhase(phases.MAIN);
                const teardownLogRange = this.splitPhase(phases.TEARDOWN)[0];
                stepRanges.push({
                    setupLogRange: setupLogRange,
                    buildLogRanges: buildLogRanges,
                    teardownLogRange: teardownLogRange,
                });
            });
        }
        return stepRanges;
    }

    private splitPhase(phase: any): PipelineLogRange[] {
        if (Array.isArray(phase)) {
            return phase
                .map((phaseBit) => {
                    if (phaseBit.log_range) {
                        return {
                            firstByte: phaseBit.log_range.first_byte_position,
                            byteCount: phaseBit.log_range.byte_count,
                            lastByte: phaseBit.log_range.last_byte_position,
                        };
                    } else {
                        return undefined;
                    }
                })
                .filter((x) => x !== undefined) as PipelineLogRange[];
        }
        return [];
    }

    readSelectorType(type: string): PipelineSelectorType {
        switch (type) {
            case PipelineSelectorType.Bookmark:
                return PipelineSelectorType.Bookmark;
            case PipelineSelectorType.Branch:
                return PipelineSelectorType.Branch;
            case PipelineSelectorType.Custom:
                return PipelineSelectorType.Custom;
            case PipelineSelectorType.PullRequests:
                return PipelineSelectorType.PullRequests;
            case PipelineSelectorType.Tag:
                return PipelineSelectorType.Tag;
        }
        return PipelineSelectorType.Default;
    }

    readTargetType(targetType: string): PipelineTargetType | undefined {
        switch (targetType) {
            case PipelineTargetType.Commit:
                return PipelineTargetType.Commit;
            case PipelineTargetType.PullRequest:
                return PipelineTargetType.PullRequest;
            case PipelineTargetType.Reference:
                return PipelineTargetType.Reference;
        }
        Logger.debug(`Couldn't identify PipelineTargetType ${targetType}`);
        return undefined;
    }

    readReferenceType(referenceType: string): PipelineReferenceType | undefined {
        switch (referenceType) {
            case PipelineReferenceType.AnnotatedTag:
                return PipelineReferenceType.AnnotatedTag;
            case PipelineReferenceType.Bookmark:
                return PipelineReferenceType.Bookmark;
            case PipelineReferenceType.Branch:
                return PipelineReferenceType.Branch;
            case PipelineReferenceType.NamedBranch:
                return PipelineReferenceType.NamedBranch;
            case PipelineReferenceType.Tag:
                return PipelineReferenceType.Tag;
        }
        Logger.debug(`Couldn't identify PipelineReferenceType ${referenceType}`);
        return undefined;
    }

    readSelector(selector: any): PipelineSelector | undefined {
        if (!selector) {
            return undefined;
        }
        return {
            pattern: selector.pattern,
            type: this.readSelectorType(selector.type),
        } as PipelineSelector;
    }

    readTarget(target: any): PipelineTarget {
        const partialTarget = {
            type: this.readTargetType(target.type),
            ref_name: target.ref_name,
            selector: this.readSelector(target.selector),
            branchName: target.branch,
            commit: target.commit,
        };
        switch (partialTarget.type) {
            case PipelineTargetType.Commit:
                return partialTarget as PipelineCommitTarget;
            case PipelineTargetType.PullRequest:
                return {
                    ...partialTarget,
                    ...{
                        source: target.source,
                        destination: target.destination,
                        destination_revision: target.destination_revision,
                        pull_request_id: target.pull_request_id,
                    },
                } as PipelinePullRequestTarget;
            case PipelineTargetType.Reference:
                return {
                    ...partialTarget,
                    ...{
                        ref_name: target.ref_name,
                        ref_type: this.readReferenceType(target.ref_type),
                    },
                } as PipelineReferenceTarget;
        }
        Logger.debug(`Failed to read pipeline target ${JSON.stringify(target)}`);
        return target;
    }

    cleanPipelineData(site: BitbucketSite, pipeline: any): Pipeline {
        let name = undefined;
        let avatar = undefined;
        if (pipeline.creator) {
            name = pipeline.creator.display_name;
            if (pipeline.creator.links && pipeline.creator.links.avatar) {
                avatar = pipeline.creator.links.avatar.href;
            }
        }

        const target: PipelineTarget = this.readTarget(pipeline.target);

        const cleanedPipeline: Pipeline = {
            site: site,
            repository: CloudRepositoriesApi.toRepo(pipeline.repository!),
            build_number: pipeline.build_number!,
            created_on: pipeline.created_on!,
            creator_name: name,
            creator_avatar: avatar,
            completed_on: pipeline.completed_on,
            state: {
                name: pipeline.state!.name,
                type: pipeline.state!.type,
                result: PipelineApiImpl.resultForResult(pipeline.state!.result),
                stage: PipelineApiImpl.resultForResult(pipeline.state!.stage),
            },
            target: target,
            triggerName: pipeline.trigger.name,
            duration_in_seconds: pipeline.duration_in_seconds,
            uuid: pipeline.uuid!,
        };
        return cleanedPipeline;
    }

    private static resultForResult(result?: any): PipelineResult | undefined {
        if (!result) {
            return undefined;
        }

        return {
            name: result.name,
            type: result.type,
        };
    }

    private static pipelineStepForPipelineStep(step: any): PipelineStep {
        return {
            run_number: step.run_number,
            uuid: step.uuid,
            name: step.name,
            completed_on: step.completed_on,
            duration_in_seconds: step.duration_in_seconds,
            state: {
                name: step.state!.name,
                type: step.state!.type,
                result: PipelineApiImpl.resultForResult(step.state!.result),
                stage: PipelineApiImpl.resultForResult(step.state!.stage),
            },
            setup_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.setup_commands),
            teardown_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.teardown_commands),
            script_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.script_commands),
        };
    }

    private static pipelineCommandsForPipelineCommands(commands?: any[]): PipelineCommand[] {
        if (!commands) {
            return [];
        }
        return commands.map((command: any) => {
            return {
                action: command.action,
                command: command.command,
                name: command.name,
            };
        });
    }
}
