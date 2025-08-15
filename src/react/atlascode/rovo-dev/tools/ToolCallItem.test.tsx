import { Matcher, render, SelectorMatcherOptions } from '@testing-library/react';
import React from 'react';
import { RovoDevInitState } from 'src/rovo-dev/rovoDevTypes';

import { ToolCallMessage } from '../utils';
import { parseToolCallMessage, ToolCallItem } from './ToolCallItem';

function validateMessage(
    expected: string,
    actual: string,
    getByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement,
): void {
    expect(actual).toBe(expected);
    expect(getByText(expected)).toBeTruthy();
}

describe('ToolCallItem', () => {
    it('invalid tool call message is empty', () => {
        const invalidMsg = {} as ToolCallMessage;
        const toolMessage = parseToolCallMessage(invalidMsg);

        expect(toolMessage).toBe('');
    });

    it('renders the correct message for expand_code_chunks tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'expand_code_chunks',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Expanding code', toolMessage, getByText);
    });

    it('renders the correct message for find_and_replace_code tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'find_and_replace_code',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Finding and replacing code', toolMessage, getByText);
    });

    it('renders the correct message for open_files tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'open_files',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Opening files', toolMessage, getByText);
    });

    it('renders the correct message for create_file tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'create_file',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Creating file', toolMessage, getByText);
    });

    it('renders the correct message for delete_file tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'delete_file',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Deleting file', toolMessage, getByText);
    });

    it('renders the correct message for bash tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'bash',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Executing bash command', toolMessage, getByText);
    });

    it('renders the correct message for create_technical_plan tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'create_technical_plan',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Creating technical plan', toolMessage, getByText);
    });

    it('renders the correct message for grep_file_content tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'grep_file_content',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Grep file content with pattern', toolMessage, getByText);
    });

    it('renders the correct message for grep_file_path tool', () => {
        const msg: ToolCallMessage = {
            tool_name: 'grep_file_path',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('Grep file path', toolMessage, getByText);
    });

    it('renders the tool name for unknown tools', () => {
        const msg: ToolCallMessage = {
            tool_name: 'unknown_tool',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        const { getByText } = render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        validateMessage('unknown_tool', toolMessage, getByText);
    });

    it('renders with the loading icon', () => {
        const msg: ToolCallMessage = {
            tool_name: 'bash',
            args: '',
            source: 'ToolCall',
            tool_call_id: '12345',
        };
        const toolMessage = parseToolCallMessage(msg);

        render(<ToolCallItem toolMessage={toolMessage} state={RovoDevInitState.Initialized} />);

        const loadingIcon = document.querySelector('.codicon.codicon-loading.codicon-modifier-spin');
        expect(loadingIcon).toBeTruthy();
    });
});
