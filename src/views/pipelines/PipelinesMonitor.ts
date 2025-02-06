import { commands, window, l10n } from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { Pipeline, PipelineTarget } from '../../pipelines/model';
import { descriptionForState, generatePipelineTitle, shouldDisplay } from './Helpers';

export class PipelinesMonitor implements BitbucketActivityMonitor {
    private _previousResults: Map<string, Pipeline[]> = new Map();

    constructor(private _repositories: WorkspaceRepo[]) {}

    async checkForNewActivity() {
        if (!Container.config.bitbucket.pipelines.monitorEnabled) {
            return;
        }
        for (var i = 0; i < this._repositories.length; i++) {
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

            bbApi.pipelines.getRecentActivity(site).then((newResults) => {
                var diffs = this.diffResults(previousResults, newResults);
                diffs = diffs.filter((p) => this.shouldDisplayTarget(p.target));
                const buttonText = diffs.length === 1 ? l10n.t('View') : l10n.t('View Pipeline Explorer');
                if (diffs.length > 0) {
                    window.showInformationMessage(this.composeMessage(diffs), buttonText).then((selection) => {
                        if (selection) {
                            if (diffs.length === 1) {
                                commands.executeCommand(Commands.ShowPipeline, diffs[0]);
                            } else {
                                commands.executeCommand('workbench.view.extension.atlascode-drawer');
                            }
                        }
                    });
                }
                this._previousResults[wsRepo.rootUri] = newResults;
            });
        }
    }

    private shouldDisplayTarget(target: PipelineTarget): boolean {
        //If there's no branch associated with this pipe, don't filter it
        return !target.ref_name || shouldDisplay(target);
    }

    private diffResults(oldResults: Pipeline[], newResults: Pipeline[]): Pipeline[] {
        if (!oldResults) {
            return [];
        }
        const changes: Pipeline[] = [];
        const previousLength = oldResults.length;
        const newLength = newResults.length;
        var i = 0;
        var j = 0;
        while (true) {
            if (i === previousLength || j === newLength) {
                return changes;
            }
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
