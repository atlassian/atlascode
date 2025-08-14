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

import { Container } from '../container';
import { AnalyticsApi } from '../lib/analyticsApi';
import { CommonActionType } from '../lib/ipc/fromUI/common';
import { AdditionalSettings, CommonMessageType } from '../lib/ipc/toUI/common';
import { WebviewController } from '../lib/webview/controller/webviewController';
import { FeatureFlagClient } from '../util/featureFlags';
import { ExperimentGateValues, Experiments, FeatureGateValues, Features } from '../util/featureFlags/features';
import { UIWebsocket } from '../ws';
import { VSCWebviewControllerFactory } from './vscWebviewControllerFactory';

// ReactWebview is the interface for all basic webviews.
// It takes FD as a generic type parameter that represents the type of "Factory Data" that will be
// used to initialize and update the webview controller.
interface ReactWebview<FD> extends Disposable {
    hide(): void;
    createOrShow(factoryData: FD, column?: ViewColumn): Promise<void>;
    onDidPanelDispose(): Event<void>;
}

const viewType: string = 'react';

// SingleWebview is an implementation of a react webview that only displays a single view at a time.
// e.g. only open up one instance of the settings page vs. multiple instances of an issue page.
//
// It takes FD as a generic type parameter that represents the type of "Factory Data" that will be
// used to initialize and update the webview controller.
//
// It also takes R as a generic parameter that is the type of Received messages this view will accept
// from the UI. These are essentially the actions it will respond to.
export class SingleWebview<FD, R> implements ReactWebview<FD> {
    private _disposablePanel: Disposable | undefined;
    protected _panel: WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private _onDidPanelDispose = new EventEmitter<void>();
    private _controller: WebviewController<FD> | undefined;
    private _controllerFactory: VSCWebviewControllerFactory<FD>;
    private _analyticsApi: AnalyticsApi;
    private _ws: UIWebsocket;

    constructor(extensionPath: string, controllerFactory: VSCWebviewControllerFactory<FD>, analyticsApi: AnalyticsApi) {
        this._extensionPath = extensionPath;
        this._controllerFactory = controllerFactory;
        this._analyticsApi = analyticsApi;

        // Note: this is super lightweight and does nothing until you call start()
        this._ws = new UIWebsocket(controllerFactory.uiWebsocketPort());
    }

    onDidPanelDispose(): Event<void> {
        return this._onDidPanelDispose.event;
    }

    hide() {
        if (this._panel === undefined) {
            return;
        }

        this._panel.dispose();
    }

    public async createOrShow(factoryData?: FD, column?: ViewColumn): Promise<void> {
        if (this._panel === undefined) {
            this._panel = window.createWebviewPanel(viewType, '', column ? column : ViewColumn.Active, {
                retainContextWhenHidden: true,
                enableFindWidget: true,
                enableCommandUris: true,
                enableScripts: true,
                localResourceRoots: [
                    Uri.file(path.join(this._extensionPath, 'build')),
                    Uri.file(path.join(this._extensionPath, 'images')),
                ],
            });

            this._panel.iconPath = this._controllerFactory.tabIcon();

            if (Container.isDebugging && Container.config.enableUIWS) {
                this._ws.start(this.onMessageReceived.bind(this));
            }

            const [controller, controllerDisposable] = this._controllerFactory.createController(
                this.postMessage.bind(this),
                factoryData,
            );

            this._controller = controller;

            this._disposablePanel = Disposable.from(
                this._panel,
                this._panel.onDidDispose(this.onPanelDisposed, this),
                this._panel.onDidChangeViewState(this.onViewStateChanged, this),
                this._panel.webview.onDidReceiveMessage(this.onMessageReceived, this),
                controllerDisposable
                    ? controllerDisposable
                    : {
                          dispose: () => {
                              return;
                          },
                      },
                this._ws,
            );

            this._panel.title = this._controller.title();
            this._panel.webview.html = this._controllerFactory.webviewHtml(
                this._extensionPath,
                this._panel.webview.asWebviewUri(Uri.file(this._extensionPath)),
                this._panel.webview.cspSource,
            );

            this._controller.onShown(this._panel);

            const { id, site, product } = this._controller.screenDetails();
            this._analyticsApi.fireViewScreenEvent(id, site, product);
        } else {
            if (this._controller) {
                this._controller.update(factoryData);
                this._panel.title = this._controller.title();
            }

            this._panel.webview.html = this._controllerFactory.webviewHtml(
                this._extensionPath,
                this._panel.webview.asWebviewUri(Uri.file(this._extensionPath)),
                this._panel.webview.cspSource,
            );
            this._panel.reveal(column ? column : ViewColumn.Active); // , false);
        }

        if (this._controller) {
            // Send feature gates to the panel in a message
            this.fireFeatureGates(this._controller.requiredFeatureFlags);
            this.fireExperimentGates(this._controller.requiredExperiments);
            this.fireAdditionalSettings({
                rovoDevEnabled: Container.isRovoDevEnabled,
            });
        }
    }

    private async fireFeatureGates(features: Features[]) {
        if (features.length) {
            const featureFlags = {} as FeatureGateValues;
            features.forEach((x) => (featureFlags[x] = FeatureFlagClient.checkGate(x)));
            this.postMessage({ command: CommonMessageType.UpdateFeatureFlags, featureFlags });
        }
    }

    private async fireExperimentGates(experiments: Experiments[]) {
        if (experiments.length) {
            const experimentValues = {} as ExperimentGateValues;
            experiments.forEach((x) => (experimentValues[x] = FeatureFlagClient.checkExperimentValue(x)));
            this.postMessage({ command: CommonMessageType.UpdateExperimentValues, experimentValues });
        }
    }

    private fireAdditionalSettings(settings: AdditionalSettings) {
        this.postMessage({ type: CommonMessageType.AdditionalSettings, settings });
    }

    private onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
        if (e.webviewPanel.visible) {
            // keeping this in case we need to do something when we get re-selected
        }
    }

    private onMessageReceived(a: any): void {
        if (this._controller) {
            this._controller.onMessageReceived(a as R);

            // this is here because getting a refresh event is the only way we know the UI is ready to receive messages.
            if (a.type && a.type === CommonActionType.Refresh) {
                const shouldShowSurvey: boolean = Container.pmfStats.shouldShowSurvey();
                this.postMessage({ type: CommonMessageType.PMFStatus, showPMF: shouldShowSurvey });

                if (shouldShowSurvey && this._controller) {
                    const { site, product } = this._controller.screenDetails();
                    this._analyticsApi.fireViewScreenEvent('atlascodePmfBanner', site, product);
                }
            }
        }
    }

    public async postMessage(message: any): Promise<boolean> {
        if (this._panel === undefined) {
            return false;
        }

        const result = this._panel!.webview.postMessage(message);

        if (Container.isDebugging && Container.config.enableUIWS) {
            this._ws.send(message);
        }

        return result;
    }

    protected onPanelDisposed() {
        if (this._disposablePanel) {
            this._disposablePanel.dispose();
        }
        if (this._controller) {
            this._controller = undefined;
        }

        this._panel = undefined;
        this._onDidPanelDispose.fire();
    }

    public dispose() {
        if (this._disposablePanel) {
            this._disposablePanel.dispose();
        }

        if (this._controller) {
            this._controller = undefined;
        }

        this._onDidPanelDispose.dispose();
    }
}
