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
