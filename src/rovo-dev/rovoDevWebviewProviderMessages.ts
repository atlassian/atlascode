import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { DialogMessage } from '../react/atlascode/rovo-dev/utils';
import { RovoDevTextResponse, RovoDevToolCallResponse, RovoDevToolReturnResponse } from './responseParserInterfaces';
import { EntitlementCheckRovoDevHealthcheckResponse } from './rovoDevApiClientInterfaces';
import { DisabledState, RovoDevContextItem, RovoDevPrompt } from './rovoDevTypes';

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
    ContextAdded = 'contextAdded',
    ContextRemoved = 'contextRemoved',
    CheckGitChangesComplete = 'checkGitChangesComplete',
    ForceStop = 'forceStop',
    ShowFeedbackForm = 'showFeedbackForm',
    SetDebugPanel = 'setDebugPanel',
    SetPromptText = 'setPromptText',
    SetJiraWorkItems = 'setJiraWorkItems',
    CheckFileExistsComplete = 'checkFileExistsComplete',
}

interface FocusedContextRemovedResponse {
    isFocus: true;
}

interface NonFocusedContextRemovedResponse {
    isFocus: false;
    context: RovoDevContextItem;
}

export type RovoDevDisabledReason = DisabledState['subState'];

export type RovoDevEntitlementCheckFailedDetail = EntitlementCheckRovoDevHealthcheckResponse['detail'];

export type RovoDevResponseMessageType = RovoDevTextResponse | RovoDevToolCallResponse | RovoDevToolReturnResponse;
//| RovoDevRetryPromptResponse;

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
    | ReducerAction<RovoDevProviderMessageType.CompleteMessage>
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
    | ReducerAction<RovoDevProviderMessageType.SetPromptText, { text: string }>
    | ReducerAction<
          RovoDevProviderMessageType.SetJiraWorkItems,
          { issues: MinimalIssue<DetailedSiteInfo>[] | undefined }
      >
    | ReducerAction<
          RovoDevProviderMessageType.CheckFileExistsComplete,
          { requestId: string; filePath: string; exists: boolean }
      >;
