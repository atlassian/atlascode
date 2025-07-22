import { render } from '@testing-library/react';
import React from 'react';

import { ToolCallMessage } from '../utils';
import { parseToolCallMessage, ToolCallItem } from './ToolCallItem';

describe('ToolCallItem', () => {
    it('renders error message for invalid tool call message', () => {
        const invalidMsg = {} as ToolCallMessage;
        const toolMessage = parseToolCallMessage(invalidMsg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Error: Invalid tool call message')).toBeTruthy();
    });

    it('renders the correct message for expand_code_chunks tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'expand_code_chunks',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Expanding code')).toBeTruthy();
    });

    it('renders the correct message for find_and_replace_code tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'find_and_replace_code',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Finding and replacing code')).toBeTruthy();
    });

    it('renders the correct message for open_files tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'open_files',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Opening files')).toBeTruthy();
    });

    it('renders the correct message for create_file tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'create_file',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Creating file')).toBeTruthy();
    });

    it('renders the correct message for delete_file tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'delete_file',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Deleting file')).toBeTruthy();
    });

    it('renders the correct message for bash tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'bash',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Executing bash command')).toBeTruthy();
    });

    it('renders the correct message for create_technical_plan tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'create_technical_plan',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Creating technical plan')).toBeTruthy();
    });

    it('renders the correct message for grep_file_content tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'grep_file_content',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Grep file content with pattern')).toBeTruthy();
    });

    it('renders the correct message for grep_file_path tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'grep_file_path',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('Grep file path')).toBeTruthy();
    });

    it('renders the tool name for unknown tools', () => {
        const msg: ToolCallMessage = {
            tool_name: 'unknown_tool',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} />);

        expect(getByText('unknown_tool')).toBeTruthy();
    });

    it('renders with the loading icon', () => {
        const msg: ToolCallMessage = {
            tool_name: 'bash',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        render(<ToolCallItem toolMessage={toolMessage} />);

        const loadingIcon = document.querySelector('.codicon.codicon-loading.codicon-modifier-spin');
        expect(loadingIcon).toBeTruthy();
    });
});
