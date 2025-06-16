import { EventEmitter } from 'vscode';

// interfaces for the raw responses from the rovo dev agent

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
    tool_name?: string;
    tool_name_delta?: string;
    args?: string;
    args_delta?: string;
    tool_call_id: string;
}

interface RovoDevToolCallChunk {
    event_kind: 'tool-call' | 'tool_call';
    data: RovoDevToolCallResponseRaw;
}

// https://ai.pydantic.dev/api/messages/#pydantic_ai.messages.ToolReturnPart
interface RovoDevToolReturnResponseRaw {
    tool_name?: string;
    tool_name_delta?: string;
    content?: string;
    content_delta?: string;
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
    tool_name?: string;
    tool_name_delta?: string;
    tool_call_id: string;
    timestamp: string;
}

interface RovoDevRetryPromptChunk {
    event_kind: 'retry-prompt' | 'retry_prompt';
    data: RovoDevRetryPromptResponseRaw;
}

type RovoDevSingleResponseRaw =
    | RovoDevUserPromptResponseRaw
    | RovoDevTextResponseRaw
    | RovoDevToolCallResponseRaw
    | RovoDevToolReturnResponseRaw
    | RovoDevRetryPromptResponseRaw;

type RovoDevSingleChunk =
    | RovoDevUserPromptChunk
    | RovoDevTextChunk
    | RovoDevToolCallChunk
    | RovoDevToolReturnChunk
    | RovoDevRetryPromptChunk;

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
    tool_name: string;
    args: string;
    tool_call_id: string;
}

export interface RovoDevToolReturnResponse {
    event_kind: 'tool-return';
    tool_name: string;
    content: string;
    tool_call_id: string;
    timestamp: string;
}

export interface RovoDevRetryPromptResponse {
    event_kind: 'retry-prompt';
    content: string;
    tool_name: string;
    tool_call_id: string;
    timestamp: string;
}

export type RovoDevResponse =
    | RovoDevUserPromptResponse
    | RovoDevTextResponse
    | RovoDevToolCallResponse
    | RovoDevToolReturnResponse
    | RovoDevRetryPromptResponse;

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

function parseResponseText(data: RovoDevTextResponseRaw): RovoDevTextResponse {
    return {
        event_kind: 'text',
        content: data.content || data.content_delta || '',
        index: data.index,
    };
}

function parseResponseToolCall(
    data: RovoDevToolCallResponseRaw,
    buffer?: RovoDevToolCallResponse,
): RovoDevToolCallResponse {
    if (buffer) {
        buffer.tool_name += data.tool_name_delta || '';
        buffer.args += data.args_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'tool-call',
            tool_name: data.tool_name || '',
            args: data.args || '',
            tool_call_id: data.tool_call_id,
        };
    }
}

function parseResponseToolReturn(
    data: RovoDevToolReturnResponseRaw,
    buffer?: RovoDevToolReturnResponse,
): RovoDevToolReturnResponse {
    if (buffer) {
        buffer.tool_name += data.tool_name_delta || '';
        buffer.content += data.content_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'tool-return',
            tool_name: data.tool_name || '',
            content: data.content || '',
            tool_call_id: data.tool_call_id,
            timestamp: data.timestamp,
        };
    }
}

function parseResponseRetryPrompt(
    data: RovoDevRetryPromptResponseRaw,
    buffer?: RovoDevRetryPromptResponse,
): RovoDevRetryPromptResponse {
    if (buffer) {
        buffer.tool_name += data.tool_name_delta || '';
        buffer.content += data.content_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'retry-prompt',
            tool_name: data.tool_name || '',
            content: data.content || '',
            tool_call_id: data.tool_call_id,
            timestamp: data.timestamp,
        };
    }
}

// the parser

export class RovoDevResponseParser {
    private buffer = '';
    private previousChunk: RovoDevResponse | undefined;

    private _onNewMessage = new EventEmitter<RovoDevResponse>();
    readonly onNewMessage = this._onNewMessage.event;

