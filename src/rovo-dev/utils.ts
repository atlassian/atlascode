export interface FetchPayload {
    message: string;
}

export interface FetchResponseData {
    content?: string;
    part_kind?: string;
    tool_name?: string;
    args?: any;
}

export interface ChatMessage {
    text: string;
    author: 'User' | 'Agent' | 'Tool';
    timestamp: number;
}

export interface ChatHistory {
    messages: ChatMessage[];
}
