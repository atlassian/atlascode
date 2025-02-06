import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { ProductBitbucket } from '../../../../atlclients/authInfo';
import { BitbucketBranchingModel } from '../../../../bitbucket/model';
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
// eslint-disable-next-line no-restricted-imports
import { l10n } from 'vscode';

export const id: string = 'atlascodeSettingsV2';
const customBranchType: BranchType = { kind: 'Custom', prefix: '' };

export class StartWorkWebviewController implements WebviewController<StartWorkIssueMessage> {
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

    public title(): string {
        return l10n.t('Start work on {0}', this.initData.issue.key);
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
                            customBranchType,
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
                repoData: repoData,
                ...this.api.getStartWorkConfig(),
            });
        } catch (e) {
            let err = new Error(`error updating start work page: ${e}`);
            this.logger.error(err);
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
                        );
                    }
                    this.postMessage({
                        type: StartWorkMessageType.StartWorkResponse,
                        transistionStatus: msg.transitionIssueEnabled ? msg.transition.to.name : undefined,
                        branch: msg.branchSetupEnabled ? msg.targetBranch : undefined,
                        upstream: msg.branchSetupEnabled ? msg.upstream : undefined,
                    });
                    this.analytics.fireIssueWorkStartedEvent(this.initData.issue.siteDetails);
                } catch (e) {
                    this.logger.error(new Error(`error executing start work action: ${e}`));
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
                this.api.openSettings(msg.section, msg.subsection);
                break;
            }
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing start work page: ${e}`));
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
