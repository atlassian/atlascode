import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { ConfigSection, ConfigSubSection, ConfigV3Section, ConfigV3SubSection } from 'src/lib/ipc/models/config';
import * as vscode from 'vscode';

import { ProductBitbucket } from '../../../../atlclients/authInfo';
import { BitbucketBranchingModel } from '../../../../bitbucket/model';
import { Commands } from '../../../../constants';
import { Container } from '../../../../container';
import { Features } from '../../../../util/featureFlags';
import { Experiments } from '../../../../util/featureFlags';
import { OnJiraEditedRefreshDelay } from '../../../../util/time';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { StartWorkAction, StartWorkActionType } from '../../../ipc/fromUI/startWork';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    BranchType,
    emptyStartWorkIssueMessage,
    RepoData,
    StartWorkInitMessage,
    StartWorkIssueMessage,
    StartWorkMessage,
    StartWorkMessageType,
    StartWorkResponse,
} from '../../../ipc/toUI/startWork';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { StartWorkActionApi } from './startWorkActionApi';

const customBranchType: BranchType = { kind: 'Custom', prefix: '' };

export class StartWorkWebviewController implements WebviewController<StartWorkIssueMessage> {
    public readonly requiredFeatureFlags = [];
    public readonly requiredExperiments = [];

    private isRefreshing = false;
    private initData: StartWorkIssueMessage;

    constructor(
        private messagePoster: MessagePoster,
        private api: StartWorkActionApi,
        private commonHandler: CommonActionMessageHandler,
        private logger: Logger,
        private analytics: AnalyticsApi,
        factoryData?: StartWorkInitMessage,
    ) {
        this.initData = factoryData || emptyStartWorkIssueMessage;
    }

    public onShown(): void {}

    public title(): string {
        return `Start work on ${this.initData.issue.key}`;
    }

    public screenDetails() {
        return { id: WebViewID.StartWork, site: this.initData.issue.siteDetails, product: ProductBitbucket };
    }

    private postMessage(message: StartWorkMessage | StartWorkResponse | CommonMessage) {
        this.messagePoster(message);
    }

