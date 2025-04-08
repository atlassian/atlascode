import * as React from 'react';
import uuid from 'uuid';

import { Action, LegacyPMFData } from '../../ipc/messaging';
import { OnMessageEventPromise } from '../../util/reactpromise';
import { ConnectionTimeout } from '../../util/time';
import { darken, lighten, opacity } from './colors';

interface VsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): {};
}

declare function acquireVsCodeApi(): VsCodeApi;

// WebviewComponent is the base React component for creating a webview in vscode.
// This handles comms between vscode and react.
// Generic Types:
// A = the type of ipc.Action(s) to send to vscode
// R = the type of ipc.Message(s) we can recieve
// P = the type of react properties
// S = the type of react state
export abstract class WebviewComponent<A extends Action, R, P, S> extends React.Component<P, S> {
    protected readonly _api: VsCodeApi;

    constructor(props: Readonly<P>) {
        super(props);
        this._api = acquireVsCodeApi();

        const onMessageEvent = this.onMessageEvent.bind(this);

        window.addEventListener('message', onMessageEvent);
        this.initializeColors();
    }

    protected initializeColors() {
        const onColorThemeChanged = () => {
            const body = document.body;
            const computedStyle = getComputedStyle(body);

            const bodyStyle = body.style;
            let color = computedStyle.getPropertyValue('--vscode-editor-background').trim();
            bodyStyle.setProperty('--vscode-editor-background--lighten-05', lighten(color, 5));
            bodyStyle.setProperty('--vscode-editor-background--darken-05', darken(color, 5));
            bodyStyle.setProperty('--vscode-editor-background--lighten-075', lighten(color, 7.5));
            bodyStyle.setProperty('--vscode-editor-background--darken-075', darken(color, 7.5));
            bodyStyle.setProperty('--vscode-editor-background--lighten-15', lighten(color, 15));
            bodyStyle.setProperty('--vscode-editor-background--darken-15', darken(color, 15));
            bodyStyle.setProperty('--vscode-editor-background--lighten-30', lighten(color, 30));
            bodyStyle.setProperty('--vscode-editor-background--darken-30', darken(color, 30));

            color = computedStyle.getPropertyValue('--color').trim();
            bodyStyle.setProperty('--color--75', opacity(color, 75));
            bodyStyle.setProperty('--color--50', opacity(color, 50));

            color = computedStyle.getPropertyValue('--vscode-editor-foreground').trim();
            bodyStyle.setProperty('--vscode-editor-foreground--75', opacity(color, 75));
            bodyStyle.setProperty('--vscode-editor-foreground--50', opacity(color, 50));

            color = computedStyle.getPropertyValue('--vscode-editor-background').trim();
            bodyStyle.setProperty('--vscode-editor-background--lighten-05', lighten(color, 5));
            bodyStyle.setProperty('--vscode-editor-background--darken-05', darken(color, 5));

            color = computedStyle.getPropertyValue('--vscode-button-foreground').trim();
            bodyStyle.setProperty('--vscode-button-foreground--75', opacity(color, 75));
            bodyStyle.setProperty('--vscode-button-foreground--50', opacity(color, 50));

            color = computedStyle.getPropertyValue('--vscode-button-background').trim();
            bodyStyle.setProperty('--vscode-button-background--lighten-05', lighten(color, 5));
            bodyStyle.setProperty('--vscode-button-background--lighten-50', lighten(color, 50));
            bodyStyle.setProperty('--vscode-button-background--lighten-75', lighten(color, 75));
            bodyStyle.setProperty('--vscode-button-background--lighten-80', lighten(color, 80));
            bodyStyle.setProperty('--vscode-button-background--darken-05', darken(color, 5));
            bodyStyle.setProperty('--vscode-button-background--50', opacity(color, 50));
            bodyStyle.setProperty('--vscode-button-background--75', opacity(color, 75));
        };

        const observer = new MutationObserver(onColorThemeChanged);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        onColorThemeChanged();
    }

    protected onPMFLater() {
        this._api.postMessage({ action: 'pmfLater' });
    }
    protected onPMFNever() {
        this._api.postMessage({ action: 'pmfNever' });
    }
    protected onPMFSubmit(data: LegacyPMFData) {
        this._api.postMessage({ action: 'pmfSubmit', pmfData: data });
    }
    protected onPMFOpen() {
        this._api.postMessage({ action: 'pmfOpen' });
    }

    private onMessageEvent(e: MessageEvent) {
        const msg = e.data as R;
        this.onMessageReceived(msg);
    }

    abstract onMessageReceived(e: R): boolean;

    protected postMessage(e: A) {
        this._api.postMessage(e);
    }

    protected postMessageWithEventPromise(
        send: any,
        waitForEvent: string,
        timeout: number,
        nonce?: string,
    ): Promise<any> {
        this._api.postMessage(send);
        return OnMessageEventPromise(waitForEvent, timeout, nonce);
    }

    protected async fetchImage(url: string): Promise<any> {
        const nonce = uuid.v4();
        return (
            await this.postMessageWithEventPromise(
                {
                    action: 'getImage',
                    nonce: nonce,
                    url: url,
                },
                'getImageDone',
                ConnectionTimeout,
                nonce,
            )
        ).imgData;
    }
}
