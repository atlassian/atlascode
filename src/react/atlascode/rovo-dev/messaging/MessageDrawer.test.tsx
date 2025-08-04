import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ChatMessage } from '../utils';
import { MessageDrawer } from './MessageDrawer';

// Mock the dependencies
jest.mock('@atlaskit/icon/glyph/chevron-down', () => {
    return function ChevronDown({ label }: { label: string }) {
        return <div data-testid="chevron-down">{label}</div>;
    };
});

jest.mock('@atlaskit/icon/glyph/chevron-right', () => {
    return function ChevronRight({ label }: { label: string }) {
        return <div data-testid="chevron-right">{label}</div>;
    };
});

jest.mock('../common/common', () => ({
    renderChatHistory: jest.fn((msg, index) => (
        <div key={index} data-testid={`chat-message-${index}`}>
            {msg.content}
        </div>
    )),
}));

jest.mock('../tools/ToolCallItem', () => ({
    ToolCallItem: ({ toolMessage }: { toolMessage: string }) => <div data-testid="tool-call-item">{toolMessage}</div>,
}));

describe('MessageDrawer', () => {
    const mockRenderProps = {
        openFile: jest.fn(),
        isRetryAfterErrorButtonEnabled: jest.fn(),
        retryPromptAfterError: jest.fn(),
        getOriginalText: jest.fn(),
    };

    const mockMessages: ChatMessage[] = [
        { text: 'Message 1', source: 'User' },
        { text: 'Message 2', source: 'RovoDev' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with default closed state', () => {
        render(
            <MessageDrawer
                opened={false}
                messages={mockMessages}
                renderProps={mockRenderProps}
                onCollapsiblePanelExpanded={() => {}}
            />,
        );

        expect(screen.getByText('Thinking')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.getByTestId('chevron-right')).toBeTruthy();
        expect(screen.queryByTestId('chevron-down')).not.toBeTruthy();
    });

    it('renders with opened state when opened prop is true', () => {
        render(
            <MessageDrawer
                opened={true}
                messages={mockMessages}
                renderProps={mockRenderProps}
                onCollapsiblePanelExpanded={() => {}}
            />,
        );

        expect(screen.getByTestId('chevron-down')).toBeTruthy();
        expect(screen.queryByTestId('chevron-right')).not.toBeTruthy();
        expect(screen.getByTestId('chat-message-0')).toBeTruthy();
        expect(screen.getByTestId('chat-message-1')).toBeTruthy();
    });

    it('toggles open state when header is clicked', () => {
        render(
            <MessageDrawer
                opened={false}
                messages={mockMessages}
                renderProps={mockRenderProps}
                onCollapsiblePanelExpanded={() => {}}
            />,
        );

        const header = screen.getByText('Thinking').closest('.message-drawer-header');

        // Initially closed
        expect(screen.getByTestId('chevron-right')).toBeTruthy();

        // Click to open
        fireEvent.click(header!);
        expect(screen.getByTestId('chevron-down')).toBeTruthy();
        expect(screen.getByTestId('chat-message-0')).toBeTruthy();

        // Click to close
        fireEvent.click(header!);
        expect(screen.getByTestId('chevron-right')).toBeTruthy();
    });

    it('displays correct message count', () => {
        const emptyMessages: ChatMessage[] = [];
        render(
            <MessageDrawer
                opened={false}
                messages={emptyMessages}
                renderProps={mockRenderProps}
                onCollapsiblePanelExpanded={() => {}}
            />,
        );

        expect(screen.getByText('0')).toBeTruthy();
    });
});
