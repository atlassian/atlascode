import { Disposable, ViewColumn } from 'vscode';

import { AnalyticsApi } from '../lib/analyticsApi';
import { SingleWebview } from './singleViewFactory';
import { VSCWebviewControllerFactory } from './vscWebviewControllerFactory';

// MultiWebview is a container of ReactWebviews to mangage multiple instances of a view at a time.
// e.g. only open up one instance of the settings page vs. multiple instances of an issue page.
export class MultiWebview<FD, R> implements Disposable {
    private _map = new Map<string, SingleWebview<FD, R>>();

    constructor(
        private readonly extensionPath: string,
        private controllerFactory: VSCWebviewControllerFactory<FD>,
        private analyticsApi: AnalyticsApi,
    ) {}

    // createOrShow delegates the call to the corresponding ReactWebview based on the webviewId.
    // webviewId must be unique for each instance of a view (e.g. Jira issue key)
    public async createOrShow(
        webviewId: string,
        factoryData: FD,
        column: ViewColumn = ViewColumn.Active,
    ): Promise<void> {
        if (!this._map.has(webviewId)) {
            const view = new SingleWebview(this.extensionPath, this.controllerFactory, this.analyticsApi);
            this._map.set(webviewId, view);
            view.onDidPanelDispose()(() => {
                this._map.delete(webviewId);
            });
        }
        this._map.get(webviewId)?.createOrShow(factoryData, column);
    }

    dispose() {
        this._map.clear();
    }
}
