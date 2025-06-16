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
    args?: string; // Optional arguments from the tool call
}

export interface ToolReturnParseResult {
    content: string;
    diff?: string;
    filePath?: string;
    title?: string;
}
/**
 * Parses the content of a ToolReturnMessage and extracts relevant information.
 * The function handles different tool names and formats the output accordingly.
 *
 * @param msg - The ToolReturnMessage to parse.
 * @returns An array of objects containing content, diff, and filePath.
 */
export function parseToolReturnMessage(msg: ToolReturnMessage): ToolReturnParseResult[] {
    const rawContent = msg.content;
    const resp: ToolReturnParseResult[] = [];

    switch (msg.tool_name) {
        case 'expand_code_chunks':
        case 'find_and_replace_code':
        case 'open_files':
        case 'create_file':
        case 'delete_file':
            const contentArray = rawContent.split('\n\n');

            for (const line of contentArray) {
                const matches = line.match(
                    /^Successfully\s+(expanded code chunks|replaced code|opened|created|deleted)(?:\s+in)?\s+(.+)?$/,
                );

                if (matches && matches.length >= 3) {
                    let filePath = matches[2].trim();
                    // Remove trailing colon if present
                    if (filePath.endsWith(':')) {
                        filePath = filePath.slice(0, -1);
                    }
                    const title = filePath ? filePath.match(/([^/\\]+)$/)?.[0] : undefined;
                    resp.push({
                        content: matches[1].trim().toUpperCase(),
                        filePath: filePath,
                        title: title,
                    });
                }
            }

            if (resp.length === 0) {
                // If no matches found, return the raw content
                resp.push({
                    content: rawContent,
                });
            }
            break;
        case 'bash':
            const args = msg.args && JSON.parse(msg.args);
            let command = '';
            if (!args || !args.command) {
                console.warn('Bash command not found in args:', msg.args);
            } else {
                command = args.command;
            }
            resp.push({
                title: command,
                content: 'EXECUTED',
            });
            break;
        default:
            // For other tool names, we just return the raw content
            resp.push({
                content: rawContent,
            });
            break;
    }

    return resp;
}

export const isCodeChangeTool = (toolName: string): boolean => {
    return ['find_and_replace_code', 'create_file', 'delete_file'].includes(toolName);
};

export const toolNameIconMap: Record<string, string> = {
    expand_code_chunks: 'codicon codicon-search',
    find_and_replace_code: 'codicon codicon-code',
    create_file: 'codicon codicon-new-file',
    bash: 'codicon codicon-terminal',
    delete_file: 'codicon codicon-trash',
    open_files: 'codicon codicon-go-to-file',
};
