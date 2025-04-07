import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';

import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { WelcomeAction, WelcomeActionType } from '../../../lib/ipc/fromUI/welcome';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    emptyWelcomeInitMessage,
    WelcomeInitMessage,
    WelcomeMessage,
    WelcomeMessageType,
} from '../../../lib/ipc/toUI/welcome';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface WelcomeControllerApi {
    postMessage: PostMessageFunc<WelcomeAction>;
    openSettings: () => void;
    openLink: (linkId: KnownLinkID) => void;
}

const emptyApi: WelcomeControllerApi = {
    postMessage: () => {},
    openSettings: () => {},
    openLink: () => {},
};

export const WelcomeControllerContext = React.createContext(emptyApi);

export interface WelcomeState extends WelcomeInitMessage {}
const emptyState = {
    ...emptyWelcomeInitMessage,
};

enum WelcomeUIActionType {
    Init = 'init',
}

type WelcomeUIAction = ReducerAction<WelcomeUIActionType.Init, { data: WelcomeInitMessage }>;

function welcomeReducer(state: WelcomeState, action: WelcomeUIAction): WelcomeState {
    switch (action.type) {
        case WelcomeUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        default:
            // not needed for single action, uncomment if another action is added
            //return defaultStateGuard(state, action);
            return state;
    }
}

export function useWelcomeController(): [WelcomeState, WelcomeControllerApi] {
    const [state, dispatch] = useReducer(welcomeReducer, emptyState);

    const onMessageHandler = useCallback((message: WelcomeMessage): void => {
        switch (message.type) {
            case WelcomeMessageType.Init: {
                dispatch({ type: WelcomeUIActionType.Init, data: message });
                break;
            }
            default: {
                // not needed for single action, uncomment if another action is added
                //defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<WelcomeAction, WelcomeMessage, {}>(onMessageHandler);

    const openSettings = useCallback(() => postMessage({ type: WelcomeActionType.OpenSettings }), [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.WelcomeWebview,
                linkId: linkId,
            }),
        [postMessage],
    );

    const controllerApi = useMemo<WelcomeControllerApi>((): WelcomeControllerApi => {
        return {
            postMessage,
            openSettings,
            openLink,
        };
    }, [postMessage, openSettings, openLink]);

    return [state, controllerApi];
}
