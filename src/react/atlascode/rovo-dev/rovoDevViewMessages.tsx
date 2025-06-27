import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export const enum RovoDevViewResponseType {
    Prompt = 'prompt',
    CancelResponse = 'cancelResponse',
    OpenFile = 'openFile',
    UndoFiles = 'undoFiles',
    AcceptFiles = 'acceptFiles',
}

export type RovoDevViewResponse =
    | ReducerAction<RovoDevViewResponseType.Prompt, { text: string }>
    | ReducerAction<RovoDevViewResponseType.CancelResponse>
    | ReducerAction<RovoDevViewResponseType.OpenFile, { filePath: string; tryShowDiff: boolean; range?: number[] }>
    | ReducerAction<RovoDevViewResponseType.UndoFiles, { filePaths: string[] }>
    | ReducerAction<RovoDevViewResponseType.AcceptFiles, { filePaths: string[] }>;
