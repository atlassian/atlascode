export type ChatMessage = DefaultMessage | ToolCallMessage | ToolReturnMessage;

export interface DefaultMessage {
    text: string;
    author: 'User' | 'RovoDev' | 'ToolCall' | 'ToolReturn';
    timestamp: number;
}

export interface ToolCallMessage {
    tool_name: string;
    author: 'ToolCall';
    args: string;
    tool_call_id: string; // Optional ID for tracking tool calls
}

export interface ToolReturnMessage {
    tool_name: string;
    author: 'ToolReturn';
    content: string;
    tool_call_id: string; // Optional ID for tracking tool returns
}

/**
 * Parses the content of a ToolReturnMessage and extracts relevant information.
 * The function handles different tool names and formats the output accordingly.
 *
 * @param msg - The ToolReturnMessage to parse.
 * @returns An array of objects containing content, diff, and filePath.
 */
export function parseToolReturnMessage(
    msg: ToolReturnMessage,
): { content: string; diff?: string; filePath?: string }[] {
    const rawContent = msg.content;
    const resp: { content: string; diff?: string; filePath?: string }[] = [];

    switch (msg.tool_name) {
        case 'expand_code_chunks':
        case 'find_and_replace_code':
        case 'open_files':
            const contentArray = rawContent.split('\n\n');

            for (const line of contentArray) {
                const matches = line.match(/Successfully (opened|expanded code chunks in|replaced code in) (.*)$/);
                if (matches) {
                    resp.push({
                        content: matches[0].trim(),
                        diff: matches[1].trim(),
                        filePath: matches[2].trim(),
                    });
                }
            }
            break;
        default:
            const matches = rawContent.match(/^Successfully (.+?) (.+):?$/);
            if (matches) {
                resp.push({
                    content: matches[0].trim(),
                    filePath: matches[2].trim(),
                });
            }
            break;
    }

    return resp;
}
