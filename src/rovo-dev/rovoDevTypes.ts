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
