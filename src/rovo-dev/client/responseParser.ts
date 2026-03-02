// interfaces for the raw responses from the rovo dev agent

import {
    RovoDevClearResponse,
    RovoDevExceptionResponse,
    RovoDevModelsResponse,
    RovoDevOnCallToolStartResponse,
    RovoDevParsingError,
    RovoDevPromptsResponse,
    RovoDevPruneResponse,
    RovoDevResponse,
    RovoDevRetryPromptResponse,
    RovoDevStatusResponse,
    RovoDevTextResponse,
    RovoDevToolCallResponse,
    RovoDevToolName,
    RovoDevToolPemissionScenario,
    RovoDevToolReturnResponse,
    RovoDevUsageResponse,
    RovoDevUserPromptResponse,
    RovoDevWarningResponse,
} from './responseParserInterfaces';

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.UserPromptPart
interface RovoDevUserPromptResponseRaw {
    content?: string;
    content_delta?: string;
    timestamp: string;
}

interface RovoDevUserPromptChunk {
    event_kind: 'user-prompt' | 'user_prompt';
    data: RovoDevUserPromptResponseRaw;
}

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.TextPart
interface RovoDevTextResponseRaw {
    index: number;
    content?: string;
    content_delta?: string;
}

interface RovoDevTextChunk {
    event_kind: 'text';
    data: RovoDevTextResponseRaw;
}

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.ToolCallPart
interface RovoDevToolCallResponseRaw {
    tool_name: RovoDevToolName;
    args?: string;
    args_delta?: string;
    /** sets when the tool is being exposed by an MCP server */
    mcp_server?: string;
    tool_call_id: string;
}

interface RovoDevToolCallChunk {
    event_kind: 'tool-call' | 'tool_call';
    data: RovoDevToolCallResponseRaw;
}

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.ToolReturnPart
interface RovoDevToolReturnResponseRaw {
    tool_name: RovoDevToolName;
    content: string | object;
    tool_call_id: string;
    timestamp: string;
}

interface RovoDevToolReturnChunk {
    event_kind: 'tool-return' | 'tool_return';
    data: RovoDevToolReturnResponseRaw;
}

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.RetryPromptPart
interface RovoDevRetryPromptResponseRaw {
    content?: string;
    content_delta?: string;
    tool_name: RovoDevToolName;
    tool_call_id: string;
    timestamp: string;
}

interface RovoDevRetryPromptChunk {
    event_kind: 'retry-prompt' | 'retry_prompt';
    data: RovoDevRetryPromptResponseRaw;
}

// https://bitbucket.org/atlassian/acra-python/src/9ce5910e61d00e91f70c7978e067bde2690a1c97/packages/cli-rovodev/docs/serve/streaming-events.md?at=RDA-307-emit-warning-events-related-to-rate-limits-and-other-api-request-problems#:~:text=Server%20Error%20Warnings
interface RovoDevExceptionResponseRaw {
    message: string;
    title?: string;
    type: string;
}

interface RovoDevExceptionChunk {
    event_kind: 'exception';
    data: RovoDevExceptionResponseRaw;
}

// https://bitbucket.org/atlassian/acra-python/src/9ce5910e61d00e91f70c7978e067bde2690a1c97/packages/cli-rovodev/docs/serve/streaming-events.md?at=RDA-307-emit-warning-events-related-to-rate-limits-and-other-api-request-problems#:~:text=Server%20Error%20Warnings
interface RovoDevWarningResponseRaw {
    message: string;
    title?: string;
}

interface RovoDevWarningChunk {
    event_kind: 'warning';
    data: RovoDevWarningResponseRaw;
}

// https://bitbucket.org/atlassian/acra-python/src/9ce5910e61d00e91f70c7978e067bde2690a1c97/packages/cli-rovodev/docs/serve/streaming-events.md?at=RDA-307-emit-warning-events-related-to-rate-limits-and-other-api-request-problems#:~:text=Server%20Error%20Warnings
interface RovoDevClearResponseRaw {
    message: string;
}

interface RovoDevClearChunk {
    event_kind: 'clear';
    data: RovoDevClearResponseRaw;
}

// https://bitbucket.org/atlassian/acra-python/src/9ce5910e61d00e91f70c7978e067bde2690a1c97/packages/cli-rovodev/docs/serve/streaming-events.md?at=RDA-307-emit-warning-events-related-to-rate-limits-and-other-api-request-problems#:~:text=Server%20Error%20Warnings
interface RovoDevPruneResponseRaw {
    message: string;
}

