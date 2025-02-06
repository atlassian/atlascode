import path from 'path';
import { commands, QuickPickItem, window } from 'vscode';
import { pipelineStartEvent } from '../../analytics';
import { bitbucketSiteForRemote, siteDetailsForRemote } from '../../bitbucket/bbUtils';
import { BitbucketApi, BitbucketSite, WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { PipelineReferenceTarget, PipelineReferenceType, PipelineTargetType } from '../../pipelines/model';
import { Remote } from '../../typings/git';
import * as vscode from 'vscode';

interface QuickPickRepo extends QuickPickItem {
    repo: WorkspaceRepo;
}

export async function runPipeline() {
    const repoQuickPicks = fetchRepos();
    if (repoQuickPicks.length === 0) {
        window.showErrorMessage(vscode.l10n.t('There are no repos available to build'));
    } else if (repoQuickPicks.length === 1) {
        showBranchPicker(repoQuickPicks[0].repo.mainSiteRemote.remote);
    } else {
        window
            .showQuickPick<QuickPickRepo>(repoQuickPicks, {
                matchOnDescription: true,
                placeHolder: vscode.l10n.t('Select repo'),
            })
            .then((quickPickRepo: QuickPickRepo | undefined) => {
                if (quickPickRepo) {
                    showBranchPicker(quickPickRepo.repo.mainSiteRemote.remote);
                }
            });
    }
}

async function showBranchPicker(remote: Remote) {
    const bbSite = bitbucketSiteForRemote(remote);
    if (!bbSite) {
        window.showErrorMessage(vscode.l10n.t('No Bitbucket site has been configured for this repo.'));
        return;
    }

    pipelineStartEvent(bbSite.details).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });

    const site = siteDetailsForRemote(remote);
    const bbApi = await Container.clientManager.bbClient(site!);
    window
        .showQuickPick<QuickPickItem>(fetchBranches(bbApi, bbSite!), {
            matchOnDescription: true,
            placeHolder: vscode.l10n.t('Search for branch'),
        })
        .then(async (quickPickItem: QuickPickItem | undefined) => {
            if (quickPickItem) {
                const branchName = quickPickItem.label;
                const target: PipelineReferenceTarget = {
                    type: PipelineTargetType.Reference,
                    ref_name: branchName,
                    ref_type: PipelineReferenceType.Branch,
                };
                try {
                    await bbApi.pipelines!.triggerPipeline(bbSite!, target);
                } catch (e) {
                    Logger.error(e);
                    window.showErrorMessage(vscode.l10n.t('Error building branch'));
                }
                // Seems like there's a bit of lag between a build starting and it showing up in the list API.
                setTimeout(() => {
                    commands.executeCommand(Commands.RefreshPipelines);
                }, 500);
            }
        });
}

async function fetchBranches(bbApi: BitbucketApi, bbSite: BitbucketSite): Promise<QuickPickItem[]> {
    const branches = await bbApi.repositories.getBranches(bbSite);
    return branches.map((branchName) => {
        return {
            label: branchName,
        };
    });
}

function fetchRepos(): QuickPickRepo[] {
    const repos = Container.bitbucketContext.getBitbucketCloudRepositories();
    return repos.map((repo) => {
        return {
            repo: repo,
            label: path.basename(repo.rootUri),
        };
    });
}
