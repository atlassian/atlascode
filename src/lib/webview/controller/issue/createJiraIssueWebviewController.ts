import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import debounce from 'lodash.debounce';
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../../../../atlclients/authInfo';
import { Logger } from '../../../../logger';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import {
    AutoCompleteAction,
    CreateJiraIssueAction,
    CreateJiraIssueActionType,
} from '../../../ipc/fromUI/createJiraIssue';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    CreateJiraIssueInitMessage,
    CreateJiraIssueMessage,
    CreateJiraIssueMessageType,
    emptyCreateJiraIssueInitMessage,
} from '../../../ipc/toUI/createJiraIssue';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { CreateJiraIssueActionApi } from './createJiraIssueActionApi';
export const id: string = 'atlascodeSettingsV2';

export class CreateJiraIssueWebviewController implements WebviewController<CreateJiraIssueInitMessage> {
    private isRefreshing = false;
    private initData: CreateJiraIssueInitMessage;

    constructor(
        private messagePoster: MessagePoster,
        private api: CreateJiraIssueActionApi,
        private commonHandler: CommonActionMessageHandler,
        private sitesAvailable: DetailedSiteInfo[],
        private logger: Logger,
        private analytics: AnalyticsApi,
        factoryData?: CreateJiraIssueInitMessage
    ) {
        this.initData = factoryData || emptyCreateJiraIssueInitMessage;
        console.log(this.api, this.analytics); // suppress errors for unused variables
    }

    public title(): string {
        return `Create issue`;
    }

    public screenDetails() {
        return { id: WebViewID.CreateJiraIssueWebview, site: undefined, product: ProductJira };
    }

    private postMessage(message: CreateJiraIssueMessage | CommonMessage) {
        this.messagePoster(message);
    }

    private async invalidate() {
        try {
            if (this.isRefreshing) {
                return;
            }
            this.isRefreshing = true;
            if (this.initData && this.initData === emptyCreateJiraIssueInitMessage) {
                const screenData = await this.api.fetchCreateMeta(emptySiteInfo);
                this.initData = {
                    site: screenData.site,
                    sitesAvailable: this.sitesAvailable,
                    project: screenData.project,
                    screenData: screenData.createMeta,
                };
            }

            this.postMessage({
                type: CreateJiraIssueMessageType.Init,
                ...this.initData!,
            });
        } catch (e) {
            let err = new Error(`error updating jira issue page: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public update(message: CreateJiraIssueInitMessage) {
        if (message) {
            this.initData = message;
            this.postMessage({ type: CreateJiraIssueMessageType.Init, ...message });
        } else {
            this.invalidate();
        }
    }

    findNames(response: any): any[] {
        // Pick the actual results out of the response.
        if (!Array.isArray(response)) {
            if (response.results) {
                response = response.results;
            } else if (response.values) {
                response = response.values;
            }
        }

        if (!Array.isArray(response) || response.length === 0) {
            return [];
        }

        // Normalize the results
        const item = response[0];
        if (!item.name && item.displayName) {
            return response.map((i: any) => {
                return { ...i, name: i.displayName };
            });
        }
        Logger.debug(`Couldn't figure out ${JSON.stringify(item)}`);
        return response as any[];
    }

    debounceSearch = debounce(
        async (
            site: DetailedSiteInfo,
            url: string | undefined,
            autoCompleteQuery: string | undefined,
            field: FieldUI
        ) => {
            if (url && autoCompleteQuery) {
                let result = await this.api.performAutoComplete(site, autoCompleteQuery, url);
                result = this.findNames(result);
                this.postMessage({
                    type: CreateJiraIssueMessageType.Update,
                    field: field,
                    options: result,
                });
            }
        },
        500
    );

    public async onMessageReceived(msg: CreateJiraIssueAction) {
        switch (msg.type) {
            case CreateJiraIssueActionType.GetCreateMeta: {
                const screenData = await this.api.fetchCreateMeta(msg.site, msg.projectKey);
                this.initData = {
                    site: screenData.site,
                    sitesAvailable: this.sitesAvailable,
                    project: screenData.project,
                    screenData: screenData.createMeta,
                };

                this.postMessage({
                    type: CreateJiraIssueMessageType.Init,
                    ...this.initData!,
                });
                break;
            }
            case CreateJiraIssueActionType.CreateIssueRequest: {
                const createdIssue = await this.api.create(msg.site, msg.issueData);
                this.postMessage({
                    type: CreateJiraIssueMessageType.CreateIssueResponse,
                    createdIssue: {
                        siteDetails: msg.site,
                        key: createdIssue.key,
                    },
                });
                break;
            }
            case CreateJiraIssueActionType.SelectProject: {
                const screenData = await this.api.fetchCreateMeta(msg.site, msg.projectKey.toUpperCase());
                this.initData = {
                    site: screenData.site,
                    project: screenData.project,
                    sitesAvailable: this.sitesAvailable,
                    screenData: screenData.createMeta,
                };

                this.postMessage({
                    type: CreateJiraIssueMessageType.Init,
                    ...this.initData!,
                });
                break;
            }
            case CreateJiraIssueActionType.AutoCompleteQuery: {
                const searchAction = msg as AutoCompleteAction;
                const autoCompleteQuery = searchAction.autoCompleteQuery;
                const field = searchAction.field;
                const url = searchAction.url;
                this.debounceSearch(msg.site, url, autoCompleteQuery, field);
                break;
            }
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing create jira issue page: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing create jira issue page'),
                    });
                }
                break;
            }

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
