export type ToolReturnMessage =
    | ToolReturnFileMessage
    | ToolReturnBashMessage
    | ToolReturnTechnicalPlanMessage
    | ToolReturnGrepFileContentMessage
    | ToolReturnGenericMessage;
export type ChatMessage =
    | DefaultMessage
    | ErrorMessage
    | ToolCallMessage
    | ToolReturnGenericMessage
    | ToolReturnGroupedMessage;

export interface DefaultMessage {
    text: string;
    source: 'User' | 'RovoDev' | 'PullRequest';
}

export interface ErrorMessage {
    text: string;
    source: 'RovoDevError';
    isRetriable: boolean;
    uid: string;
}

export interface ToolCallMessage {
    tool_name: string;
    source: 'ToolCall';
    args: string;
    tool_call_id: string; // Optional ID for tracking tool calls
}

export interface ToolReturnFileMessage {
    tool_name: 'expand_code_chunks' | 'find_and_replace_code' | 'open_files' | 'create_file' | 'delete_file';
    source: 'ToolReturn';
    content: string;
    tool_call_id: string;
    args?: string;
}

export interface ToolReturnBashMessage {
    tool_name: 'bash';
    source: 'ToolReturn';
    tool_call_id: string;
    args?: string;
}

export interface ToolReturnGrepFileContentMessage {
    tool_name: 'grep_file_content';
    source: 'ToolReturn';
    content: string; // The content of the file or grep result
    tool_call_id: string;
    parsedContent?: string; // Optional parsed content if applicable
    args?: string; // Optional arguments used in the grep command
}

export interface ToolReturnTechnicalPlanMessage {
    tool_name: 'create_technical_plan';
    source: 'ToolReturn';
    parsedContent?: object | undefined;
    tool_call_id: string;
    args?: string;
}

export interface ToolReturnGenericMessage {
    tool_name: string;
    source: 'ToolReturn' | 'ModifiedFile';
    content: string;
    parsedContent?: object | undefined;
    tool_call_id: string;
    args?: string;
}

export interface ToolReturnGroupedMessage {
    source: 'ReturnGroup';
    tool_returns: ToolReturnGenericMessage[];
}

export interface CodeSnippetToChange {
    startLine: number;
    endLine: number;
    code: string;
}

export interface TechnicalPlanFileToChange {
    filePath: string;
    descriptionOfChange: string;
    clarifyingQuestionIfAny: string | null;
    codeSnippetsToChange: CodeSnippetToChange[];
}

export interface TechnicalPlanLogicalChange {
    summary: string;
    filesToChange: TechnicalPlanFileToChange[];
}

export interface TechnicalPlan {
    logicalChanges: TechnicalPlanLogicalChange[];
}

export interface ToolReturnParseResult {
    content: string;
    diff?: string;
    filePath?: string;
    title?: string;
    technicalPlan?: TechnicalPlan;
    type?: 'modify' | 'create' | 'delete' | 'open' | 'bash';
}

interface ToolReturnInfo {
    title: string;
    type: 'modify' | 'create' | 'delete' | 'open' | 'bash';
}

const modifyFileTitleMap: Record<string, ToolReturnInfo> = {
    expanded_code_chunks: { title: 'Expanded code', type: 'open' },
    replaced_code: { title: 'Replaced code', type: 'modify' },
    opened: { title: 'Opened file', type: 'open' },
    created: { title: 'Created file', type: 'create' },
    deleted: { title: 'Deleted file', type: 'delete' },
    updated: { title: 'Updated file', type: 'modify' },
};

/**
 * Parses the content of a ToolReturnMessage and extracts relevant information.
 * The function handles different tool names and formats the output accordingly.
 *
 * @param rawMsg - The ToolReturnMessage to parse.
 */
export function parseToolReturnMessage(rawMsg: ToolReturnGenericMessage): ToolReturnParseResult[] {
    const resp: ToolReturnParseResult[] = [];

    const msg = rawMsg as ToolReturnMessage;

    switch (msg.tool_name) {
        case 'expand_code_chunks':
        case 'find_and_replace_code':
        case 'open_files':
        case 'create_file':
        case 'delete_file':
            const contentArray = msg.content.split('\n\n');

            for (const line of contentArray) {
                const matches = line.match(
                    /^Successfully\s+(expanded code chunks|replaced code|opened|created|deleted|updated)(?:\s+in)?\s+(.+)?$/,
                );

                if (matches && matches.length >= 3) {
                    let filePath = matches[2].trim();
                    // Remove trailing colon if present
                    if (filePath.endsWith(':') || filePath.endsWith('.')) {
                        filePath = filePath.slice(0, -1);
                    }

                    const toolReturnType = matches[1].trim();
                    const title = filePath ? filePath.match(/([^/\\]+)$/)?.[0] : undefined;

                    const content = modifyFileTitleMap[toolReturnType.replace(/ /g, '_')];

                    resp.push({
                        content: content ? content.title : matches[1].trim().toUpperCase(),
                        filePath: filePath,
                        title: title,
                        type: content ? content.type : undefined,
                    });
                }
            }
            break;

        case 'bash':
            const args = msg.args && JSON.parse(msg.args);
            if (args?.command) {
                resp.push({
                    title: args.command,
                    content: 'Executed command',
                    type: 'bash',
                });
            }
            break;

        case 'grep_file_content':
            const grepArgs = msg.args && JSON.parse(msg.args);
            if (grepArgs?.pattern) {
                const pattern = grepArgs.pattern;
                resp.push({
                    content: `Searched file content${pattern ? ` for pattern:` : ''}`,
                    title: `"${pattern}"`,
                    type: 'open',
                });
            }
            break;

        case 'create_technical_plan':
            if (msg.parsedContent) {
                resp.push({
                    content: '',
                    technicalPlan: msg.parsedContent as TechnicalPlan,
                });
            }
            break;

        default:
            // For other tool names, we just return the raw content
            resp.push({
                content: rawMsg.tool_name,
            });
            break;
    }

    return resp;
}

export const isCodeChangeTool = (toolName: string): boolean => {
    return ['find_and_replace_code', 'create_file', 'delete_file'].includes(toolName);
};

export const CODE_PLAN_EXECUTE_PROMPT = 'Execute the code plan that you have created';

// this function scrolls the element to the end, but it prevents scrolling too frequently to avoid the UI to get overloaded.
// the delay is implemented globally, not per element. which is fine for now, because we only scroll 1 element.
export const scrollToEnd = (() => {
    const SCROLL_DELAY = 250;
    let lastScroll: number = 0;
    let scrollTimeout: NodeJS.Timeout | number = 0;

    function doScrollNow(element: HTMLDivElement) {
        element.scroll({ top: element.scrollHeight, behavior: 'smooth' });
        return performance.now();
    }

    return (element: HTMLDivElement) => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = 0;
        }

        const delay = lastScroll - performance.now() + SCROLL_DELAY;

        if (delay < 0) {
            lastScroll = doScrollNow(element);
            // schedule one extra scroll to adjust for react rendering asynchronousness
            scrollTimeout = setTimeout(() => (lastScroll = doScrollNow(element)), SCROLL_DELAY);
        } else {
            scrollTimeout = setTimeout(() => (lastScroll = doScrollNow(element)), delay);
        }
    };
})();
