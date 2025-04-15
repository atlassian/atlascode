import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { env, Uri } from 'vscode';

import { IntegrationsLinkParams } from '../../atlclients/authInfo';
import { HTTPClient } from '../../bitbucket/httpClient';
import { showIssue } from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { submitFeedback } from '../../feedback/feedbackSubmitter';
import { submitJSDPMF } from '../../feedback/pmfJSDSubmitter';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CancellationManager } from '../../lib/cancellation';
import { CommonAction, CommonActionType } from '../../lib/ipc/fromUI/common';
import { KnownLinkID, knownLinkIdMap, numForPMFLevel } from '../../lib/ipc/models/common';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';

export class VSCCommonMessageHandler implements CommonActionMessageHandler {
    private _analytics: AnalyticsApi;
    private _cancelMan: CancellationManager;

    constructor(analytics: AnalyticsApi, cancelMan: CancellationManager) {
        this._analytics = analytics;
        this._cancelMan = cancelMan;
    }
    public async onMessageReceived(msg: CommonAction): Promise<void> {
        switch (msg.type) {
            case CommonActionType.SubmitPMF: {
                submitJSDPMF(msg.pmfData);
                Container.pmfStats.touchSurveyed();
                this._analytics.firePmfSubmitted(numForPMFLevel(msg.pmfData.level));
                break;
            }
            case CommonActionType.DismissPMFLater: {
                Container.pmfStats.snoozeSurvey();
                this._analytics.firePmfSnoozed();
                break;
            }
            case CommonActionType.DismissPMFNever: {
                Container.pmfStats.touchSurveyed();
                this._analytics.firePmfClosed();
                break;
            }
            case CommonActionType.OpenPMFSurvey: {
                Container.pmfStats.touchSurveyed();
                this._analytics.fireViewScreenEvent('atlascodePmf');
                break;
            }
            case CommonActionType.ExternalLink: {
                let foundUrl = msg.url;

                if (!foundUrl) {
                    foundUrl = knownLinkIdMap.get(msg.linkId);
                }

                if (foundUrl) {
                    //Integrations link carries query params to help track where the click came from
                    if (msg.linkId === KnownLinkID.Integrations) {
                        const aaid = Container.siteManager.getFirstAAID();
                        const queryParams: IntegrationsLinkParams = aaid
                            ? {
                                  aaid: aaid,
                                  aid: Container.machineId,
                                  s: 'atlascode.onboarding',
                              }
                            : {
                                  aid: Container.machineId,
                                  s: 'atlascode.onboarding',
                              };
                        foundUrl = `${foundUrl}${HTTPClient.queryObjectToString(queryParams)}`;
                    }

                    env.openExternal(Uri.parse(foundUrl));

                    //We're only interested in tracking external URIs that are 'known'
                    if (knownLinkIdMap.has(msg.linkId)) {
                        this._analytics.fireExternalLinkEvent(msg.source, msg.linkId);
                    }
                }
                break;
            }
            case CommonActionType.CopyLink: {
                env.clipboard.writeText(msg.url);
                switch (msg.linkType) {
                    case 'jiraIssue': {
                        this._analytics.fireIssueUrlCopiedEvent();
                        break;
                    }
                    case 'pullRequest': {
                        this._analytics.firePrUrlCopiedEvent();
                        break;
                    }
                }
                break;
            }
            case CommonActionType.SubmitFeedback: {
                submitFeedback(msg.feedback);
                break;
            }
            case CommonActionType.OpenJiraIssue: {
                showIssue(msg.issueOrKey);
                break;
            }
            case CommonActionType.Refresh: {
                // should be handled by caller
                break;
            }
            case CommonActionType.Cancel: {
                this._cancelMan.get(msg.abortKey)?.cancel(msg.reason);
                this._cancelMan.delete(msg.abortKey);
                break;
            }
            case CommonActionType.SendAnalytics: {
                this._analytics.fireUIErrorEvent(msg.errorInfo);
                break;
            }
            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
