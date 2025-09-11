import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { ChatMessage, ErrorMessage } from '../react/atlascode/rovo-dev/utils';
import { RovoDevResponse } from './responseParser';
import { RovoDevContextItem, RovoDevPrompt } from './rovoDevTypes';

export const enum RovoDevProviderMessageType {
    RovoDevDisabled = 'rovoDevDisabled',
    PromptSent = 'promptSent',
    Response = 'response',
    UserChatMessage = 'userChatMessage',
    CompleteMessage = 'completeMessage',
    ToolCall = 'toolCall',
    ToolReturn = 'toolReturn',
    ErrorMessage = 'errorMessage',
    ClearChat = 'clearChat',
    ProviderReady = 'providerReady',
    SetInitializing = 'setInitializing',
    SetDownloadProgress = 'setDownloadProgress',
    RovoDevReady = 'rovoDevReady',
    CancelFailed = 'cancelFailed',
    CreatePRComplete = 'createPRComplete',
    GetCurrentBranchNameComplete = 'getCurrentBranchNameComplete',
    UserFocusUpdated = 'userFocusUpdated',
    ContextAdded = 'contextAdded',
    CheckGitChangesComplete = 'checkGitChangesComplete',
    ForceStop = 'forceStop',
    ShowFeedbackForm = 'showFeedbackForm',
}

export interface RovoDevObjectResponse {
    dataObject: RovoDevResponse;
}

export type RovoDevProviderMessage =
    | ReducerAction<RovoDevProviderMessageType.RovoDevDisabled, { reason: 'needAuth' | 'other' }>
    | ReducerAction<RovoDevProviderMessageType.PromptSent, RovoDevPrompt>
    | ReducerAction<RovoDevProviderMessageType.Response, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.UserChatMessage, { message: ChatMessage }>
    | ReducerAction<RovoDevProviderMessageType.CompleteMessage, { isReplay?: boolean }>
    | ReducerAction<RovoDevProviderMessageType.ToolCall, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ToolReturn, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ErrorMessage, { message: ErrorMessage }>
    | ReducerAction<RovoDevProviderMessageType.ClearChat>
    | ReducerAction<RovoDevProviderMessageType.ProviderReady, { workspaceCount: number }>
    | ReducerAction<RovoDevProviderMessageType.SetInitializing, { isPromptPending: boolean }>
    | ReducerAction<
          RovoDevProviderMessageType.SetDownloadProgress,
          { isPromptPending: boolean; downloadedBytes: number; totalBytes: number }
      >
    | ReducerAction<RovoDevProviderMessageType.RovoDevReady, { isPromptPending: boolean }>
    | ReducerAction<RovoDevProviderMessageType.CancelFailed>
    | ReducerAction<RovoDevProviderMessageType.CreatePRComplete, { data: { url?: string; error?: string } }>
    | ReducerAction<RovoDevProviderMessageType.GetCurrentBranchNameComplete, { data: { branchName?: string } }>
    | ReducerAction<RovoDevProviderMessageType.UserFocusUpdated, { userFocus: RovoDevContextItem }>
    | ReducerAction<RovoDevProviderMessageType.ContextAdded, { context: RovoDevContextItem }>
    | ReducerAction<RovoDevProviderMessageType.CheckGitChangesComplete, { hasChanges: boolean }>
    | ReducerAction<RovoDevProviderMessageType.ForceStop>
    | ReducerAction<RovoDevProviderMessageType.ShowFeedbackForm>;
