import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { ConfigAction, ConfigActionType } from '../../../ipc/fromUI/config';
import { ConfigMessage, ConfigMessageType, ConfigResponse, SectionChangeMessage } from '../../../ipc/toUI/config';
import { MessagePoster, WebviewController } from '../webviewController';
import { isBasicAuthInfo, isEmptySiteInfo, isPATAuthInfo } from '../../../../atlclients/authInfo';

import { AnalyticsApi } from '../../../analyticsApi';
import Axios from 'axios';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { ConfigActionApi } from './configActionApi';
import { Logger } from '../../../logger';
import { WebViewID } from '../../../ipc/models/common';
import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { formatError } from '../../formatError';
import uuid from 'uuid';

// TODO AXON-46 - figure out why linter is mad here
// This is most likely a configuration error, since it makes sense to prevent imports of
// `vscode` and `container` in react files - but this is NOT a react file :thinking:
import vscode from 'vscode'; // eslint-disable-line
import { Container } from '../../../../container'; //eslint-disable-line

export const id: string = 'atlascodeSettingsV2';

export class ConfigWebviewController implements WebviewController<SectionChangeMessage> {
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
            const err = new Error(`error updating configuration: ${e}`);
            this._logger.error(err);
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
                    this._logger.error(new Error(`error refreshing config: ${e}`));
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
                        const err = new Error(`Authentication error: ${e}`);
                        this._logger.error(err);
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Authentication error'),
                        });
                    }
                } else {
                    this._api.authenticateCloud(msg.siteInfo, this._settingsUrl);
                }
                this._analytics.fireAuthenticateButtonEvent(id, msg.siteInfo, isCloud);
                break;
            }
            case ConfigActionType.RemoteLogin: {
                const uri = vscode.Uri.parse('vscode://atlassian.atlascode/auth');
                vscode.env.asExternalUri(uri).then((uri) => {
                    const state = { deeplink: uri.toString(true), attemptId: uuid.v4() };
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
                            const err = new Error(`JQL fetch error: ${e}`);
                            this._logger.error(err);
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
                        const err = new Error(`JQL fetch error: ${e}`);
                        this._logger.error(err);
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
                            const err = new Error(`Filter fetch error: ${e}`);
                            this._logger.error(err);
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
                            const err = new Error(`JQL Validate network error: ${e}`);
                            this._logger.error(err);
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
                    const err = new Error(`error updating configuration: ${e}`);
                    this._logger.error(err);
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
