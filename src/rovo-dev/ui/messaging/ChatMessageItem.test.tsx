import { render, screen } from '@testing-library/react';
import React from 'react';

import { ChatMessageItem } from './ChatMessageItem';

describe('ChatMessageItem', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders user message correctly', () => {
        const promptMessage = {
            event_kind: 'text' as const,
            content: 'Test message',
            index: 0,
        };

        render(
            <ChatMessageItem msg={promptMessage} openFile={jest.fn()} openJira={jest.fn()} onLinkClick={jest.fn()} />,
        );

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders assistant message correctly', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: 'Test message',
            index: 0,
        };

        render(
            <ChatMessageItem msg={rovoDevMessage} openFile={jest.fn()} openJira={jest.fn()} onLinkClick={jest.fn()} />,
        );

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders markdown content correctly', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: '**Bold text**',
            index: 0,
        };

        render(
            <ChatMessageItem msg={rovoDevMessage} openFile={jest.fn()} openJira={jest.fn()} onLinkClick={jest.fn()} />,
        );
        expect(screen.getByText('Bold text')).toBeTruthy();
    });

    it('renders malformed markdown links correctly (period before parenthesis)', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: 'assign [Alex Marginson].(/people/712020:05ca66ee-d3b6-4a5e-923a-fddbf1663d1c).',
            index: 0,
        };

        const { container } = render(
            <ChatMessageItem msg={rovoDevMessage} openFile={jest.fn()} openJira={jest.fn()} onLinkClick={jest.fn()} />,
        );

        // Should render as a proper link, not raw text with period
        const link = container.querySelector('a[data-href="/people/712020:05ca66ee-d3b6-4a5e-923a-fddbf1663d1c"]');
        expect(link).toBeTruthy();
        expect(link?.textContent).toBe('Alex Marginson');
    });

    it('renders URLs broken across line breaks correctly', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: 'Start working on [SCRUM-175] ([https://bbplay.atlassian.net/browse/SCRUM-](https://bbplay.atlassian.net/browse/SCRUM-)\n175)',
            index: 0,
        };

        const { container } = render(
            <ChatMessageItem msg={rovoDevMessage} openFile={jest.fn()} openJira={jest.fn()} onLinkClick={jest.fn()} />,
        );

        // Should merge the broken URL into a single link
        const link = container.querySelector('a[data-href*="SCRUM-175"]');
        expect(link).toBeTruthy();
    });
});
