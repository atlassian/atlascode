import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import Axios from 'axios';
import { v4 } from 'uuid';
import { env } from 'vscode';
import * as vscode from 'vscode';

import { isBasicAuthInfo, isEmptySiteInfo, isPATAuthInfo } from '../../../../atlclients/authInfo';
import { ExtensionId } from '../../../../constants';
import { Container } from '../../../../container';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { ConfigAction, ConfigActionType } from '../../../ipc/fromUI/config';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { ConfigMessage, ConfigMessageType, ConfigResponse, SectionChangeMessage } from '../../../ipc/toUI/config';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { ConfigActionApi } from './configActionApi';

const AUTH_URI = `${env.uriScheme || 'vscode'}://${ExtensionId}/auth`;

export const id: string = 'atlascodeSettingsV2';

export class ConfigWebviewController implements WebviewController<SectionChangeMessage> {
    public readonly requiredFeatureFlags = [];
    public readonly requiredExperiments = [];

    private _messagePoster: MessagePoster;
    private _api: ConfigActionApi;
    private _logger: Logger;
    private _analytics: AnalyticsApi;
    private _commonHandler: CommonActionMessageHandler;
    private _isRefreshing = false;
    private _settingsUrl: string;
    private _initialSection?: SectionChangeMessage;

    constructor(
        messagePoster: MessagePoster,
        api: ConfigActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi,
        settingsUrl: string,
        section?: SectionChangeMessage,
    ) {
        this._messagePoster = messagePoster;
        this._api = api;
        this._logger = logger;
        this._analytics = analytics;
        this._settingsUrl = settingsUrl;
        this._commonHandler = commonHandler;
        this._initialSection = section;
    }

    public onShown(): void {}

    public title(): string {
        return 'Atlassian Settings';
    }

    public screenDetails() {
        return { id: WebViewID.ConfigWebview, site: undefined, product: undefined };
    }

    private postMessage(message: ConfigMessage | ConfigResponse | CommonMessage) {
        this._messagePoster(message);
    }

    public async onSitesChanged(): Promise<void> {
        const [jiraSites, bbSites] = await this._api.getSitesWithAuth();
        this.postMessage({
            type: ConfigMessageType.SitesUpdate,
            jiraSites: jiraSites,
            bitbucketSites: bbSites,
        });
    }

    private async invalidate() {
        try {
            if (this._isRefreshing) {
                return;
            }

            this._isRefreshing = true;
            const [jiraSites, bbSites] = await this._api.getSitesWithAuth();
            const target = this._api.getConfigTarget();
            const section = this._initialSection ? this._initialSection : {};
            const cfg = this._api.flattenedConfigForTarget(target);
            this.postMessage({
                type: ConfigMessageType.Init,
                bitbucketSites: bbSites,
                jiraSites: jiraSites,
                feedbackUser: await this._api.getFeedbackUser(),
                isRemote: this._api.getIsRemote(),
                target: target,
                showTunnelOption: this._api.shouldShowTunnelOption(),
                config: cfg,
                ...section,
            });

            if (this._initialSection) {
                this._initialSection = undefined;
            }
        } catch (e) {
            this._logger.error(e, 'Error updating configuration');
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this._isRefreshing = false;
        }
    }

    public update(section: SectionChangeMessage) {
        this.postMessage({ type: ConfigMessageType.SectionChange, ...section });
    }

