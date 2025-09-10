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
    enable_deep_plan: boolean;
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

// ---- Rovo Dev Chat States ----

export interface BasicState {
    state: 'WaitingForPrompt' | 'GeneratingResponse' | 'CancellingResponse' | 'ExecutingPlan' | 'ProcessTerminated';
}

export interface InitializingState {
    state: 'Initializing';
    subState: 'Other';
    isPromptPending: boolean;
}

export interface InitializingDownladingState {
    state: 'Initializing';
    subState: 'UpdatingBinaries';
    isPromptPending: boolean;
    downloadedBytes: number;
    totalBytes: number;
}

export interface DisabledState {
    state: 'Disabled';
    subState: 'NeedAuth' | 'NoWorkspaceOpen' | 'Other';
}

export type State = BasicState | InitializingState | InitializingDownladingState | DisabledState;
