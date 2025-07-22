import React from 'react';

import { ToolCallMessage } from '../utils';

export const ToolCallItem: React.FC<{ toolMessage: string }> = ({ toolMessage }) => {
    return (
        <div className="tool-call-item-base tool-call-item">
            <i className="codicon codicon-loading codicon-modifier-spin" />
            {toolMessage}
        </div>
    );
};

export function parseToolCallMessage(msg: ToolCallMessage): string {
    switch (msg.tool_name) {
        case '':
        case null:
        case undefined:
            return '';
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
            return msg.tool_name;
    }
}
