// abstracted responses' interfaces

import { RovoDevStatusAPIResponse } from './rovoDevApiClientInterfaces';

export interface RovoDevMessageWithCtaLink {
    message: string;
    ctaLink?: {
        link: string;
        text: string;
    };
}

export interface RovoDevParsingError {
    event_kind: '_parsing_error';
    error: Error;
}

export interface RovoDevUserPromptResponse {
    event_kind: 'user-prompt';
    content: string;
    timestamp: string;
}

export interface RovoDevTextResponse {
    event_kind: 'text';
    index: number;
    content: string;
    isSummary?: boolean;
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
    permission_required: boolean;
    permissions: Record<string, RovoDevToolPemissionScenario>;
}

export interface RovoDevCloseResponse {
    event_kind: 'close';
}

export interface RovoDevReplayEndResponse {
    event_kind: 'replay_end';
}

export interface RovoDevStatusResponse {
    event_kind: 'status';
    data: RovoDevStatusAPIResponse;
}

// special response for events we want to ignore
export interface RovoDevIgnoredResponse {
    event_kind: '_ignored';
}

export interface RovoDevUsageResponse {
    event_kind: 'usage';
    data: {
        content: {
            isBetaSite: boolean;
            title: string;
            status: string;
            credit_type: string;
            credit_used: number;
            credit_remaining: number;
            /** Non-beta site only */
            credit_total: number;
            retry_after_seconds: number;
            /** Beta site only */
            upgrade_message?: string;
            /** Beta site only */
            model_usage_data?: { title: string; data: Record<string, number> };
            view_usage_message?: RovoDevMessageWithCtaLink;
            exceeded_message?: RovoDevMessageWithCtaLink;
        };
    };
}

export interface RovoDevPromptsResponse {
    event_kind: 'prompts';
    data: {
        prompts: {
            name: string;
            description: string;
            content_file: string;
        }[];
    };
}

export interface RovoDevModelsResponse {
    event_kind: 'models';
    data: {
        model_name?: string;
        model_id?: string;
        message?: string;
        models?: {
            name: string;
            model_id: string;
            description: string;
            credit_multiplier: string;
        }[];
    };
}

export type RovoDevResponse =
    | RovoDevParsingError
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
    | RovoDevStatusResponse
    | RovoDevUsageResponse
    | RovoDevPromptsResponse
    | RovoDevModelsResponse
    | RovoDevCloseResponse
    | RovoDevReplayEndResponse
    | RovoDevIgnoredResponse;

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
    | 'mcp_invoke_tool'
    | 'mcp__atlassian__invoke_tool'
    | 'mcp__atlassian__get_tool_schema'
    | 'mcp__scout__invoke_tool';

export type RovoDevToolPemissionScenario = 'ASK' | 'ALLOWED' | 'DENIED';
