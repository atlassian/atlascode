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

    it('handles null content without crashing', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: null as any,
            index: 0,
        };

        expect(() => {
            render(
                <ChatMessageItem
                    msg={rovoDevMessage}
                    openFile={jest.fn()}
                    openJira={jest.fn()}
                    onLinkClick={jest.fn()}
                />,
            );
        }).not.toThrow();
    });

    it('handles undefined content without crashing', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: undefined as any,
            index: 0,
        };

        expect(() => {
            render(
                <ChatMessageItem
                    msg={rovoDevMessage}
                    openFile={jest.fn()}
                    openJira={jest.fn()}
                    onLinkClick={jest.fn()}
                />,
            );
        }).not.toThrow();
    });
});
