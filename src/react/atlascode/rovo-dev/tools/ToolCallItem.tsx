import React from 'react';

import { ToolCallMessage } from '../utils';

export const ToolCallItem: React.FC<{ msg: ToolCallMessage }> = ({ msg }) => {
    if (!msg.tool_name) {
        return <div key="invalid-tool-call">Error: Invalid tool call message</div>;
    }

    const toolMessage = parseToolCallMessage(msg.tool_name);

    return (
        <div className="tool-call-item">
            <i className="codicon codicon-loading codicon-modifier-spin" />
            {toolMessage}
        </div>
    );
};

function parseToolCallMessage(msg: string): string {
    switch (msg) {
        case 'expand_code_chunks':
            return 'Expanding code';
        case 'find_and_replace_code':
            return 'Finding and replacing code';
        case 'open_files':
            return 'Opening files';
        case 'create_file':
            return 'Creating file';
        case 'delete_file':
            return 'Deleting file';
        case 'bash':
            return `Executing bash command`;
        case 'create_technical_plan':
            return 'Creating technical plan';
        case 'grep_file_content':
            return `Grep file content with pattern`;
        case 'grep_file_path':
            return 'Grep file path';
        default:
            return msg;
    }
}
