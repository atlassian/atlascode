import { render, screen } from '@testing-library/react';
import React from 'react';

import { PullRequestChatItem } from './PullRequestForm';

describe('PullRequestChatItem', () => {
    it('renders message content with markdown', () => {
        const mockMessage = {
            event_kind: '_RovoDevPullRequest' as const,
            text: 'This is a **Bold text** and normal text',
        };

        render(<PullRequestChatItem msg={mockMessage} onLinkClick={jest.fn()} />);

        expect(screen.getByText(/Bold text/)).toBeTruthy();
        expect(screen.getByText(/and normal text/)).toBeTruthy();
    });

    it('handles null text without crashing', () => {
        const mockMessage = {
            event_kind: '_RovoDevPullRequest' as const,
            text: null as any,
        };

        expect(() => {
            render(<PullRequestChatItem msg={mockMessage} onLinkClick={jest.fn()} />);
        }).not.toThrow();
    });

    it('handles undefined text without crashing', () => {
        const mockMessage = {
            event_kind: '_RovoDevPullRequest' as const,
            text: undefined as any,
        };

        expect(() => {
            render(<PullRequestChatItem msg={mockMessage} onLinkClick={jest.fn()} />);
        }).not.toThrow();
    });
});
