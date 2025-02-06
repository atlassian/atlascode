import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { WelcomeAction, WelcomeActionType } from '../../../ipc/fromUI/welcome';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { WelcomeInitMessage, WelcomeMessage, WelcomeMessageType } from '../../../ipc/toUI/welcome';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { WelcomeActionApi } from './welcomeActionApi';
// eslint-disable-next-line no-restricted-imports
import { l10n } from 'vscode';

export class WelcomeWebviewController implements WebviewController<WelcomeInitMessage> {
    private _isRefreshing: boolean;

    constructor(
        private messagePoster: MessagePoster,
        private api: WelcomeActionApi,
        private commonHandler: CommonActionMessageHandler,
        private logger: Logger,
        private initData?: WelcomeInitMessage,
    ) {}

    public title(): string {
        return l10n.t('Atlassian Welcome');
    }

    public screenDetails() {
        return { id: WebViewID.WelcomeWebview, site: undefined, product: undefined };
    }

    private postMessage(message: WelcomeMessage | CommonMessage) {
        this.messagePoster(message);
    }

    private async invalidate() {
        try {
            if (this._isRefreshing) {
                return;
            }

            this._isRefreshing = true;
            this.postMessage({
                type: WelcomeMessageType.Init,
                ...this.initData!,
            });
        } catch (e) {
            let err = new Error(`error updating welcome page: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this._isRefreshing = false;
        }
    }

    public update(msg: WelcomeInitMessage) {
        this.postMessage({ type: WelcomeMessageType.Init, ...msg });
    }

    public async onMessageReceived(msg: WelcomeAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing welcome page: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing welcome page'),
                    });
                }
                break;
            }
            case WelcomeActionType.OpenSettings: {
                this.api.openSettings();
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
