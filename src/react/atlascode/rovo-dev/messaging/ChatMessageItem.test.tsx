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

        render(<ChatMessageItem msg={promptMessage} />);

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders assistant message correctly', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: 'Test message',
            index: 0,
        };

        render(<ChatMessageItem msg={rovoDevMessage} />);

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders markdown content correctly', () => {
        const rovoDevMessage = {
            event_kind: 'text' as const,
            content: '**Bold text**',
            index: 0,
        };

        render(<ChatMessageItem msg={rovoDevMessage} />);
        expect(screen.getByText('Bold text')).toBeTruthy();
    });
});
