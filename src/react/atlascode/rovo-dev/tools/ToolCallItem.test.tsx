import { Matcher, render, SelectorMatcherOptions } from '@testing-library/react';
import React from 'react';

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
        const toolMessage = parseToolCallMessage('');
        expect(toolMessage).toBe('');
    });

    it('renders the correct message for expand_code_chunks tool', () => {
        const toolMessage = parseToolCallMessage('expand_code_chunks');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Expanding code', toolMessage, getByText);
    });

    it('renders the correct message for find_and_replace_code tool', () => {
        const toolMessage = parseToolCallMessage('find_and_replace_code');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Finding and replacing code', toolMessage, getByText);
    });

    it('renders the correct message for open_files tool', () => {
        const toolMessage = parseToolCallMessage('open_files');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Opening files', toolMessage, getByText);
    });

    it('renders the correct message for create_file tool', () => {
        const toolMessage = parseToolCallMessage('create_file');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Creating file', toolMessage, getByText);
    });

    it('renders the correct message for delete_file tool', () => {
        const toolMessage = parseToolCallMessage('delete_file');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Deleting file', toolMessage, getByText);
    });

    it('renders the correct message for bash tool', () => {
        const toolMessage = parseToolCallMessage('bash');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Executing bash command', toolMessage, getByText);
    });

    it('renders the correct message for create_technical_plan tool', () => {
        const toolMessage = parseToolCallMessage('create_technical_plan');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Creating technical plan', toolMessage, getByText);
    });

    it('renders the correct message for grep', () => {
        const toolMessage = parseToolCallMessage('grep');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Searching for patterns', toolMessage, getByText);
    });

    it('renders the tool name for unknown tools', () => {
        const toolMessage = parseToolCallMessage('unknown_tool');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('unknown_tool', toolMessage, getByText);
    });

    it('renders with the loading icon', () => {
        const toolMessage = parseToolCallMessage('bash');
        render(<ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />);

        const loadingIcon = document.querySelector('.codicon.codicon-loading.codicon-modifier-spin');
        expect(loadingIcon).toBeTruthy();
    });
});
