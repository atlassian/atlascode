import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export const enum RovoDevViewResponseType {
    Prompt = 'prompt',
    CancelResponse = 'cancelResponse',
    OpenFile = 'openFile',
    UndoFileChanges = 'undoFileChanges',
    KeepFileChanges = 'keepFileChanges',
    GetOriginalText = 'getOriginalText',
    CreatePR = 'createPR',
}

export type RovoDevViewResponse =
    | ReducerAction<RovoDevViewResponseType.Prompt, { text: string }>
    | ReducerAction<RovoDevViewResponseType.CancelResponse>
    | ReducerAction<RovoDevViewResponseType.OpenFile, { filePath: string; tryShowDiff: boolean; range?: number[] }>
    | ReducerAction<RovoDevViewResponseType.UndoFileChanges, { filePaths: string[] }>
    | ReducerAction<RovoDevViewResponseType.KeepFileChanges, { filePaths: string[] }>
    | ReducerAction<RovoDevViewResponseType.GetOriginalText, { filePath: string; range?: number[]; requestId: string }>
    | ReducerAction<RovoDevViewResponseType.CreatePR>;
