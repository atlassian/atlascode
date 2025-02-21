import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { isBasicAuthInfo } from '../../../../atlclients/authInfo';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { OnboardingAction, OnboardingActionType } from '../../../ipc/fromUI/onboarding';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { SectionChangeMessage } from '../../../ipc/toUI/config';
import { OnboardingMessage, OnboardingMessageType } from '../../../ipc/toUI/onboarding';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { OnboardingActionApi } from './onboardingActionApi';

export const id: string = 'atlascodeOnboardingV2';
export const title: string = 'Getting Started';

export class OnboardingWebviewController implements WebviewController<SectionChangeMessage> {
    private _messagePoster: MessagePoster;
    private _api: OnboardingActionApi;
    private _logger: Logger;
    private _analytics: AnalyticsApi;
    private _onboardingUrl: string;
    private _commonHandler: CommonActionMessageHandler;

    constructor(
        messagePoster: MessagePoster,
        api: OnboardingActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi,
        onboardingUrl: string,
    ) {
        this._messagePoster = messagePoster;
        this._api = api;
        this._logger = logger;
        this._analytics = analytics;
        this._onboardingUrl = onboardingUrl;
        this._commonHandler = commonHandler;
    }

    private postMessage(message: OnboardingMessage | CommonMessage) {
        this._messagePoster(message);
    }

    public title(): string {
        return title;
    }

    public screenDetails() {
        return { id: WebViewID.OnboardingWebview, site: undefined, product: undefined };
    }

    public async onSitesChanged(): Promise<void> {
        const [jiraSites, bbSites] = await this._api.getSitesWithAuth();
        this.postMessage({
            type: OnboardingMessageType.SitesUpdate,
            jiraSites: jiraSites,
            bitbucketSites: bbSites,
        });
    }

    private async invalidate() {
        const [jiraSites, bbSites] = await this._api.getSitesWithAuth();
        const target = this._api.getConfigTarget();
        const cfg = this._api.flattenedConfigForTarget(target);
        this.postMessage({
            type: OnboardingMessageType.Init,
            bitbucketSites: bbSites,
            jiraSites: jiraSites,
            isRemote: this._api.getIsRemote(),
            target: target,
            config: cfg,
        });
    }

    public update() {
        //No initial data to send!
    }

    public async onMessageReceived(msg: OnboardingAction | CommonAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this._logger.error(new Error(`error refreshing config: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing config'),
                    });
                }
                break;
            }
            case OnboardingActionType.Login: {
                let isCloud = true;
                this._analytics.fireAuthenticateButtonEvent(id, msg.siteInfo, isCloud);
                try {
                    if (isBasicAuthInfo(msg.authInfo)) {
                        isCloud = false;
                        await this._api.authenticateServer(msg.siteInfo, msg.authInfo);
                    } else {
                        await this._api.authenticateCloud(msg.siteInfo, this._onboardingUrl);
                    }
                    this.postMessage({ type: OnboardingMessageType.LoginResponse });
                } catch (e) {
                    const env = isCloud ? 'cloud' : 'server';
                    this._logger.error(new Error(`${env} onboarding authentication error: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, `${env} onboarding authentication error`),
                    });
                }
                break;
            }
            case OnboardingActionType.SaveSettings: {
                try {
                    this._api.updateSettings(msg.target, msg.changes, msg.removes);
                } catch (e) {
                    const err = new Error(`error updating configuration: ${e}`);
                    this._logger.error(err);
                    this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                }
                break;
            }
            case OnboardingActionType.Logout: {
                this._api.clearAuth(msg.siteInfo);
                this._analytics.fireLogoutButtonEvent(id);
                break;
            }
            case OnboardingActionType.CreateJiraIssue: {
                this._api.createJiraIssue();
                this._analytics.fireFocusCreateIssueEvent(id);
                break;
            }
            case OnboardingActionType.ViewJiraIssue: {
                this._api.viewJiraIssue();
                this._analytics.fireFocusIssueEvent(id);
                break;
            }
            case OnboardingActionType.CreatePullRequest: {
                this._api.createPullRequest();
                this._analytics.fireFocusCreatePullRequestEvent(id);
                break;
            }
            case OnboardingActionType.ViewPullRequest: {
                this._api.viewPullRequest();
                this._analytics.fireFocusPullRequestEvent(id);
                break;
            }
            case OnboardingActionType.ClosePage: {
                this._api.closePage();
                this._analytics.fireDoneButtonEvent(id);
                break;
            }
            case OnboardingActionType.OpenSettings: {
                this._api.openSettings(msg.section, msg.subsection);
                this._analytics.fireMoreSettingsButtonEvent(id);
                break;
            }
            case OnboardingActionType.Error: {
                this._logger.error(msg.error);
                this.postMessage({ type: CommonMessageType.Error, reason: formatError(msg.error, 'Onboarding Error') });
                break;
            }
            case CommonActionType.SendAnalytics:
            case CommonActionType.CopyLink:
            case CommonActionType.OpenJiraIssue:
            case CommonActionType.SubmitFeedback:
            case CommonActionType.ExternalLink:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.Cancel:
            case CommonActionType.SubmitPMF: {
                this._commonHandler.onMessageReceived(msg);
                break;
            }
            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
