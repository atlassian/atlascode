import { ToolPermissionChoice } from './rovoDevApiClientInterfaces';
import { RovoDevEntitlementCheckFailedDetail } from './rovoDevWebviewProviderMessages';

export type RovoDevContextFileInfo = {
    name: string;
    absolutePath: string;
};

export type RovoDevContextSelectionInfo = {
    start: number;
    end: number;
};

export interface RovoDevFileContext {
    contextType: 'file';
    isFocus: boolean;
    file: RovoDevContextFileInfo;
    selection?: RovoDevContextSelectionInfo;
    enabled: boolean;
}

export interface RovoDevJiraContext {
    contextType: 'jiraWorkItem';
    name: string;
    url: string;
}

export type RovoDevContextItem = RovoDevFileContext | RovoDevJiraContext;

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

export interface BasicDisabledState {
    state: 'Disabled';
    subState: 'NeedAuth' | 'NoWorkspaceOpen' | 'UnsupportedArch' | 'Other';
}

export interface EntitlementCheckDisabledState {
    state: 'Disabled';
    subState: 'EntitlementCheckFailed';
    detail: RovoDevEntitlementCheckFailedDetail;
}

export type DisabledState = BasicDisabledState | EntitlementCheckDisabledState;

export interface BasicState {
    state: 'WaitingForPrompt' | 'GeneratingResponse' | 'CancellingResponse' | 'ExecutingPlan' | 'ProcessTerminated';
}

export type State = BasicState | InitializingState | DisabledState;

export type ToolPermissionDialogChoice = ToolPermissionChoice | 'allowAll';
