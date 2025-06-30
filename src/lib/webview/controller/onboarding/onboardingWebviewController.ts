import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { WebviewPanel } from 'vscode';

import { configuration } from '../../../../../src/config/configuration';
import { Container } from '../../../../../src/container';
import { isBasicAuthInfo, ProductBitbucket, ProductJira } from '../../../../atlclients/authInfo';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { OnboardingAction, OnboardingActionType } from '../../../ipc/fromUI/onboarding';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { OnboardingInitMessage, OnboardingMessage, OnboardingMessageType } from '../../../ipc/toUI/onboarding';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { OnboardingActionApi } from './onboardingActionApi';

export const id: string = 'atlascodeOnboardingV2';
const title: string = 'Getting Started';

export class OnboardingWebviewController implements WebviewController<OnboardingInitMessage> {
    public readonly requiredFeatureFlags = [];
    public readonly requiredExperiments = [];

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

    public async onShown(panel: WebviewPanel): Promise<void> {
        try {
            await configuration.updateEffective('jira.enabled', undefined, null, true);
        } catch {}

        // focus the atlassian extension panels when the onboarding view shows...
        Container.focus();

        // ...then focus back here
        panel.reveal(undefined, false);
    }

    public title(): string {
        return title;
    }

    public screenDetails() {
        return { id: WebViewID.OnboardingWebview, site: undefined, product: undefined };
    }

    public async onSitesChanged(): Promise<void> {
        this.postMessage({
            type: OnboardingMessageType.SitesUpdate,
            jiraSitesConfigured: Container.siteManager.productHasAtLeastOneSite(ProductJira),
            bitbucketSitesConfigured: Container.siteManager.productHasAtLeastOneSite(ProductBitbucket),
        });
    }

    private async invalidate() {
        const target = this._api.getConfigTarget();
        const cfg = this._api.flattenedConfigForTarget(target);
        this.postMessage({
            type: OnboardingMessageType.Init,
            jiraSitesConfigured: Container.siteManager.productHasAtLeastOneSite(ProductJira),
            bitbucketSitesConfigured: Container.siteManager.productHasAtLeastOneSite(ProductBitbucket),
            target: target,
            config: cfg,
        });
    }

    public update(data: OnboardingInitMessage) {
        this.invalidate();
    }

    public async onMessageReceived(msg: OnboardingAction | CommonAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this._logger.error(e, 'Error refeshing config');
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing config'),
                    });
                }
                break;
            }
            case OnboardingActionType.Login: {
                const isCloud = !isBasicAuthInfo(msg.authInfo);
                this._analytics.fireAuthenticateButtonEvent(id, msg.siteInfo, isCloud);
                try {
                    if (isCloud) {
                        await this._api.authenticateCloud(msg.siteInfo, this._onboardingUrl);
                    } else {
                        await this._api.authenticateServer(msg.siteInfo, msg.authInfo);
                    }
                    this.postMessage({ type: OnboardingMessageType.LoginResponse });
                } catch (e) {
                    const env = isCloud ? 'cloud' : 'server';
                    this._logger.error(e, `${env} onboarding authentication error`);
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
                    this._logger.error(e, 'Error updating configuration');
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