    parse(data: string): number {
        let messagesSent = 0;

        this.buffer += data;
        const responseChunks = this.buffer.split(/\r?\n\r?\n/g);

        // the last element can be a substring of a full chunk, so we keep it in buffer
        // and we prepend it to the next blob of data.
        // if this is supposed to be the last blob of data, the last chunk will be an empty string.
        this.buffer = responseChunks.pop() || '';

        const responseLines: string[] = [];
        for (const chunk of responseChunks) {
            responseLines.push(...chunk.split(/\r?\n/).filter((x) => !!x));
        }

        for (const chunkRaw of responseChunks) {
            // it seems sometimes RovoDev sends a ping back - we just ignore it
            if (chunkRaw.startsWith(': ping - ')) {
                continue;
            }

            const match = chunkRaw.match(/^event: ([^\r\n]+)\r?\ndata: (.*)$/);
            if (!match) {
                throw new Error(`RovoDev parser error: unable to parse chunk: "${chunkRaw}"`);
            }

            const chunk: RovoDevSingleChunk | RovoDevPartStartChunk | RovoDevPartDeltaChunk = {
                event_kind: match[1].trim() as any,
                data: JSON.parse(match[2]),
            };

            if (chunk.event_kind === 'part_start') {
                // flsuh previous type, this is the beginning of a new multi-part response
                messagesSent += this.firePreviousChunk();

                const data_inner = chunk.data.part;
                const event_kind_inner = data_inner.part_kind;
                const partStartChunk = {
                    event_kind: event_kind_inner,
                    data: data_inner,
                } as RovoDevSingleChunk;

                this.previousChunk = parseGenericReponse(partStartChunk);

                if (event_kind_inner === 'text') {
                    // if the event is a text message, send them out immediately instead
                    // of waiting for it to be fully reconstructed
                    messagesSent += this.firePreviousChunk();
                }
            } else if (chunk.event_kind === 'part_delta') {
                // continuation of a multi-part response
                const data_inner = chunk.data.delta;
                const event_kind_inner = data_inner.part_delta_kind;
                const partDeltaChunk = {
                    event_kind: event_kind_inner,
                    data: data_inner,
                } as RovoDevSingleChunk;

                this.previousChunk = parseGenericReponse(partDeltaChunk, this.previousChunk);

                if (event_kind_inner === 'text') {
                    // if the event is a text message, send them out immediately instead
                    // of waiting for it to be fully reconstructed
                    messagesSent += this.firePreviousChunk();
                }
            } else {
                // flsuh previous type, this new event is not part of a multi-part response
                messagesSent += this.firePreviousChunk();

                this.previousChunk = parseGenericReponse(chunk);
                messagesSent += this.firePreviousChunk();
            }
        }

        return messagesSent;
    }

    flush(): number {
        // if there is still data in the buffer, something went wrong.
        if (this.buffer) {
            throw new Error('RovoDev parser error: flushed with non-empty buffer');
        }

        return this.firePreviousChunk();
    }

    private firePreviousChunk(): number {
        if (this.previousChunk) {
            this._onNewMessage.fire(this.previousChunk);
            this.previousChunk = undefined;
            return 1;
        }

        return 0;
    }
}

function parseGenericReponse(chunk: RovoDevSingleChunk, buffer?: RovoDevResponse): RovoDevResponse {
    switch (chunk.event_kind) {
        case 'user-prompt':
        case 'user_prompt':
            return parseResponseUserPrompt(chunk.data, buffer as RovoDevUserPromptResponse);

        // text is a special case, where we don't care about reconstructing the delta messages,
        // but we just want to send every single chunk as individual messages
        case 'text':
            return parseResponseText(chunk.data);

        case 'tool-call':
        case 'tool_call':
            return parseResponseToolCall(chunk.data, buffer as RovoDevToolCallResponse);

        case 'tool-return':
        case 'tool_return':
            return parseResponseToolReturn(chunk.data, buffer as RovoDevToolReturnResponse);

        case 'retry-prompt':
        case 'retry_prompt':
            return parseResponseRetryPrompt(chunk.data, buffer as RovoDevRetryPromptResponse);

        default:
            throw new Error(`RovoDev parser error: unknown event kind: ${(chunk as any).event_kind}`);
    }
}
