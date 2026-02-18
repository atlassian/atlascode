import { commands, window } from 'vscode';

import { notificationBannerClickedEvent, notificationChangeEvent } from '../../analytics';
import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { Pipeline, PipelineTarget } from '../../pipelines/model';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';
import { descriptionForState, generatePipelineTitle, shouldDisplay } from '../pipelines/Helpers';
import { NotificationSurface } from './notificationManager';
import { NotificationSource } from './notificationSources';

const NotificationBannerId = 'atlascode.bitbucket.pipelinesNotification';

export class PipelinesMonitor implements BitbucketActivityMonitor {
    private _previousResults: Record<string, Pipeline[]> = {};

    constructor(private _repositories: WorkspaceRepo[]) {}

    async checkForNewActivity() {
        if (!Container.config.bitbucket.pipelines.monitorEnabled) {
            return;
        }

        for (let i = 0; i < this._repositories.length; i++) {
            const wsRepo = this._repositories[i];
            const previousResults = this._previousResults[wsRepo.rootUri];

            const site = wsRepo.mainSiteRemote.site;
            if (!site) {
                return;
            }

            const bbApi = await clientForSite(site);
            if (!bbApi.pipelines) {
                return; //Bitbucket Server instances will not have pipelines
            }

            const newResults = await bbApi.pipelines.getRecentActivity(site);
            const diffs = this.diffResults(previousResults, newResults).filter((p) =>
                this.shouldDisplayTarget(p.target),
            );

            if (diffs.length > 0) {
                const buttonText = diffs.length === 1 ? 'View' : 'View Pipeline Explorer';
                const neverShow = "Don't show again";

                notificationChangeEvent(
                    NotificationSource.BitbucketPipeline,
                    undefined,
                    NotificationSurface.Banner,
                    1,
                ).then((event) => {
                    Container.analyticsClient.sendTrackEvent(event);
                });

                const selection = await window.showInformationMessage(
                    this.composeMessage(diffs),
                    buttonText,
                    neverShow,
                );
                if (selection === buttonText) {
                    if (diffs.length === 1) {
                        commands.executeCommand(Commands.ShowPipeline, diffs[0]);
                    } else {
                        commands.executeCommand('workbench.view.extension.atlascode-drawer');
                    }
                } else if (selection === neverShow) {
                    configuration.updateEffective('bitbucket.pipelines.monitorEnabled', false, null, true);
                }

                notificationBannerClickedEvent(NotificationBannerId, selection ?? '').then((event) => {
                    Container.analyticsClient.sendUIEvent(event);
                });
            } else {
                this._previousResults[wsRepo.rootUri] = newResults;
            }
        }
    }

    private shouldDisplayTarget(target: PipelineTarget): boolean {
        //If there's no branch associated with this pipe, don't filter it
        return !target.ref_name || shouldDisplay(target);
    }

    // TODO check this function: it doesn't seem correct, it skips results
    private diffResults(oldResults: Pipeline[], newResults: Pipeline[]): Pipeline[] {
        if (!oldResults) {
            return [];
        }

        const changes: Pipeline[] = [];

        let i = 0;
        let j = 0;
        while (i < oldResults.length && j < newResults.length) {
            const oldItem = oldResults[i];
            const newItem = newResults[j];

            if (oldItem.build_number === newItem.build_number) {
                if (oldItem.state!.name !== newItem.state!.name) {
                    changes.push(newItem);
                }
                i++;
                j++;
            } else {
                changes.push(newItem);
                j++;
            }
        }

        return changes;
    }

    private composeMessage(newResults: Pipeline[]): string {
        if (newResults.length === 1) {
            const result = newResults[0];
            return `${descriptionForState(result, true)}.`;
        } else if (newResults.length === 2) {
            return `${descriptionForState(newResults[0], true)} and ${descriptionForState(newResults[1], true)}.`;
        } else if (newResults.length === 3) {
            return `New build statuses for ${generatePipelineTitle(newResults[0], true)}, ${generatePipelineTitle(
                newResults[1],
                true,
            )}, and 1 other build.`;
        } else if (newResults.length > 3) {
            return `New build statuses for ${generatePipelineTitle(newResults[0], true)}, ${generatePipelineTitle(
                newResults[1],
                true,
            )}, and ${newResults.length - 2} other builds.`;
        }
        return '';
    }
}