    public async onMessageReceived(msg: ConfigAction) {
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
            case ConfigActionType.Login: {
                let isCloud = true;
                if (isBasicAuthInfo(msg.authInfo) || isPATAuthInfo(msg.authInfo)) {
                    isCloud = false;
                    try {
                        await this._api.authenticateServer(msg.siteInfo, msg.authInfo);
                    } catch (e) {
                        this._logger.error(e, 'Authentication error');
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Authentication error'),
                        });
                    }
                } else {
                    try {
                        await this._api.authenticateCloud(msg.siteInfo, this._settingsUrl);
                    } catch (e) {
                        this._logger.error(e, 'Cloud authentication error');
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Cloud authentication error'),
                        });
                    }
                }
                this._analytics.fireAuthenticateButtonEvent(id, msg.siteInfo, isCloud);
                break;
            }
            case ConfigActionType.RemoteLogin: {
                const uri = vscode.Uri.parse(AUTH_URI);
                vscode.env.asExternalUri(uri).then((uri) => {
                    const state = { deeplink: uri.toString(true), attemptId: v4() };
                    Container.loginManager.initRemoteAuth(state);
                });
                break;
            }
            case ConfigActionType.Logout: {
                this._api.clearAuth(msg.siteInfo);
                this._analytics.fireLogoutButtonEvent(id);
                break;
            }
            case ConfigActionType.SetTarget: {
                this._api.setConfigTarget(msg.target);
                this.postMessage({
                    type: ConfigMessageType.Update,
                    config: this._api.flattenedConfigForTarget(msg.target),
                    target: msg.target,
                });
                break;
            }
            case ConfigActionType.OpenJSON: {
                this._api.openJsonSettingsFile(msg.target);
                break;
            }
            case ConfigActionType.JQLSuggestionsRequest: {
                if (!isEmptySiteInfo(msg.site)) {
                    try {
                        const data = await this._api.fetchJqlSuggestions(
                            msg.site,
                            msg.fieldName,
                            msg.userInput,
                            msg.predicateName,
                            msg.abortKey,
                        );
                        this.postMessage({
                            type: ConfigMessageType.JQLSuggestionsResponse,
                            data: data,
                        });
                    } catch (e) {
                        if (Axios.isCancel(e)) {
                            this._logger.warn(formatError(e));
                        } else {
                            this._logger.error(e, 'JQL fetch error');
                            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                        }
                    }
                }
                break;
            }
            case ConfigActionType.JQLOptionsRequest: {
                if (!isEmptySiteInfo(msg.site)) {
                    try {
                        const data = await this._api.fetchJqlOptions(msg.site);
                        this.postMessage({
                            type: ConfigMessageType.JQLOptionsResponse,
                            data: data,
                        });
                    } catch (e) {
                        this._logger.error(e, 'JQL fetch error');
                        this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                    }
                }
                break;
            }
            case ConfigActionType.FilterSearchRequest: {
                if (!isEmptySiteInfo(msg.site)) {
                    try {
                        const data = await this._api.fetchFilterSearchResults(
                            msg.site,
                            msg.query,
                            msg.maxResults,
                            msg.startAt,
                            msg.abortKey,
                        );
                        this.postMessage({
                            type: ConfigMessageType.FilterSearchResponse,
                            data: data,
                        });
                    } catch (e) {
                        if (Axios.isCancel(e)) {
                            this._logger.warn(formatError(e));
                        } else {
                            this._logger.error(e, 'Filter fetch error');
                            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                        }
                    }
                }
                break;
            }
            case ConfigActionType.ValidateJqlRequest: {
                if (!isEmptySiteInfo(msg.site)) {
                    try {
                        const data = await this._api.validateJql(msg.site, msg.jql, msg.abortKey);
                        this.postMessage({
                            type: ConfigMessageType.ValidateJqlResponse,
                            data: data,
                        });
                    } catch (e) {
                        if (Axios.isCancel(e)) {
                            this._logger.warn(formatError(e));
                        } else {
                            this._logger.error(e, 'JQL Validate network error');
                            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                        }
                    }
                }
                break;
            }
            case ConfigActionType.SaveSettings: {
                try {
                    this._api.updateSettings(msg.target, msg.changes, msg.removes);
                } catch (e) {
                    this._logger.error(e, 'Error updating configuration');
                    this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                }
                break;
            }
            case ConfigActionType.CreateJiraIssue: {
                this._api.createJiraIssue();
                this._analytics.fireFocusCreateIssueEvent(id);
                break;
            }
            case ConfigActionType.ViewJiraIssue: {
                this._api.viewJiraIssue();
                this._analytics.fireFocusIssueEvent(id);
                break;
            }
            case ConfigActionType.CreatePullRequest: {
                this._api.createPullRequest();
                this._analytics.fireFocusCreatePullRequestEvent(id);
                break;
            }
            case ConfigActionType.ViewPullRequest: {
                this._api.viewPullRequest();
                this._analytics.fireFocusPullRequestEvent(id);
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
                this._commonHandler.onMessageReceived(msg);
                break;
            }

            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