interface RovoDevPruneChunk {
    event_kind: 'prune';
    data: RovoDevPruneResponseRaw;
}

// https://bitbucket.org/atlassian/acra-python/src/9ce5910e61d00e91f70c7978e067bde2690a1c97/packages/cli-rovodev/docs/serve/streaming-events.md?at=RDA-307-emit-warning-events-related-to-rate-limits-and-other-api-request-problems#:~:text=Server%20Error%20Warnings
interface RovoDevOnCallToolStartResponseRaw {
    parts: RovoDevToolCallResponseRaw[];
    permission_required?: boolean;
    permissions?: Record<string, RovoDevToolPemissionScenario>;
}

interface RovoDevOnCallToolStartChunk {
    event_kind: 'on_call_tools_start';
    data: RovoDevOnCallToolStartResponseRaw;
}

// doc missing
type RovoDevStatusChunk = RovoDevStatusResponse;

// doc missing
type RovoDevUsageChunk = RovoDevUsageResponse;

// doc missing
type RovoDevPromptsChunk = RovoDevPromptsResponse;

// https://bitbucket.org/atlassian/acra-python/src/9ce5910e61d00e91f70c7978e067bde2690a1c97/packages/cli-rovodev/docs/serve/streaming-events.md?at=RDA-307-emit-warning-events-related-to-rate-limits-and-other-api-request-problems#:~:text=Server%20Error%20Warnings
interface RovoDevCloseChunk {
    event_kind: 'close';
}

// doc missing
interface RovoDevReplayEndChunk {
    event_kind: 'replay_end';
}

interface RovoDevRequestUsageChunk {
    event_kind: 'request-usage';
}

type RovoDevSingleResponseRaw =
    | RovoDevUserPromptResponseRaw
    | RovoDevTextResponseRaw
    | RovoDevToolCallResponseRaw
    | RovoDevToolReturnResponseRaw
    | RovoDevRetryPromptResponseRaw
    | RovoDevWarningResponseRaw
    | RovoDevExceptionResponseRaw
    | RovoDevClearResponseRaw
    | RovoDevPruneResponseRaw
    | RovoDevOnCallToolStartResponseRaw;

type RovoDevSingleChunk =
    | RovoDevUserPromptChunk
    | RovoDevTextChunk
    | RovoDevToolCallChunk
    | RovoDevToolReturnChunk
    | RovoDevRetryPromptChunk
    | RovoDevExceptionChunk
    | RovoDevWarningChunk
    | RovoDevClearChunk
    | RovoDevPruneChunk
    | RovoDevOnCallToolStartChunk
    | RovoDevStatusChunk
    | RovoDevUsageChunk
    | RovoDevPromptsChunk
    | RovoDevModelsResponse
    | RovoDevCloseChunk
    | RovoDevReplayEndChunk
    | RovoDevRequestUsageChunk;

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.PartStartEvent
interface RovoDevPartStartResponseRaw {
    part: RovoDevSingleResponseRaw & { part_kind: RovoDevSingleChunk['event_kind'] };
}

interface RovoDevPartStartChunk {
    event_kind: 'part_start';
    data: RovoDevPartStartResponseRaw;
}

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.PartDeltaEvent
interface RovoDevPartDeltaResponseRaw {
    delta: RovoDevSingleResponseRaw & { part_delta_kind: RovoDevSingleChunk['event_kind'] };
}

interface RovoDevPartDeltaChunk {
    event_kind: 'part_delta';
    data: RovoDevPartDeltaResponseRaw;
}

// parsing functions for specific response types

function parseResponseUserPrompt(
    data: RovoDevUserPromptResponseRaw,
    buffer?: RovoDevUserPromptResponse,
): RovoDevUserPromptResponse {
    if (buffer) {
        buffer.content += data.content_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'user-prompt',
            content: data.content || '',
            timestamp: data.timestamp,
        };
    }
}

function parseResponseText(data: RovoDevTextResponseRaw, buffer?: RovoDevTextResponse): RovoDevTextResponse {
    if (buffer) {
        buffer.content += data.content_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'text',
            content: data.content || data.content_delta || '',
            index: data.index,
        };
    }
}

function parseResponseToolCall(
    data: RovoDevToolCallResponseRaw,
    buffer?: RovoDevToolCallResponse,
): RovoDevToolCallResponse {
    if (buffer) {
        buffer.args += data.args_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'tool-call',
            tool_name: data.tool_name,
            args: data.args || '',
            mcp_server: data.mcp_server,
            tool_call_id: data.tool_call_id,
        };
    }
}

