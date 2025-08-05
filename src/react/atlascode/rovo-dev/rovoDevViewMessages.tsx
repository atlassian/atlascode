import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { RovoDevContext, RovoDevPrompt } from 'src/rovo-dev/rovoDevTypes';

export const enum RovoDevViewResponseType {
    Prompt = 'prompt',
    CancelResponse = 'cancelResponse',
    OpenFile = 'openFile',
    UndoFileChanges = 'undoFileChanges',
    KeepFileChanges = 'keepFileChanges',
    CreatePR = 'createPR',
    RetryPromptAfterError = 'retryPromptAfterError',
    GetCurrentBranchName = 'getCurrentBranchName',
    AddContext = 'addContext',
    ForceUserFocusUpdate = 'forceUserFocusUpdate',
    ReportChangedFilesPanelShown = 'reportChangedFilesPanelShown',
    ReportChangesGitPushed = 'reportChangesGitPushed',
    ReportThinkingDrawerExpanded = 'reportThinkingDrawerExpanded',
    CheckGitChanges = 'checkGitChanges',
}

export interface ModifiedFile {
    filePath: string;
    type: 'modify' | 'create' | 'delete';
}

export type RovoDevViewResponse =
    | ReducerAction<RovoDevViewResponseType.Prompt, RovoDevPrompt>
    | ReducerAction<RovoDevViewResponseType.CancelResponse>
    | ReducerAction<RovoDevViewResponseType.OpenFile, { filePath: string; tryShowDiff: boolean; range?: number[] }>
    | ReducerAction<RovoDevViewResponseType.UndoFileChanges, { files: ModifiedFile[] }>
    | ReducerAction<RovoDevViewResponseType.KeepFileChanges, { files: ModifiedFile[] }>
    | ReducerAction<RovoDevViewResponseType.CreatePR, { payload: { branchName: string; commitMessage: string } }>
    | ReducerAction<RovoDevViewResponseType.RetryPromptAfterError>
    | ReducerAction<RovoDevViewResponseType.GetCurrentBranchName>
    | ReducerAction<RovoDevViewResponseType.AddContext, { currentContext: RovoDevContext }>
    | ReducerAction<RovoDevViewResponseType.ForceUserFocusUpdate>
    | ReducerAction<RovoDevViewResponseType.ReportChangedFilesPanelShown, { filesCount: number }>
    | ReducerAction<RovoDevViewResponseType.ReportChangesGitPushed, { pullRequestCreated: boolean }>
    | ReducerAction<RovoDevViewResponseType.ReportThinkingDrawerExpanded>
    | ReducerAction<RovoDevViewResponseType.CheckGitChanges>;
