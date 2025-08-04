import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { ChatMessage, ErrorMessage } from '../react/atlascode/rovo-dev/utils';
import { RovoDevResponse } from './responseParser';
import { RovoDevContextItem, RovoDevPrompt } from './rovoDevTypes';

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
    GetCurrentBranchNameComplete = 'getCurrentBranchNameComplete',
    UserFocusUpdated = 'userFocusUpdated',
    ContextAdded = 'contextAdded',
    CheckGitChangesComplete = 'checkGitChangesComplete',
}

export interface RovoDevObjectResponse {
    dataObject: RovoDevResponse;
}

export type RovoDevProviderMessage =
    | ReducerAction<RovoDevProviderMessageType.PromptSent, RovoDevPrompt>
    | ReducerAction<RovoDevProviderMessageType.Response, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.UserChatMessage, { message: ChatMessage }>
    | ReducerAction<RovoDevProviderMessageType.CompleteMessage, { isReplay?: boolean }>
    | ReducerAction<RovoDevProviderMessageType.ToolCall, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ToolReturn, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ErrorMessage, { message: ErrorMessage }>
    | ReducerAction<RovoDevProviderMessageType.NewSession>
    | ReducerAction<RovoDevProviderMessageType.Initialized>
    | ReducerAction<RovoDevProviderMessageType.CancelFailed>
    | ReducerAction<RovoDevProviderMessageType.ReturnText, { text: string }>
    | ReducerAction<RovoDevProviderMessageType.CreatePRComplete, { data: { url?: string; error?: string } }>
    | ReducerAction<RovoDevProviderMessageType.GetCurrentBranchNameComplete, { data: { branchName?: string } }>
    | ReducerAction<RovoDevProviderMessageType.UserFocusUpdated, { userFocus: RovoDevContextItem }>
    | ReducerAction<RovoDevProviderMessageType.ContextAdded, { context: RovoDevContextItem }>
    | ReducerAction<RovoDevProviderMessageType.CheckGitChangesComplete, { hasChanges: boolean }>;
