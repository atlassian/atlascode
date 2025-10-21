import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { RovoDevContextItem, RovoDevPrompt, ToolPermissionDialogChoice } from 'src/rovo-dev/rovoDevTypes';

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
    McpConsentChoiceSubmit = 'mcpConsentChoiceSubmit',
    CheckFileExists = 'checkFileExists',
    ToolPermissionChoiceSubmit = 'toolPermissionChoiceSubmit',
    YoloModeToggled = 'yoloModeToggled',
    FilterModifiedFilesByContent = 'filterModifiedFilesByContent',
    OpenExternalLink = 'openExternalLink',
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
    | ReducerAction<RovoDevViewResponseType.LaunchJiraAuth>
    | ReducerAction<RovoDevViewResponseType.McpConsentChoiceSubmit, { choice: McpConsentChoice; serverName?: string }>
    | ReducerAction<RovoDevViewResponseType.CheckFileExists, { filePath: string; requestId: string }>
    | ReducerAction<
          RovoDevViewResponseType.ToolPermissionChoiceSubmit,
          { choice: ToolPermissionDialogChoice; toolCallId: string }
      >
    | ReducerAction<RovoDevViewResponseType.YoloModeToggled, { value: boolean }>
    | ReducerAction<RovoDevViewResponseType.FilterModifiedFilesByContent, { files: ModifiedFile[] }>
    | ReducerAction<RovoDevViewResponseType.OpenExternalLink, { href: string }>;
