import { DetailedSiteInfo, MinimalIssue } from './api/extensionApi';
import {
    EntitlementCheckRovoDevHealthcheckResponse,
    RovoDevRetryPromptResponse,
    RovoDevTextResponse,
    RovoDevToolCallResponse,
    RovoDevToolReturnResponse,
} from './client';
import { ReducerAction } from './messaging';
import { DisabledState, RovoDevContextItem, RovoDevPrompt } from './rovoDevTypes';
import { ModifiedFile } from './ui/rovoDevViewMessages';
import { ChatMessage, DialogMessage } from './ui/utils';

export const enum RovoDevProviderMessageType {
    RovoDevDisabled = 'rovoDevDisabled',
    SignalPromptSent = 'signalPromptSent',
    RovoDevResponseMessage = 'rovoDevResponseMessage',
    CompleteMessage = 'completeMessage',
    ShowDialog = 'showDialog',
    ClearChat = 'clearChat',
    ProviderReady = 'providerReady',
    SetInitializing = 'setInitializing',
    SetDownloadProgress = 'setDownloadProgress',
    SetMcpAcceptanceRequired = 'setMcpAcceptanceRequired',
    RovoDevReady = 'rovoDevReady',
    CancelFailed = 'cancelFailed',
    CreatePRComplete = 'createPRComplete',
    GetCurrentBranchNameComplete = 'getCurrentBranchNameComplete',
    SetChatContext = 'setChatContext',
    CheckGitChangesComplete = 'checkGitChangesComplete',
    FilterModifiedFilesByContentComplete = 'filterModifiedFilesByContentComplete',
    ForceStop = 'forceStop',
    ShowFeedbackForm = 'showFeedbackForm',
    SetDebugPanel = 'setDebugPanel',
    SetPromptText = 'setPromptText',
    SetJiraWorkItems = 'setJiraWorkItems',
    CheckFileExistsComplete = 'checkFileExistsComplete',
    SetThinkingBlockEnabled = 'setThinkingBlockEnabled',
    RestoreState = 'restoreState',
}

export type RovoDevDisabledReason = DisabledState['subState'];

export type RovoDevEntitlementCheckFailedDetail = EntitlementCheckRovoDevHealthcheckResponse['detail'];

export type RovoDevResponseMessageType =
    | RovoDevTextResponse
    | RovoDevToolCallResponse
    | RovoDevToolReturnResponse
    | RovoDevRetryPromptResponse;

export interface RovoDevWebviewState {
    history: ChatMessage[];
    isDeepPlanCreated: boolean;
    isDeepPlanToggled: boolean;
    isYoloModeToggled: boolean;
    promptContextCollection: RovoDevContextItem[];
}

export type RovoDevProviderMessage =
    | ReducerAction<
          RovoDevProviderMessageType.RovoDevDisabled,
          { reason: RovoDevDisabledReason; detail?: RovoDevEntitlementCheckFailedDetail }
      >
    | ReducerAction<RovoDevProviderMessageType.SignalPromptSent, RovoDevPrompt & { echoMessage: boolean }>
    | ReducerAction<
          RovoDevProviderMessageType.RovoDevResponseMessage,
          { message: RovoDevResponseMessageType | RovoDevResponseMessageType[] }
      >
    | ReducerAction<RovoDevProviderMessageType.CompleteMessage, { promptId: string }>
    | ReducerAction<RovoDevProviderMessageType.ShowDialog, { message: DialogMessage }>
    | ReducerAction<RovoDevProviderMessageType.ClearChat>
    | ReducerAction<
          RovoDevProviderMessageType.ProviderReady,
          { workspacePath?: string; homeDir?: string; yoloMode?: boolean }
      >
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
    | ReducerAction<RovoDevProviderMessageType.SetChatContext, { context: RovoDevContextItem[] }>
    | ReducerAction<RovoDevProviderMessageType.CheckGitChangesComplete, { hasChanges: boolean }>
    | ReducerAction<RovoDevProviderMessageType.FilterModifiedFilesByContentComplete, { filteredFiles: ModifiedFile[] }>
    | ReducerAction<RovoDevProviderMessageType.ForceStop>
    | ReducerAction<RovoDevProviderMessageType.ShowFeedbackForm>
    | ReducerAction<
          RovoDevProviderMessageType.SetDebugPanel,
          { enabled: boolean; context: Record<string, string>; mcpContext: Record<string, string> }
      >
    | ReducerAction<RovoDevProviderMessageType.SetPromptText, { text: string }>
    | ReducerAction<
          RovoDevProviderMessageType.SetJiraWorkItems,
          { issues: MinimalIssue<DetailedSiteInfo>[] | undefined }
      >
    | ReducerAction<
          RovoDevProviderMessageType.CheckFileExistsComplete,
          { requestId: string; filePath: string; exists: boolean }
      >
    | ReducerAction<RovoDevProviderMessageType.SetThinkingBlockEnabled, { enabled: boolean }>
    | ReducerAction<RovoDevProviderMessageType.RestoreState, { state: RovoDevWebviewState }>;
