import { RovoDevContextItem, RovoDevPrompt, ToolPermissionDialogChoice } from 'src/rovo-dev/rovoDevTypes';

import { AgentMode } from '../client';
import { ReducerAction } from '../messaging';
import { RovoDevAgentModel } from '../rovoDevWebviewProviderMessages';
import { FeedbackType } from './feedback-form/FeedbackForm';

export const enum RovoDevViewResponseType {
    Refresh = 'refresh',
    Prompt = 'prompt',
    CancelResponse = 'cancelResponse',
    OpenFile = 'openFile',
    OpenJira = 'openJira',
    OpenFolder = 'openFolder',
    UndoFileChanges = 'undoFileChanges',
    KeepFileChanges = 'keepFileChanges',
    CreatePR = 'createPR',
    RetryPromptAfterError = 'retryPromptAfterError',
    GetCurrentBranchName = 'getCurrentBranchName',
    AddContext = 'addContext',
    RemoveContext = 'removeContext',
    ToggleContextFocus = 'toggleContextFocus',
    ForceUserFocusUpdate = 'forceUserFocusUpdate',
    ReportChangedFilesPanelShown = 'reportChangedFilesPanelShown',
    ReportChangesGitPushed = 'reportChangesGitPushed',
    ReportThinkingDrawerExpanded = 'reportThinkingDrawerExpanded',
    ReportCreatePrButtonClicked = 'reportCreatePrButtonClicked',
    CheckGitChanges = 'checkGitChanges',
    WebviewReady = 'webviewReady',
    GetAgentMemory = 'getAgentMemory',
    TriggerFeedback = 'triggerFeedback',
    SendFeedback = 'sendFeedback',
    LaunchJiraAuth = 'launchJiraAuth',
    SubmitRovoDevAuth = 'submitRovoDevAuth',
    McpConsentChoiceSubmit = 'mcpConsentChoiceSubmit',
    CheckFileExists = 'checkFileExists',
    ToolPermissionChoiceSubmit = 'toolPermissionChoiceSubmit',
    YoloModeToggled = 'yoloModeToggled',
    FullContextModeToggled = 'fullContextModeToggled',
    GetAvailableAgentModes = 'getAvailableAgentModes',
    SetAgentMode = 'setAgentMode',
    SetAgentModel = 'setAgentModel',
    GetCurrentAgentMode = 'getCurrentAgentMode',
    FilterModifiedFilesByContent = 'filterModifiedFilesByContent',
    OpenExternalLink = 'openExternalLink',
    OpenRovoDevLogFile = 'openRovoDevLogFile',
    MessageRendered = 'messageRendered',
    ReportRenderError = 'reportRenderError',
    StartNewSession = 'startNewSession',
    RestartProcess = 'restartProcess',
    ShowSessionHistory = 'showSessionHistory',
    FetchSavedPrompts = 'fetchSavedPrompts',
}

export type FileOperationType = 'modify' | 'create' | 'delete';

export interface ModifiedFile {
    filePath: string;
    type: FileOperationType;
}

export type McpConsentChoice = 'accept' | 'acceptAll' | 'deny';

