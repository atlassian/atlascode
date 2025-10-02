// abstracted responses' interfaces

export interface RovoDevUserPromptResponse {
    event_kind: 'user-prompt';
    content: string;
    timestamp: string;
}

export interface RovoDevTextResponse {
    event_kind: 'text';
    index: number;
    content: string;
}

export interface RovoDevToolCallResponse {
    event_kind: 'tool-call';
    tool_name: RovoDevToolName;
    args: string;
    /** sets when the tool is being exposed by an MCP server */
    mcp_server?: string;
    tool_call_id: string;
}

export interface RovoDevToolReturnResponse {
    event_kind: 'tool-return';
    tool_name: RovoDevToolName;
    content?: string;
    parsedContent?: object;
    tool_call_id: string;
    timestamp: string;
    toolCallMessage: RovoDevToolCallResponse;
}

export interface RovoDevRetryPromptResponse {
    event_kind: 'retry-prompt';
    content: string;
    tool_name: RovoDevToolName;
    tool_call_id: string;
    timestamp: string;
}

export interface RovoDevExceptionResponse {
    event_kind: 'exception';
    message: string;
    title?: string;
    type: string;
}

export interface RovoDevWarningResponse {
    event_kind: 'warning';
    message: string;
    title?: string;
}

export interface RovoDevClearResponse {
    event_kind: 'clear';
    message: string;
}

export interface RovoDevPruneResponse {
    event_kind: 'prune';
    message: string;
}

export interface RovoDevOnCallToolStartResponse {
    event_kind: 'on_call_tools_start';
    tools: RovoDevToolCallResponse[];
}

export interface RovoDevCloseResponse {
    event_kind: 'close';
}

export type RovoDevResponse =
    | RovoDevUserPromptResponse
    | RovoDevTextResponse
    | RovoDevToolCallResponse
    | RovoDevToolReturnResponse
    | RovoDevRetryPromptResponse
    | RovoDevExceptionResponse
    | RovoDevWarningResponse
    | RovoDevClearResponse
    | RovoDevPruneResponse
    | RovoDevOnCallToolStartResponse
    | RovoDevCloseResponse;

export type RovoDevToolName =
    | 'create_file'
    | 'delete_file'
    | 'move_file'
    | 'find_and_replace_code'
    | 'open_files'
    | 'expand_code_chunks'
    | 'expand_folder'
    | 'grep'
    | 'bash'
    | 'create_technical_plan'
    | 'mcp_invoke_tool';
