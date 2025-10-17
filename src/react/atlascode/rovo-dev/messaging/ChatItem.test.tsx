import { render, screen } from '@testing-library/react';
import React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { Response } from '../utils';
import { ChatItem } from './ChatItem';
const mockParseToolReturnMessage = require('../utils').parseToolReturnMessage;

// Mock the imported components
jest.mock('../common/DialogMessage', () => ({
    DialogMessageItem: ({ msg }: any) => <div data-testid="dialog-message">{msg.event_kind}</div>,
}));

jest.mock('../create-pr/PullRequestForm', () => ({
    PullRequestChatItem: ({ msg }: any) => <div data-testid="pr-chat-item">{msg.event_kind}</div>,
}));

jest.mock('../technical-plan/TechnicalPlanComponent', () => ({
    TechnicalPlanComponent: ({ content }: any) => <div data-testid="technical-plan">{content}</div>,
}));

jest.mock('../tools/ToolReturnItem', () => ({
    ToolReturnParsedItem: ({ msg }: any) => <div data-testid="tool-return-parsed">{msg.content}</div>,
}));

jest.mock('./ChatMessageItem', () => ({
    ChatMessageItem: ({ msg }: any) => <div data-testid="chat-message">{msg.content}</div>,
}));

jest.mock('./MessageDrawer', () => ({
    MessageDrawer: ({ messages }: any) => <div data-testid="message-drawer">{messages.length} messages</div>,
}));

jest.mock('../utils', () => ({
    parseToolReturnMessage: jest.fn(),
}));

describe('ChatItem', () => {
    const defaultProps = {
        handleCopyResponse: jest.fn(),
        handleFeedbackTrigger: jest.fn(),
        onToolPermissionChoice: jest.fn(),
        onCollapsiblePanelExpanded: jest.fn(),
        renderProps: {
            openFile: jest.fn(),
            checkFileExists: jest.fn(),
            isRetryAfterErrorButtonEnabled: jest.fn(),
            retryPromptAfterError: jest.fn(),
        },
        currentState: { state: 'WaitingForPrompt' } as State,
        drawerOpen: false,
        onLinkClick: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when block is null or undefined', () => {
        const { container } = render(<ChatItem {...defaultProps} block={null as any} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders MessageDrawer when block is an array', () => {
        const messages = [{ content: 'message1' }, { content: 'message2' }];
        render(<ChatItem {...defaultProps} block={messages as any} />);
        expect(screen.getByTestId('message-drawer')).toBeTruthy();
    });

    it('renders ChatMessageItem for _RovoDevUserPrompt event', () => {
        const block: Response = {
            event_kind: '_RovoDevUserPrompt',
            content: 'User prompt message',
        } as Response;

        render(<ChatItem {...defaultProps} block={block} />);
        expect(screen.getByTestId('chat-message')).toBeTruthy();
    });

    it('renders ChatMessageItem for text event', () => {
        const block: Response = {
            event_kind: 'text',
            content: 'Text message',
        } as Response;

        render(<ChatItem {...defaultProps} block={block} />);
        expect(screen.getByTestId('chat-message')).toBeTruthy();
    });

    it('renders TechnicalPlanComponent for tool-return with technical plan', () => {
        const block: Response = {
            event_kind: 'tool-return',
        } as Response;

        mockParseToolReturnMessage.mockReturnValue([{ technicalPlan: 'Technical plan content' }]);

        render(<ChatItem {...defaultProps} block={block} />);
        expect(screen.getByTestId('technical-plan')).toBeTruthy();
    });

    it('renders ToolReturnParsedItem for tool-return without technical plan', () => {
        const block: Response = {
            event_kind: 'tool-return',
        } as Response;

        mockParseToolReturnMessage.mockReturnValue([{ content: 'Tool return content' }]);

        render(<ChatItem {...defaultProps} block={block} />);
        expect(screen.getByTestId('tool-return-parsed')).toBeTruthy();
    });

    it('renders DialogMessageItem for _RovoDevDialog event', () => {
        const block: Response = {
            event_kind: '_RovoDevDialog',
        } as Response;

        render(<ChatItem {...defaultProps} block={block} />);
        expect(screen.getByTestId('dialog-message')).toBeTruthy();
    });

    it('renders PullRequestChatItem for _RovoDevPullRequest event', () => {
        const block: Response = {
            event_kind: '_RovoDevPullRequest',
        } as Response;

        render(<ChatItem {...defaultProps} block={block} />);
        expect(screen.getByTestId('pr-chat-item')).toBeTruthy();
    });

    it('returns null for unknown event kinds', () => {
        const block: Response = {
            event_kind: 'unknown-event',
        } as unknown as Response;

        const { container } = render(<ChatItem {...defaultProps} block={block} />);
        expect(container.firstChild).toBeNull();
    });
});
