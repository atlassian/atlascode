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
    isFocus: boolean;
    file: RovoDevContextFileInfo;
    selection?: RovoDevContextSelectionInfo;
    enabled: boolean;
};

export interface RovoDevPrompt {
    text: string;
    enable_deep_plan: boolean;
    context: RovoDevContextItem[];
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

export interface AbstractInitializingState {
    state: 'Initializing';
    isPromptPending: boolean;
}

export interface InitializingOtherState extends AbstractInitializingState {
    subState: 'Other';
}

export interface InitializingDownladingState extends AbstractInitializingState {
    subState: 'UpdatingBinaries';
    downloadedBytes: number;
    totalBytes: number;
}

export interface InitializingMcpAcceptanceState extends AbstractInitializingState {
    subState: 'MCPAcceptance';
    mcpIds: string[];
}

export type InitializingState = InitializingOtherState | InitializingDownladingState | InitializingMcpAcceptanceState;

export interface BasicState {
    state: 'WaitingForPrompt' | 'GeneratingResponse' | 'CancellingResponse' | 'ExecutingPlan' | 'ProcessTerminated';
}

export interface DisabledState {
    state: 'Disabled';
    subState: 'NeedAuth' | 'NoWorkspaceOpen' | 'Other';
}

export type State = BasicState | InitializingState | DisabledState;
