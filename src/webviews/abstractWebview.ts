import * as fs from 'fs';
import Mustache from 'mustache';
import * as path from 'path';
import {
    Disposable,
    Event,
    EventEmitter,
    Uri,
    ViewColumn,
    WebviewPanel,
    WebviewPanelOnDidChangeViewStateEvent,
    window,
} from 'vscode';
import { pmfClosed, pmfSnoozed, pmfSubmitted, viewScreenEvent } from '../analytics';
import { DetailedSiteInfo, Product } from '../atlclients/authInfo';
import { Container } from '../container';
import { submitLegacyJSDPMF } from '../feedback/pmfJSDSubmitter';
import { isAction, isAlertable, isPMFSubmitAction } from '../ipc/messaging';
import { iconSet, Resources } from '../resources';
import { OnlineInfoEvent } from '../util/online';
import { UIWebsocket } from '../ws';
import { CommonActionType } from '../lib/ipc/fromUI/common';
import * as vscode from 'vscode';

// ReactWebview is an interface that can be used to deal with webview objects when you don't know their generic typings.
export interface ReactWebview extends Disposable {
    hide(): void;
    createOrShow(): Promise<void>;
    onDidPanelDispose(): Event<void>;
    invalidate(): void;
}

// InitializingWebview is an interface that exposes an initialize method that may be called to initialize the veiw object with data.
// Type T is the type of the data that's passed to the initialize method.
// This interface is called in AbstractMultiViewManager
export interface InitializingWebview<T> {
    initialize(data: T): void;
}

// isInitializable tests to see if a webview is an InitializingWebview and casts it if it is.
export function isInitializable(object: any): object is InitializingWebview<any> {
    return (<InitializingWebview<any>>object).initialize !== undefined;
}

// AbstractReactWebview is the base class for atlascode react webviews.
// This handles the panel creation/disposing, comms between vscode and react, etc.
// Generic Types:
// S = the type of ipc.Message to send to react
// R = the type of ipc.Action to receive from react
export abstract class AbstractReactWebview implements ReactWebview {
    private _disposablePanel: Disposable | undefined;
    protected _panel: WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private static readonly viewType = 'react';
    private _onDidPanelDispose = new EventEmitter<void>();
    protected isRefeshing: boolean = false;
    private _viewEventSent: boolean = false;
    private ws: UIWebsocket;

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;

        Container.context.subscriptions.push(Container.onlineDetector.onDidOnlineChange(this.onDidOnlineChange, this));

