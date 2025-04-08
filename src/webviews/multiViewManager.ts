import { Disposable } from 'vscode';

import { isInitializable, ReactWebview } from './abstractWebview';

// AbstractMultiViewManager is a base class for managing a single webview type that can display in multiple tabs at once.
// This is useful for things like PRs where we want to have multiple detail views with different data.
// Generic Types:
// T = the type of data used to determine which view to display.
export abstract class AbstractMultiViewManager<T> implements Disposable {
    private _viewMap: Map<string, ReactWebview> = new Map<string, ReactWebview>();
    private _extensionPath: string;
    private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;
    }

    // Children need to implement this to return a unique key for the view based on the data passed to it.
    abstract dataKey(data: T): string;

    // Children need to implement this to create a ReactWebview of a specific type.
    abstract createView(extensionPath: string): ReactWebview;

    // This is called to create or show a webview based on the data passed to it.
    // e.g. create or show a webview for this PR.
    public async createOrShow(data: T) {
        const key = this.dataKey(data);
        const view = this._viewMap.get(key) || this.createView(this._extensionPath);

        // We listen for panel dispose events from the webview so we can dispose of them and remove them from this manager
        // as their displayable panels come and go.
        this._listeners.set(
            key,
            view.onDidPanelDispose()(() => {
                const view = this._viewMap.get(key);

                if (view) {
                    view.dispose();
                    this._viewMap.delete(key);
                }

                this._listeners.delete(key);
            }, this),
        );
        this._viewMap.set(key, view);

        await view.createOrShow();

        if (isInitializable(view)) {
            view.initialize(data);
        }
    }

    public async refreshAll(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._viewMap.forEach((view) => {
                view.invalidate();
            });
        });
    }

    dispose() {
        this._viewMap.forEach((view: ReactWebview, key: string) => {
            view.dispose();
        });

        this._viewMap.clear();
    }
}