export type RovoDevViewResponse =
    | ReducerAction<RovoDevViewResponseType.Refresh>
    | ReducerAction<RovoDevViewResponseType.Prompt, RovoDevPrompt>
    | ReducerAction<RovoDevViewResponseType.CancelResponse>
    | ReducerAction<RovoDevViewResponseType.OpenFile, { filePath: string; tryShowDiff: boolean; range?: number[] }>
    | ReducerAction<RovoDevViewResponseType.OpenJira, { url: string }>
    | ReducerAction<RovoDevViewResponseType.OpenFolder>
    | ReducerAction<RovoDevViewResponseType.UndoFileChanges, { files: ModifiedFile[] }>
    | ReducerAction<RovoDevViewResponseType.KeepFileChanges, { files: ModifiedFile[] }>
    | ReducerAction<RovoDevViewResponseType.CreatePR, { payload: { branchName: string; commitMessage?: string } }>
    | ReducerAction<RovoDevViewResponseType.RetryPromptAfterError>
    | ReducerAction<RovoDevViewResponseType.GetCurrentBranchName>
    | ReducerAction<RovoDevViewResponseType.AddContext, { dragDropData?: string[]; contextItem?: RovoDevContextItem }>
    | ReducerAction<RovoDevViewResponseType.RemoveContext, { item: RovoDevContextItem }>
    | ReducerAction<RovoDevViewResponseType.ToggleContextFocus, { enabled: boolean }>
    | ReducerAction<RovoDevViewResponseType.ForceUserFocusUpdate>
    | ReducerAction<RovoDevViewResponseType.ReportChangedFilesPanelShown, { filesCount: number }>
    | ReducerAction<RovoDevViewResponseType.ReportChangesGitPushed, { pullRequestCreated: boolean }>
    | ReducerAction<RovoDevViewResponseType.ReportThinkingDrawerExpanded>
    | ReducerAction<RovoDevViewResponseType.ReportCreatePrButtonClicked>
    | ReducerAction<RovoDevViewResponseType.CheckGitChanges>
    | ReducerAction<RovoDevViewResponseType.WebviewReady>
    | ReducerAction<RovoDevViewResponseType.GetAgentMemory>
    | ReducerAction<RovoDevViewResponseType.TriggerFeedback>
    | ReducerAction<
          RovoDevViewResponseType.SendFeedback,
          { feedbackType: FeedbackType; feedbackMessage: string; lastTenMessages?: string[]; canContact: boolean }
      >
    | ReducerAction<RovoDevViewResponseType.LaunchJiraAuth, { openApiTokenLogin: boolean }>
    | ReducerAction<RovoDevViewResponseType.SubmitRovoDevAuth, { host: string; email: string; apiToken: string }>
    | ReducerAction<RovoDevViewResponseType.McpConsentChoiceSubmit, { choice: McpConsentChoice; serverName?: string }>
    | ReducerAction<RovoDevViewResponseType.CheckFileExists, { filePath: string; requestId: string }>
    | ReducerAction<
          RovoDevViewResponseType.ToolPermissionChoiceSubmit,
          { choice: ToolPermissionDialogChoice; toolCallId: string }
      >
    | ReducerAction<RovoDevViewResponseType.YoloModeToggled, { value: boolean }>
    | ReducerAction<RovoDevViewResponseType.FullContextModeToggled, { value: boolean }>
    | ReducerAction<RovoDevViewResponseType.GetAvailableAgentModes>
    | ReducerAction<RovoDevViewResponseType.SetAgentMode, { mode: AgentMode }>
    | ReducerAction<RovoDevViewResponseType.SetAgentModel, { model: RovoDevAgentModel }>
    | ReducerAction<RovoDevViewResponseType.GetCurrentAgentMode>
    | ReducerAction<RovoDevViewResponseType.FilterModifiedFilesByContent, { files: ModifiedFile[] }>
    | ReducerAction<RovoDevViewResponseType.OpenExternalLink, { href: string }>
    | ReducerAction<RovoDevViewResponseType.OpenRovoDevLogFile>
    | ReducerAction<RovoDevViewResponseType.MessageRendered, { promptId: string }>
    | ReducerAction<
          RovoDevViewResponseType.ReportRenderError,
          {
              errorType: string;
              errorMessage: string;
              errorStack?: string;
              componentStack?: string;
          }
      >
    | ReducerAction<RovoDevViewResponseType.StartNewSession>
    | ReducerAction<RovoDevViewResponseType.RestartProcess>
    | ReducerAction<RovoDevViewResponseType.ShowSessionHistory>
    | ReducerAction<RovoDevViewResponseType.FetchSavedPrompts>;
