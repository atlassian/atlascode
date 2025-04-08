import { Uri } from 'vscode';

import { Container } from '../../container';
import { Pipeline, PipelineSelectorType, PipelineTarget, Status, statusForState } from '../../pipelines/model';
import { Resources } from '../../resources';

/**
 * Determines whether or not a branch name should be displayed according to the filtering
 * preferences of the user.
 * @param branchName The branch name to test.
 */
export function shouldDisplay(target: PipelineTarget | undefined): boolean {
    let branchName: string | undefined = undefined;
    if (target?.ref_name) {
        branchName = target.ref_name;
    } else if (target?.source || target?.destination) {
        // For type: pipeline_pullrequest_target allow matching on source or destination
        branchName = `${target.source ?? ''} ${target.destination ?? ''}`;
    }

    if (!Container.config.bitbucket.pipelines.hideFiltered) {
        return true;
    } else if (!branchName) {
        return false;
    }

    const filters = Container.config.bitbucket.pipelines.branchFilters.filter((f) => f.length > 0);
    const reString = filters.map((t) => t.replace(/(\W)/g, '\\$1')).join('|');
    const regex = new RegExp(reString);
    return regex.test(branchName);
}

export function filtersActive(): boolean {
    return Container.config.bitbucket.pipelines.hideFiltered;
}

export function descriptionForState(
    result: Pipeline,
    truncateCommitMessage: boolean,
    excludePipelinePrefix?: boolean,
): string {
    const descriptionForResult: Record<string, string> = {
        pipeline_state_completed_successful: 'was successful',
        pipeline_state_completed_failed: 'has failed',
        pipeline_state_completed_error: 'has failed',
        pipeline_state_completed_stopped: 'has been stopped',
    };

    let words = 'has done something';
    switch (result.state!.type) {
        case 'pipeline_state_completed':
            words = descriptionForResult[result.state!.result!.type];
            break;
        case 'pipeline_state_in_progress':
            words = 'is building';
            break;
        case 'pipeline_state_pending':
            words = 'is pending';
    }

    const descriptionString = `${generatePipelineTitle(result, truncateCommitMessage, excludePipelinePrefix)} ${words}`;
    return descriptionString;
}

export function generatePipelineTitle(
    pipeline: Pipeline,
    truncateCommitMessage: boolean,
    excludePipelinePrefix?: boolean,
): string {
    let description = '';
    let pattern = undefined;
    let type: PipelineSelectorType | undefined = undefined;
    if (pipeline.target.selector) {
        pattern = pipeline.target.selector.pattern;
        type = pipeline.target.selector.type;
    }

    const prefix = excludePipelinePrefix ? '' : `${pipeline.repository.name}: Pipeline `;
    const buildNumber = pipeline.build_number;
    const ref_name = pipeline.target.ref_name ?? pipeline.target.source; // source or destination?

    let commitMessage = pipeline.target.commit?.message;
    if (commitMessage) {
        if (truncateCommitMessage) {
            commitMessage = commitMessage.split('\n')[0];
        }
        return `${prefix}#${buildNumber} ${commitMessage.trimEnd()} on branch ${ref_name}`;
    }

    const triggerType = pipeline.triggerName;

    //Make sure every case is covered so that a meaningful message is displayed back
    if (type === PipelineSelectorType.Custom) {
        //This is a custom pipeline
        if (ref_name && pattern) {
            //Pipeline is on a branch
            description = `${prefix}#${buildNumber} ${pattern}(${type}) on branch ${ref_name}`;
        } else if (pattern) {
            description = `${prefix}#${buildNumber} ${pattern}(${type})`;
        } else {
            description = `${prefix}#${buildNumber}(${type})`;
        }
    } else if (triggerType === 'MANUAL') {
        //Pipeline is not custom but was manually triggered
        if (ref_name && pattern) {
            //Pipeline on a branch and pipeline is not default
            description = `${prefix}#${buildNumber}(manual) ${pattern} on branch ${ref_name}`;
        } else if (ref_name) {
            //Pipeline on a branch
            description = `${prefix}#${buildNumber}(manual) on branch ${ref_name}`;
        } else {
            description = `${prefix}#${buildNumber}(manual)`;
        }
    } else if (ref_name) {
        //Pipeline is on a branch
        description = `${prefix}#${buildNumber} on branch ${ref_name}`;
    } else {
        description = `${prefix}#${buildNumber}`; //Fallback case (All pipelines must have build numbers)
    }
    return description;
}

export function iconUriForPipeline(pipeline: Pipeline): Uri | { light: Uri; dark: Uri } | undefined {
    switch (statusForState(pipeline.state)) {
        case Status.Pending:
            return Resources.icons.get('pending');
        case Status.InProgress:
            return Resources.icons.get('building');
        case Status.Paused:
            return Resources.icons.get('paused');
        case Status.Stopped:
            return Resources.icons.get('stopped');
        case Status.Successful:
            return Resources.icons.get('success');
        case Status.Error:
            return Resources.icons.get('failed');
        case Status.Failed:
            return Resources.icons.get('failed');
        default:
            return undefined;
    }
}
