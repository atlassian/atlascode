import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { ChatMessage, ErrorMessage } from '../react/atlascode/rovo-dev/utils';
import { RovoDevResponse } from './responseParser';

export const enum RovoDevProviderMessageType {
    PromptSent = 'promptSent',
    Response = 'response',
    UserChatMessage = 'userChatMessage',
    CompleteMessage = 'completeMessage',
    ToolCall = 'toolCall',
    ToolReturn = 'toolReturn',
    ErrorMessage = 'errorMessage',
    NewSession = 'newSession',
    Initialized = 'initialized',
    CancelFailed = 'cancelFailed',
    ReturnText = 'returnText',
    CreatePRComplete = 'createPRComplete',
}

export interface RovoDevObjectResponse {
    dataObject: RovoDevResponse;
}

export type RovoDevProviderMessage =
    | ReducerAction<RovoDevProviderMessageType.PromptSent>
    | ReducerAction<RovoDevProviderMessageType.Response, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.UserChatMessage, { message: ChatMessage }>
    | ReducerAction<RovoDevProviderMessageType.CompleteMessage>
    | ReducerAction<RovoDevProviderMessageType.ToolCall, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ToolReturn, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ErrorMessage, { message: ErrorMessage }>
    | ReducerAction<RovoDevProviderMessageType.NewSession>
    | ReducerAction<RovoDevProviderMessageType.Initialized>
    | ReducerAction<RovoDevProviderMessageType.CancelFailed>
    | ReducerAction<RovoDevProviderMessageType.ReturnText, { text: string }>
    | ReducerAction<RovoDevProviderMessageType.CreatePRComplete>;