        // Note: this is supe rlightweight and does nothing until you call start()
        this.ws = new UIWebsocket(13988);
    }

    private onDidOnlineChange(e: OnlineInfoEvent) {
        this.postMessage({ type: 'onlineStatus', isOnline: e.isOnline });
    }

    onDidPanelDispose(): Event<void> {
        return this._onDidPanelDispose.event;
    }
    abstract get title(): string;
    abstract get id(): string;
    abstract invalidate(): Promise<void>;
    abstract get siteOrUndefined(): DetailedSiteInfo | undefined;
    abstract get productOrUndefined(): Product | undefined;

    get visible() {
        return this._panel === undefined ? false : this._panel.visible;
    }

    hide() {
        if (this._panel === undefined) {
            return;
        }

        this._panel.dispose();
    }

    setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.ATLASSIANICON);
    }

    public async createOrShow(column?: ViewColumn): Promise<void> {
        if (this._panel === undefined) {
            this._panel = window.createWebviewPanel(
                AbstractReactWebview.viewType,
                this.title,
                column ? column : ViewColumn.Active,
                {
                    retainContextWhenHidden: true,
                    enableFindWidget: true,
                    enableCommandUris: true,
                    enableScripts: true,
                    localResourceRoots: [
                        Uri.file(path.join(this._extensionPath, 'build')),
                        Uri.file(path.join(this._extensionPath, 'images')),
                    ],
                },
            );

            this.setIconPath();

            if (Container.isDebugging && Container.config.enableUIWS) {
                this.ws.start(this.onMessageReceived.bind(this));
            }

            this._disposablePanel = Disposable.from(
                this._panel,
                this._panel.onDidDispose(this.onPanelDisposed, this),
                this._panel.onDidChangeViewState(this.onViewStateChanged, this),
                this._panel.webview.onDidReceiveMessage(this.onMessageReceived, this),
                this.ws,
            );

            this._panel.webview.html = this._getHtmlForWebview(
                this._panel.webview.asWebviewUri(Uri.file(this._extensionPath)),
                this._panel.webview.cspSource,
                this.id,
            );
        } else {
            this._panel.webview.html = this._getHtmlForWebview(
                this._panel.webview.asWebviewUri(Uri.file(this._extensionPath)),
                this._panel.webview.cspSource,
                this.id,
            );
            this._panel.reveal(column ? column : ViewColumn.Active); // , false);
        }
    }

    private onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
        // HACK: Because messages aren't sent to the webview when hidden, we need make sure it is up-to-date
        if (e.webviewPanel.visible) {
            this.postMessage({ type: 'onlineStatus', isOnline: Container.onlineDetector.isOnline() });

            const shouldShowSurvey: boolean = Container.pmfStats.shouldShowSurvey();
            this.postMessage({ type: 'pmfStatus', showPMF: shouldShowSurvey });

            if (shouldShowSurvey) {
                viewScreenEvent('atlascodePmfBanner', this.siteOrUndefined).then((e) => {
                    Container.analyticsClient.sendScreenEvent(e);
                });
            }

            this.invalidate().then(() => {
                if (!this._viewEventSent) {
                    this._viewEventSent = true;
                    viewScreenEvent(this.id, this.siteOrUndefined, this.productOrUndefined).then((e) => {
                        Container.analyticsClient.sendScreenEvent(e);
                    });
                }
            });
        }
    }

    protected async onMessageReceived(a: any): Promise<boolean> {
        if (isAction(a)) {
            switch (a.action) {
                case 'alertError': {
                    if (isAlertable(a)) {
                        window.showErrorMessage(a.message);
                    }
                    return true;
                }
                case 'pmfOpen': {
                    viewScreenEvent('atlascodePmf', this.siteOrUndefined).then((e) => {
                        Container.analyticsClient.sendScreenEvent(e);
                    });
                    return true;
                }
                case 'pmfLater': {
                    Container.pmfStats.snoozeSurvey();
                    pmfSnoozed().then((e) => {
                        Container.analyticsClient.sendTrackEvent(e);
                    });
                    return true;
                }
                case 'pmfNever': {
                    Container.pmfStats.touchSurveyed();
                    pmfClosed().then((e) => {
                        Container.analyticsClient.sendTrackEvent(e);
                    });
                    return true;
                }
                case 'pmfSubmit': {
                    if (isPMFSubmitAction(a)) {
                        submitLegacyJSDPMF(a.pmfData);
                        pmfSubmitted(a.pmfData.q1).then((e) => {
                            Container.analyticsClient.sendTrackEvent(e);
                        });
                    }
                    Container.pmfStats.touchSurveyed();
                    return true;
                }
            }
        }

        // Special case for analytics which are normally routed through the new IPC system
        if (a?.type === CommonActionType.SendAnalytics && a?.errorInfo) {
            Container.analyticsApi.fireUIErrorEvent(a.errorInfo);
            return true;
        }

        return false;
    }

    protected formatErrorReason(e: any, title?: string): any {
        if (e.response) {
            if (e.response.data && e.response.data !== '') {
                return title ? { ...e.response.data, ...{ title: title } } : e.response.data;
            }
        } else if (e.message && e.stderr) {
            // git errors
            return title
                ? { title: title, errorMessages: [e.message, e.stderr] }
                : { title: e.message, errorMessages: [e.stderr] };
        } else if (e.message) {
            return title ? { title: title, errorMessages: [e.message] } : e.message;
        }

        return title ? { title: title, errorMessages: [`${e}`] } : e;
    }

    protected postMessage(message: any) {
        if (this._panel === undefined) {
            return false;
        }

        const result = this._panel!.webview.postMessage(message);

        if (Container.isDebugging && Container.config.enableUIWS) {
            this.ws.send(message);
        }

        return result;
    }

    protected onPanelDisposed() {
        if (this._disposablePanel) {
            this._disposablePanel.dispose();
        }
        this._panel = undefined;
        this._onDidPanelDispose.fire();
    }

    public dispose() {
        if (this._disposablePanel) {
            this._disposablePanel.dispose();
        }

        this._onDidPanelDispose.dispose();
    }

    private _getHtmlForWebview(baseUri: Uri, cspSource: string, viewName: string) {
        const manifest = JSON.parse(
            fs.readFileSync(path.join(this._extensionPath, 'build', 'asset-manifest.json')).toString(),
        );
        const mainScript = manifest['main.js'];
        const mainStyle = manifest['main.css'];

        const template = Resources.html.get('reactHtml');
        const l10ndata = JSON.stringify(vscode.l10n.bundle || undefined);

        if (template) {
            return Mustache.render(template, {
                view: viewName,
                styleUri: `build/${mainStyle}`,
                scriptUri: `build/${mainScript}`,
                baseUri: baseUri,
                cspSource: cspSource,
                l10ndata: l10ndata ? btoa(l10ndata) : undefined,
            });
        } else {
            return Mustache.render(Resources.htmlNotFound, { resource: 'reactHtml' });
        }
    }
}
