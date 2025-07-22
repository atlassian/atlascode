import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export const enum RovoDevViewResponseType {
    Prompt = 'prompt',
    CancelResponse = 'cancelResponse',
    OpenFile = 'openFile',
    UndoFileChanges = 'undoFileChanges',
    KeepFileChanges = 'keepFileChanges',
    GetOriginalText = 'getOriginalText',
    CreatePR = 'createPR',
    RetryPromptAfterError = 'retryPromptAfterError',
}

export interface PromptMessage {
    text: string;
    enable_deep_plan?: boolean;
}

export type RovoDevViewResponse =
    | ReducerAction<RovoDevViewResponseType.Prompt, PromptMessage>
    | ReducerAction<RovoDevViewResponseType.CancelResponse>
    | ReducerAction<RovoDevViewResponseType.OpenFile, { filePath: string; tryShowDiff: boolean; range?: number[] }>
    | ReducerAction<RovoDevViewResponseType.UndoFileChanges, { filePaths: string[] }>
    | ReducerAction<RovoDevViewResponseType.KeepFileChanges, { filePaths: string[] }>
    | ReducerAction<RovoDevViewResponseType.GetOriginalText, { filePath: string; range?: number[]; requestId: string }>
    | ReducerAction<RovoDevViewResponseType.RetryPromptAfterError>
    | ReducerAction<RovoDevViewResponseType.CreatePR>;