    private async invalidate() {
        try {
            if (this.isRefreshing) {
                return;
            }
            this.isRefreshing = true;

            const workspaceRepos = this.api.getWorkspaceRepos();
            this.logger.debug(`JS-1324 Webview Controller - Repo count: ${workspaceRepos.length}`);
            this.logger.debug(`JS-1324 ${JSON.stringify(workspaceRepos.map((r) => r.rootUri))}`);

            const repoData: (RepoData & { hasSubmodules: boolean })[] = await Promise.all(
                workspaceRepos
                    .filter((r) => r.siteRemotes.length > 0)
                    .map(async (wsRepo) => {
                        const repoDetails = await this.api.getRepoDetails(wsRepo);

                        const branchTypes: BranchType[] = [
                            ...((repoDetails.branchingModel?.branch_types || []) as BitbucketBranchingModel[]).sort(
                                (a, b) => {
                                    return a.kind.localeCompare(b.kind);
                                },
                            ),
                            // Only add customBranchType for old version (not V3)
                            ...(Container.featureFlagClient.checkGate(Features.StartWorkV3) ? [] : [customBranchType]),
                        ];
                        const developmentBranch = repoDetails.developmentBranch;
                        const href = repoDetails.url;
                        const isCloud = wsRepo.mainSiteRemote.site?.details?.isCloud === true;

                        const repoScmState = await this.api.getRepoScmState(wsRepo);

                        return {
                            workspaceRepo: wsRepo,
                            href: href,
                            branchTypes: branchTypes,
                            developmentBranch: developmentBranch,
                            isCloud: isCloud,
                            userName: repoScmState.userName,
                            userEmail: repoScmState.userEmail,
                            localBranches: repoScmState.localBranches,
                            remoteBranches: repoScmState.remoteBranches,
                            hasSubmodules: repoScmState.hasSubmodules,
                        };
                    }),
            );

            this.logger.debug(`JS-1324 Webview Controller - Repo data Count: ${repoData.length}`);
            this.logger.debug(`JS-1324 ${JSON.stringify(repoData.map((r) => r.workspaceRepo.rootUri))}`);

            this.postMessage({
                type: StartWorkMessageType.Init,
                ...this.initData!,
                repoData,
                ...this.api.getStartWorkConfig(),
                isRovoDevEnabled: Container.isRovoDevEnabled,
            });
        } catch (e) {
            this.logger.error(e, 'Error updating start work page');
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public update(message: StartWorkInitMessage) {
        this.initData = message;
        this.postMessage({ type: StartWorkMessageType.Init, ...message });
    }

    public async onMessageReceived(msg: StartWorkAction) {
        switch (msg.type) {
            case StartWorkActionType.StartRequest: {
                try {
                    await this.api.assignAndTransitionIssue(
                        this.initData.issue,
                        msg.transitionIssueEnabled ? msg.transition : undefined,
                    );
                    if (msg.branchSetupEnabled) {
                        await this.api.createOrCheckoutBranch(
                            msg.wsRepo,
                            msg.targetBranch,
                            msg.sourceBranch,
                            msg.upstream,
                            msg.pushBranchToRemote,
                        );
                    }
                    this.postMessage({
                        type: StartWorkMessageType.StartWorkResponse,
                        transistionStatus: msg.transitionIssueEnabled ? msg.transition.to.name : undefined,
                        branch: msg.branchSetupEnabled ? msg.targetBranch : undefined,
                        upstream: msg.branchSetupEnabled ? msg.upstream : undefined,
                    });
                    this.analytics.fireIssueWorkStartedEvent(this.initData.issue.siteDetails, msg.pushBranchToRemote);
                } catch (e) {
                    this.logger.error(e, 'Error executing start work action');
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error executing start work action'),
                    });
                }
                break;
            }
            case StartWorkActionType.ClosePage: {
                this.api.closePage();
                break;
            }
            case StartWorkActionType.OpenSettings: {
                if (Container.featureFlagClient.checkExperimentValue(Experiments.AtlascodeNewSettingsExperiment)) {
                    this.api.openSettings(ConfigV3Section.AdvancedConfig, ConfigV3SubSection.StartWork);
                } else {
                    this.api.openSettings(ConfigSection.Jira, ConfigSubSection.StartWork);
                }

                break;
            }
            case StartWorkActionType.GetImage: {
                try {
                    const siteDetails = JSON.parse(msg.siteDetailsStringified);
                    const baseApiUrl = new URL(
                        siteDetails.baseApiUrl.slice(0, siteDetails.baseApiUrl.lastIndexOf('/rest')),
                    );
                    // Prefix base URL for a relative URL
                    const href = msg.url.startsWith('/') ? new URL(baseApiUrl.href + msg.url) : new URL(msg.url);
                    // Skip fetching external images (that do not belong to the site)
                    if (href.hostname !== baseApiUrl.hostname) {
                        this.postMessage({
                            type: 'getImageDone',
                            imgData: '',
                            nonce: msg.nonce,
                        } as any);
                    }

                    const url = href.toString();

                    const client = await Container.clientManager.jiraClient(siteDetails);
                    const response = await client.transportFactory().get(url, {
                        method: 'GET',
                        headers: {
                            Authorization: await client.authorizationProvider('GET', url),
                        },
                        responseType: 'arraybuffer',
                    });
                    const imgData = Buffer.from(response.data, 'binary').toString('base64');
                    this.postMessage({
                        type: 'getImageDone',
                        imgData: imgData,
                        nonce: msg.nonce,
                    } as any);
                } catch (e) {
                    this.logger.error(e, 'Error fetching image');
                    this.postMessage({
                        type: 'getImageDone',
                        imgData: '',
                        nonce: msg.nonce,
                    } as any);
                }
                break;
            }
            case StartWorkActionType.GetRovoDevPreference: {
                try {
                    const enabled = await this.api.getRovoDevPreference();
                    this.postMessage({
                        type: StartWorkMessageType.RovoDevPreferenceResponse,
                        enabled,
                    });
                } catch (e) {
                    this.logger.error(e, 'Error getting RovoDev preference');
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error getting RovoDev preference'),
                    });
                }
                break;
            }
            case StartWorkActionType.UpdateRovoDevPreference: {
                try {
                    await this.api.updateRovoDevPreference(msg.enabled);
                } catch (e) {
                    this.logger.error(e, 'Error updating RovoDev preference');
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error updating RovoDev preference'),
                    });
                }
                break;
            }
            case StartWorkActionType.OpenRovoDev: {
                try {
                    await this.api.openRovoDev();
                } catch (e) {
                    this.logger.error(e, 'Error opening RovoDev');
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error opening RovoDev'),
                    });
                }
                break;
            }
            case StartWorkActionType.RefreshTreeViews: {
                // Pass delay to allow Jira's indexes to update before refreshing
                await vscode.commands.executeCommand(
                    Commands.RefreshAssignedWorkItemsExplorer,
                    OnJiraEditedRefreshDelay,
                );
                await vscode.commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);
                break;
            }
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(e, 'Error refeshing start work page');
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing start work page'),
                    });
                }
                break;
            }

            case CommonActionType.SendAnalytics:
            case CommonActionType.CopyLink:
            case CommonActionType.OpenJiraIssue:
            case CommonActionType.ExternalLink:
            case CommonActionType.Cancel:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.SubmitPMF:
            case CommonActionType.SubmitFeedback: {
                this.commonHandler.onMessageReceived(msg);
                break;
            }

            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
