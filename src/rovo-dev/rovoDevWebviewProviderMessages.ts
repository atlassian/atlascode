import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { ErrorMessage } from '../react/atlascode/rovo-dev/utils';
import { RovoDevResponse } from './responseParser';
import { RovoDevContextItem, RovoDevPrompt } from './rovoDevTypes';

export const enum RovoDevProviderMessageType {
    RovoDevDisabled = 'rovoDevDisabled',
    SignalPromptSent = 'signalPromptSent',
    Response = 'response',
    CompleteMessage = 'completeMessage',
    ToolCall = 'toolCall',
    ToolReturn = 'toolReturn',
    ErrorMessage = 'errorMessage',
    ClearChat = 'clearChat',
    ProviderReady = 'providerReady',
    SetInitializing = 'setInitializing',
    SetDownloadProgress = 'setDownloadProgress',
    SetMcpAcceptanceRequired = 'setMcpAcceptanceRequired',
    RovoDevReady = 'rovoDevReady',
    CancelFailed = 'cancelFailed',
    CreatePRComplete = 'createPRComplete',
    GetCurrentBranchNameComplete = 'getCurrentBranchNameComplete',
    ContextAdded = 'contextAdded',
    ContextRemoved = 'contextRemoved',
    CheckGitChangesComplete = 'checkGitChangesComplete',
    ForceStop = 'forceStop',
    ShowFeedbackForm = 'showFeedbackForm',
    SetDebugPanel = 'setDebugPanel',
    SetPromptText = 'setPromptText',
}

export interface RovoDevObjectResponse {
    dataObject: RovoDevResponse;
}

interface FocusedContextRemovedResponse {
    isFocus: true;
}

interface NonFocusedContextRemovedResponse {
    isFocus: false;
    context: RovoDevContextItem;
}

export type RovoDevDisabledReason = 'noOpenFolder' | 'needAuth' | 'other';

export type RovoDevProviderMessage =
    | ReducerAction<RovoDevProviderMessageType.RovoDevDisabled, { reason: RovoDevDisabledReason }>
    | ReducerAction<RovoDevProviderMessageType.SignalPromptSent, RovoDevPrompt & { echoMessage: boolean }>
    | ReducerAction<RovoDevProviderMessageType.Response, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.CompleteMessage, { isReplay?: boolean }>
    | ReducerAction<RovoDevProviderMessageType.ToolCall, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ToolReturn, RovoDevObjectResponse>
    | ReducerAction<RovoDevProviderMessageType.ErrorMessage, { message: ErrorMessage }>
    | ReducerAction<RovoDevProviderMessageType.ClearChat>
    | ReducerAction<RovoDevProviderMessageType.ProviderReady, { workspacePath?: string; homeDir?: string }>
    | ReducerAction<RovoDevProviderMessageType.SetInitializing, { isPromptPending: boolean }>
    | ReducerAction<
          RovoDevProviderMessageType.SetDownloadProgress,
          { isPromptPending: boolean; downloadedBytes: number; totalBytes: number }
      >
    | ReducerAction<RovoDevProviderMessageType.SetMcpAcceptanceRequired, { isPromptPending: boolean; mcpIds: string[] }>
    | ReducerAction<RovoDevProviderMessageType.RovoDevReady, { isPromptPending: boolean }>
    | ReducerAction<RovoDevProviderMessageType.CancelFailed>
    | ReducerAction<RovoDevProviderMessageType.CreatePRComplete, { data: { url?: string; error?: string } }>
    | ReducerAction<RovoDevProviderMessageType.GetCurrentBranchNameComplete, { data: { branchName?: string } }>
    | ReducerAction<RovoDevProviderMessageType.ContextAdded, { context: RovoDevContextItem }>
    | ReducerAction<
          RovoDevProviderMessageType.ContextRemoved,
          FocusedContextRemovedResponse | NonFocusedContextRemovedResponse
      >
    | ReducerAction<RovoDevProviderMessageType.CheckGitChangesComplete, { hasChanges: boolean }>
    | ReducerAction<RovoDevProviderMessageType.ForceStop>
    | ReducerAction<RovoDevProviderMessageType.ShowFeedbackForm>
    | ReducerAction<
          RovoDevProviderMessageType.SetDebugPanel,
          { enabled: boolean; context: Record<string, string>; mcpContext: Record<string, string> }
      >
    | ReducerAction<RovoDevProviderMessageType.SetPromptText, { text: string }>;