function parseResponseToolReturn(
    data: RovoDevToolReturnResponseRaw,
    toolCalls: Record<string, RovoDevToolCallResponse>,
): RovoDevToolReturnResponse {
    return {
        event_kind: 'tool-return',
        tool_name: data.tool_name || '',
        content: typeof data.content === 'string' ? data.content : undefined,
        parsedContent: typeof data.content === 'object' ? data.content : undefined,
        tool_call_id: data.tool_call_id,
        timestamp: data.timestamp,
        toolCallMessage: toolCalls[data.tool_call_id],
    };
}

function parseResponseRetryPrompt(
    data: RovoDevRetryPromptResponseRaw,
    buffer?: RovoDevRetryPromptResponse,
): RovoDevRetryPromptResponse {
    if (buffer) {
        buffer.content += data.content_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'retry-prompt',
            tool_name: data.tool_name,
            content: data.content || '',
            tool_call_id: data.tool_call_id,
            timestamp: data.timestamp,
        };
    }
}

function parseResponseException(data: RovoDevExceptionResponseRaw): RovoDevExceptionResponse {
    return {
        event_kind: 'exception',
        message: data.message,
        title: data.title,
        type: data.type,
    };
}

function parseResponseWarning(data: RovoDevWarningResponseRaw): RovoDevWarningResponse {
    return {
        event_kind: 'warning',
        message: data.message,
        title: data.title,
    };
}

function parseResponseClear(data: RovoDevWarningResponseRaw): RovoDevClearResponse {
    return {
        event_kind: 'clear',
        message: data.message,
    };
}

function parseResponsePrune(data: RovoDevWarningResponseRaw): RovoDevPruneResponse {
    return {
        event_kind: 'prune',
        message: data.message,
    };
}

function parseOnCallToolStart(data: RovoDevOnCallToolStartResponseRaw): RovoDevOnCallToolStartResponse {
    return {
        event_kind: 'on_call_tools_start',
        tools: data.parts.map((part) => parseResponseToolCall(part)),
        permission_required: !!data.permission_required,
        permissions: data.permissions ?? {},
    };
}

// the parser

function generateError(error: Error): RovoDevParsingError {
    return {
        event_kind: '_parsing_error',
        error,
    };
}

export interface RovoDevResponseParserOptions {
    mergeAllChunks?: boolean;
}

export class RovoDevResponseParser {
    private buffer = '';
    private previousChunk: RovoDevResponse | undefined;

    // this map stores the tool-call messages, so they can be attached to the tool-return messages
    private readonly toolCalls: Record<string, RovoDevToolCallResponse> = {};

    // options passed in constructor
    private readonly mergeAllChunks: boolean;

    constructor(options?: RovoDevResponseParserOptions) {
        this.mergeAllChunks = !!options?.mergeAllChunks;
    }

