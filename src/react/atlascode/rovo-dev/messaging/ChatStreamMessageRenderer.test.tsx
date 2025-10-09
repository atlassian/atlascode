import { render, screen } from '@testing-library/react';
import React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { Response } from '../utils';
import { ChatStreamMessageRenderer } from './ChatStreamMessageRenderer';

// Mock ChatItem component
jest.mock('./ChatItem', () => ({
    ChatItem: jest.fn(({ block, drawerOpen }) => (
        <div data-testid="chat-item" data-drawer-open={drawerOpen}>
            {Array.isArray(block) ? 'thinking' : block.event_kind}
        </div>
    )),
}));

const mockRenderProps = {
    openFile: jest.fn(),
    checkFileExists: jest.fn(),
    isRetryAfterErrorButtonEnabled: jest.fn(),
    retryPromptAfterError: jest.fn(),
};

const mockCurrentState: State = {
    state: 'GeneratingResponse',
};

const mockWaitingState: State = {
    state: 'WaitingForPrompt',
};

describe('ChatStreamMessageRenderer', () => {
    const defaultProps = {
        chatHistory: [],
        currentState: mockCurrentState,
        handleCopyResponse: jest.fn(),
        handleFeedbackTrigger: jest.fn(),
        renderProps: mockRenderProps,
        onToolPermissionChoice: jest.fn(),
        onCollapsiblePanelExpanded: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when chatHistory is null or undefined', () => {
        const { container } = render(<ChatStreamMessageRenderer {...defaultProps} chatHistory={null as any} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders empty array when chatHistory is empty', () => {
        const { container } = render(<ChatStreamMessageRenderer {...defaultProps} chatHistory={[]} />);
        expect(container.children).toHaveLength(0);
    });

    it('renders ChatItem for each block in chatHistory', () => {
        const mockChatHistory: Response[] = [
            { event_kind: '_RovoDevUserPrompt', content: 'Hello' },
            { event_kind: 'text', content: 'Hi there', index: 0 },
        ];

        render(<ChatStreamMessageRenderer {...defaultProps} chatHistory={mockChatHistory} />);

        expect(screen.getAllByTestId('chat-item')).toHaveLength(2);
    });

    it('sets openDrawerIdx to -1 when state is WaitingForPrompt', () => {
        const mockChatHistory = [['thinking'], { event_kind: 'text', content: 'Hello', index: 1 }];

        render(
            <ChatStreamMessageRenderer
                {...defaultProps}
                chatHistory={mockChatHistory as any}
                currentState={mockWaitingState}
            />,
        );

        const chatItems = screen.getAllByTestId('chat-item');
        expect(chatItems[0].attributes.getNamedItem('data-drawer-open')?.value).toBe('false');
    });

    it('sets drawerOpen correctly for last array block', () => {
        const mockChatHistory = [
            { event_kind: 'text', content: 'Hello', index: 0 },
            ['thinking'],
            { event_kind: 'text', content: 'Hi', index: 2 },
        ];

        render(<ChatStreamMessageRenderer {...defaultProps} chatHistory={mockChatHistory as any} />);

        const chatItems = screen.getAllByTestId('chat-item');
        expect(chatItems[0].attributes.getNamedItem('data-drawer-open')?.value).toBe('false');
        expect(chatItems[1].attributes.getNamedItem('data-drawer-open')?.value).toBe('true');
        expect(chatItems[2].attributes.getNamedItem('data-drawer-open')?.value).toBe('false');
    });

    it('skips null blocks in chatHistory', () => {
        const mockChatHistory = [
            { event_kind: 'message', content: 'Hello' },
            null,
            { event_kind: 'response', content: 'Hi' },
        ];

        render(<ChatStreamMessageRenderer {...defaultProps} chatHistory={mockChatHistory as any} />);

        expect(screen.getAllByTestId('chat-item')).toHaveLength(2);
    });
});
