import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { useCallback, useContext, useEffect, useMemo } from 'react';

import { CommonMessageType } from '../../lib/ipc/toUI/common';
import { ErrorControllerContext } from './common/errorController';
import { PMFControllerContext } from './common/pmf/pmfController';

export type ExtractActionType<T> = T extends ReducerAction<infer K1> ? K1 : never;

export type PostMessageFunc<T> = ReturnType<typeof useMessagingApi<T, any, any>>['postMessage'];
export type ReceiveMessageFunc<M extends ReducerAction<any, any>> = (message: M) => void;

interface VsCodeApi {
    postMessage<T = {}>(msg: T): void;
    setState(state: {}): void;
    getState(): {};
}
declare function acquireVsCodeApi(): VsCodeApi;
export function useMessagingApi<A, M extends ReducerAction<any, any>, R extends ReducerAction<any, any>>(
    onMessageHandler: ReceiveMessageFunc<M>,
) {
    const apiRef = useMemo<VsCodeApi>(acquireVsCodeApi, [acquireVsCodeApi]);

    const postMessage = useCallback(
        (action: A): void => {
            apiRef.postMessage<A>(action);
        },
        [apiRef],
    );

    const postMessagePromise = useCallback(
        <Z extends ExtractActionType<R>>(
            action: A,
            waitForEvent: Z,
            timeout: number,
            nonce?: string,
        ): Promise<Extract<R, { type: Z }>> => {
            apiRef.postMessage(action);
            return new Promise<Extract<R, { type: Z }>>((resolve, reject) => {
                const timer = setTimeout(() => {
                    window.removeEventListener('message', promiseListener);
                    clearTimeout(timer);
                    reject(`timeout waiting for event ${waitForEvent}`);
                }, timeout);

                const promiseListener = (e: MessageEvent): void => {
                    if (
                        e.data.type &&
                        waitForEvent &&
                        e.data.type === waitForEvent &&
                        (!nonce || e.data.nonce === nonce)
                    ) {
                        clearTimeout(timer);
                        window.removeEventListener('message', promiseListener);
                        resolve(e.data);
                    }
                    if (e.data.type === CommonMessageType.Error && nonce && e.data.nonce === nonce) {
                        window.removeEventListener('message', promiseListener);
                        clearTimeout(timer);
                        reject(e.data.reason);
                    }
                };

                window.addEventListener('message', promiseListener);
            });
        },
        [apiRef],
    );

    const errorController = useContext(ErrorControllerContext);
    const pmfController = useContext(PMFControllerContext);

    const internalMessageHandler = useCallback(
        (msg: any): void => {
            type M1 = {
                type?: any;
                showPMF?: any;
                reason?: any;
            } & M;
            const message = msg.data as M1;
            if (message && message.type) {
                switch (message.type) {
                    case CommonMessageType.Error: {
                        errorController.showError(message.reason);
                        break;
                    }
                    case CommonMessageType.PMFStatus: {
                        if (message.showPMF) {
                            pmfController.showPMFBanner();
                        }

                        break;
                    }
                    default: {
                        onMessageHandler(message);
                    }
                }
            }
        },
        [errorController, pmfController, onMessageHandler],
    );

    useEffect(() => {
        window.addEventListener('message', internalMessageHandler);
        apiRef.postMessage({ type: 'refresh' });

        return () => {
            window.removeEventListener('message', internalMessageHandler);
        };
    }, [onMessageHandler, internalMessageHandler, apiRef]);

    return { postMessage, postMessagePromise };
}