    *parse(data: string) {
        this.buffer += data;
        const responseChunks = this.buffer.split(/\r?\n\r?\n/g);

        // the last element can be a substring of a full chunk, so we keep it in buffer
        // and we prepend it to the next blob of data.
        // if this is supposed to be the last blob of data, the last chunk will be an empty string.
        this.buffer = responseChunks.pop() || '';

        for (const chunkRaw of responseChunks) {
            // it seems sometimes RovoDev sends a ping back - we just ignore it
            if (chunkRaw.startsWith(': ping - ')) {
                continue;
            }

            const match = chunkRaw.match(/^event: ([^\r\n]+)\r?\ndata: (.*)$/);
            if (!match) {
                yield generateError(new Error(`Rovo Dev parser error: unable to parse chunk: "${chunkRaw}"`));
                continue;
            }

            const chunk: RovoDevSingleChunk | RovoDevPartStartChunk | RovoDevPartDeltaChunk = {
                event_kind: match[1].trim() as any,
                data: match[2] ? JSON.parse(match[2]) : '',
            };

            let tmpChunkToFlush: RovoDevResponse | undefined;

            if (chunk.event_kind === 'part_start') {
                // flsuh previous type, this is the beginning of a new multi-part response
                tmpChunkToFlush = this.flushPreviousChunk();
                if (tmpChunkToFlush) {
                    yield tmpChunkToFlush;
                }

                const data_inner = chunk.data.part;
                const event_kind_inner = data_inner.part_kind;
                const partStartChunk = {
                    event_kind: event_kind_inner,
                    data: data_inner,
                } as RovoDevSingleChunk;

                this.previousChunk = this.parseGenericReponse(partStartChunk);

                // send out immediately:
                // - errors
                // - text messages unless we'd like to reconstruct them fully
                if (
                    this.previousChunk.event_kind === '_parsing_error' ||
                    (!this.mergeAllChunks && event_kind_inner === 'text')
                ) {
                    tmpChunkToFlush = this.flushPreviousChunk();
                    if (tmpChunkToFlush) {
                        yield tmpChunkToFlush;
                    }
                }
            } else if (chunk.event_kind === 'part_delta') {
                // continuation of a multi-part response
                const data_inner = chunk.data.delta;
                const event_kind_inner = data_inner.part_delta_kind;
                const partDeltaChunk = {
                    event_kind: event_kind_inner,
                    data: data_inner,
                } as RovoDevSingleChunk;

                this.previousChunk = this.parseGenericReponse(partDeltaChunk, this.previousChunk);

                // send out immediately:
                // - errors
                // - text messages unless we'd like to reconstruct them fully
                if (
                    this.previousChunk.event_kind === '_parsing_error' ||
                    (!this.mergeAllChunks && event_kind_inner === 'text')
                ) {
                    tmpChunkToFlush = this.flushPreviousChunk();
                    if (tmpChunkToFlush) {
                        yield tmpChunkToFlush;
                    }
                }
            } else {
                // flsuh previous type, this new event is not part of a multi-part response
                tmpChunkToFlush = this.flushPreviousChunk();
                if (tmpChunkToFlush) {
                    yield tmpChunkToFlush;
                }

                this.previousChunk = this.parseGenericReponse(chunk);
                tmpChunkToFlush = this.flushPreviousChunk();
                if (tmpChunkToFlush) {
                    yield tmpChunkToFlush;
                }
            }
        }
    }

    *flush() {
        // if there is still data in the buffer, something went wrong.
        if (this.buffer) {
            yield generateError(new Error('Rovo Dev parser error: flushed with non-empty buffer'));
        }

        const chunk = this.flushPreviousChunk();
        if (chunk) {
            yield chunk;
        }
    }

    private flushPreviousChunk() {
        const chunk = this.previousChunk;
        this.previousChunk = undefined;

        // store tool calls so they can be attached in tool return messages
        if (chunk?.event_kind === 'tool-call') {
            this.toolCalls[chunk.tool_call_id] = chunk;
        } else if (chunk?.event_kind === 'tool-return') {
            delete this.toolCalls[chunk.tool_call_id];
        }

        return chunk;
    }

    private parseGenericReponse(chunk: RovoDevSingleChunk, buffer?: RovoDevResponse): RovoDevResponse {
        switch (chunk.event_kind) {
            case 'user-prompt':
            case 'user_prompt':
                return parseResponseUserPrompt(chunk.data, buffer as RovoDevUserPromptResponse);

            case 'text':
                return parseResponseText(chunk.data, buffer as RovoDevTextResponse);

            case 'tool-call':
            case 'tool_call':
                return parseResponseToolCall(chunk.data, buffer as RovoDevToolCallResponse);

            // it doesn't seem like tool-return can be split in parts
            case 'tool-return':
            case 'tool_return':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : parseResponseToolReturn(chunk.data, this.toolCalls);

            case 'retry-prompt':
            case 'retry_prompt':
                return parseResponseRetryPrompt(chunk.data, buffer as RovoDevRetryPromptResponse);

            case 'exception':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : parseResponseException(chunk.data);

            case 'warning':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : parseResponseWarning(chunk.data);

            case 'clear':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : parseResponseClear(chunk.data);

            case 'prune':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : parseResponsePrune(chunk.data);

            case 'on_call_tools_start':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : parseOnCallToolStart(chunk.data);

            case 'status':
            case 'usage':
            case 'prompts':
            case 'models':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : chunk;

            // events we ignore
            case 'request-usage':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : { event_kind: '_ignored' };

            // events with no payload
            case 'close':
            case 'replay_end':
                return buffer
                    ? generateError(Error(`Rovo Dev parser error: ${chunk.event_kind} seem to be split`))
                    : { event_kind: chunk.event_kind };

            default:
                // @ts-expect-error ts(2339) - chunk here should be 'never'
                return generateError(new Error(`Rovo Dev parser error: unknown event kind: ${chunk.event_kind}`));
        }
    }
}
