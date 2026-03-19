import { Matcher, render, SelectorMatcherOptions } from '@testing-library/react';
import React from 'react';

import { parseToolCallMessage, SubagentInfo, ToolCallItem } from './ToolCallItem';

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
        const toolMessage = parseToolCallMessage('' as any);
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

    it('renders the correct message for grep', () => {
        const toolMessage = parseToolCallMessage('grep');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Searching for patterns', toolMessage, getByText);
    });

    it('renders the tool name for unknown tools', () => {
        const toolMessage = parseToolCallMessage('unknown_tool' as any);
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('unknown_tool', toolMessage, getByText);
    });

    it('renders the correct message for invoke_subagents tool', () => {
        const toolMessage = parseToolCallMessage('invoke_subagents');
        const { getByText } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        validateMessage('Delegating tasks to subagents', toolMessage, getByText);
    });

    it('renders subagent task list when subagentTasks are provided', () => {
        const toolMessage = parseToolCallMessage('invoke_subagents');
        const subagentTasks: SubagentInfo[] = [
            { subagentName: 'Explore', taskName: 'Tool UI components' },
            { subagentName: 'Explore', taskName: 'Response parser tools' },
            { subagentName: 'General Purpose', taskName: 'Fix auth bug' },
        ];

        const { getByText } = render(
            <ToolCallItem
                toolMessage={toolMessage}
                currentState={{ state: 'WaitingForPrompt' }}
                subagentTasks={subagentTasks}
            />,
        );

        expect(getByText('Delegating tasks to subagents')).toBeTruthy();
        expect(getByText(/Subagent: Explore \(Tool UI components\)/)).toBeTruthy();
        expect(getByText(/Subagent: Explore \(Response parser tools\)/)).toBeTruthy();
        expect(getByText(/Subagent: General Purpose \(Fix auth bug\)/)).toBeTruthy();
    });

    it('does not render subagent task list when subagentTasks is empty', () => {
        const toolMessage = parseToolCallMessage('invoke_subagents');

        const { container } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} subagentTasks={[]} />,
        );

        expect(container.querySelector('.subagent-task-list')).toBeNull();
    });

    it('renders subagent task list with a single subagent', () => {
        const toolMessage = parseToolCallMessage('invoke_subagents');
        const subagentTasks: SubagentInfo[] = [{ subagentName: 'Domain Research', taskName: 'Investigate auth flow' }];

        const { getByText } = render(
            <ToolCallItem
                toolMessage={toolMessage}
                currentState={{ state: 'WaitingForPrompt' }}
                subagentTasks={subagentTasks}
            />,
        );

        expect(getByText('Delegating tasks to subagents')).toBeTruthy();
        expect(getByText(/Subagent: Domain Research \(Investigate auth flow\)/)).toBeTruthy();
    });

    it('does not render subagent task list when subagentTasks is undefined', () => {
        const toolMessage = parseToolCallMessage('invoke_subagents');

        const { container } = render(
            <ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />,
        );

        expect(container.querySelector('.subagent-task-list')).toBeNull();
    });

    it('renders subagent tasks with special characters in names', () => {
        const toolMessage = parseToolCallMessage('invoke_subagents');
        const subagentTasks: SubagentInfo[] = [
            { subagentName: 'General Purpose', taskName: 'Fix "auth" & <login> flow' },
        ];

        const { getByText } = render(
            <ToolCallItem
                toolMessage={toolMessage}
                currentState={{ state: 'WaitingForPrompt' }}
                subagentTasks={subagentTasks}
            />,
        );

        expect(getByText(/Fix "auth" & <login> flow/)).toBeTruthy();
    });

    it('renders with the loading icon', () => {
        const toolMessage = parseToolCallMessage('bash');
        render(<ToolCallItem toolMessage={toolMessage} currentState={{ state: 'WaitingForPrompt' }} />);

        const loadingIcon = document.querySelector('.codicon.codicon-loading.codicon-modifier-spin');
        expect(loadingIcon).toBeTruthy();
    });
});
