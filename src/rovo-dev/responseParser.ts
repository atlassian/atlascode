type SpecialEventKinds = 'part_start' | 'part_delta';
type EventKinds = 'text' | 'user-prompt' | 'tool-call' | 'tool-return' | 'retry-prompt';
// it looks like PydanticAI is bugged and it throws some of these instead of the right ones
type WeirdEventKinds = 'user_prompt' | 'tool_call' | 'tool_return' | 'retry_prompt';

// interfaces for the raw responses from the rovo dev agent

interface RovoDevUserPromptResponseRaw {
    content?: string;
    content_delta?: string;
    timestamp: string;
}

interface RovoDevTextResponseRaw {
    index: number;
    content?: string;
    content_delta?: string;
}

interface RovoDevToolCallResponseRaw {
    tool_name?: string;
    tool_name_delta?: string;
    args?: string;
    args_delta?: string;
    tool_call_id: string;
}

interface RovoDevToolReturnResponseRaw {
    tool_name?: string;
    tool_name_delta?: string;
    content?: string;
    content_delta?: string;
    tool_call_id: string;
    timestamp: string;
}

interface RovoDevRetryPromptResponseRaw {
    content?: string;
    content_delta?: string;
    tool_name?: string;
    tool_name_delta?: string;
    tool_call_id: string;
    timestamp: string;
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

interface RovoDevRetryPromptResponse {
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

function parseResponseText(data: RovoDevTextResponseRaw, buffer?: RovoDevTextResponse): RovoDevTextResponse {
    if (buffer) {
        buffer.content += data.content_delta || '';
        return buffer;
    } else {
        return {
            event_kind: 'text',
            content: data.content || '',
            index: data.index,
        };
    }
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

    parse(data: string): RovoDevResponse[] {
        const responses: RovoDevResponse[] = [];

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

        for (const chunk of responseChunks) {
            // it seems sometimes RovoDev sends a ping back - we just ignore it
            if (chunk.startsWith(': ping - ')) {
                continue;
            }

            const match = chunk.match(/^event: ([^\r\n]+)\r?\ndata: (.*)$/);
            if (!match) {
                throw new Error(`RovoDev parser error: unable to parse chunk: "${chunk}"`);
            }

            const event_kind = match[1].trim() as EventKinds | WeirdEventKinds | SpecialEventKinds;
            const data = JSON.parse(match[2]);

            if (event_kind === 'part_start') {
                // flsuh previous type, this is the beginning of a new multi-part response
                if (this.previousChunk) {
                    responses.push(this.previousChunk);
                }

                const event_kind_inner = data.part.part_kind;
                const data_inner = data.part;
                this.previousChunk = parseGenericReponse(event_kind_inner, data_inner);
            } else if (event_kind === 'part_delta') {
                // continuation of a multi-part response
                const event_kind_inner = data.delta.part_delta_kind;
                const data_inner = data.delta;
                this.previousChunk = parseGenericReponse(event_kind_inner, data_inner, this.previousChunk);
            } else {
                // flsuh previous type, this new event is not part of a multi-part response
                if (this.previousChunk) {
                    responses.push(this.previousChunk);
                    this.previousChunk = undefined;
                }

                const chunk = parseGenericReponse(event_kind, data);
                responses.push(chunk);
            }
        }

        return responses;
    }

    flush(): RovoDevResponse | undefined {
        // if there is still data in the buffer, something went wrong.
        if (this.buffer) {
            throw new Error('RovoDev parser error: flushed with non-empty buffer');
        }

        const tmp = this.previousChunk;
        this.previousChunk = undefined;
        return tmp;
    }
}

function parseGenericReponse(
    event_kind: EventKinds | WeirdEventKinds,
    data: any,
    buffer?: RovoDevResponse,
): RovoDevResponse {
    switch (event_kind) {
        case 'user-prompt':
        case 'user_prompt':
            return parseResponseUserPrompt(data, buffer as RovoDevUserPromptResponse);

        case 'text':
            return parseResponseText(data, buffer as RovoDevTextResponse);

        case 'tool-call':
        case 'tool_call':
            return parseResponseToolCall(data, buffer as RovoDevToolCallResponse);

        case 'tool-return':
        case 'tool_return':
            return parseResponseToolReturn(data, buffer as RovoDevToolReturnResponse);

        case 'retry-prompt':
        case 'retry_prompt':
            return parseResponseRetryPrompt(data, buffer as RovoDevRetryPromptResponse);

        default:
            throw new Error(`RovoDev parser error: unknown event kind: ${event_kind}`);
    }
}
