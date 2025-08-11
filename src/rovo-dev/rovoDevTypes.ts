export type RovoDevContextFileInfo = {
    name: string;
    absolutePath: string;
    relativePath: string;
};

export type RovoDevContextSelectionInfo = {
    start: number;
    end: number;
};

export type RovoDevContextItem = {
    file: RovoDevContextFileInfo;
    selection?: RovoDevContextSelectionInfo;
    enabled?: boolean;
    // Optional indication of the editor pointing to an invalid file
    // e.g. welcome page, webview tab, etc
    invalid?: boolean;
};

export type RovoDevContext = {
    focusInfo?: RovoDevContextItem;
    contextItems?: RovoDevContextItem[];
};

export interface RovoDevPrompt {
    text: string;
    enable_deep_plan?: boolean;
    context?: RovoDevContext;
}

export interface CodeSnippetToChange {
    startLine: number;
    endLine: number;
    code: string;
}

export interface TechnicalPlanFileToChange {
    filePath: string;
    descriptionOfChange: string;
    clarifyingQuestionIfAny: string | null;
    codeSnippetsToChange: CodeSnippetToChange[];
}

export interface TechnicalPlanLogicalChange {
    summary: string;
    filesToChange: TechnicalPlanFileToChange[];
}

export interface TechnicalPlan {
    logicalChanges: TechnicalPlanLogicalChange[];
}

export const enum State {
    Disabled,
    NoWorkspaceOpen,
    WaitingForPrompt,
    GeneratingResponse,
    CancellingResponse,
    ExecutingPlan,
}

export const enum RovoDevInitState {
    NotInitialized,
    UpdatingBinaries,
    Initialized,
}
