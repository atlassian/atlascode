import { render, screen } from '@testing-library/react';
import React from 'react';
import { forceCastTo } from 'testsutil/miscFunctions';

import { DefaultMessage } from '../utils';
import { ChatMessageItem } from './ChatMessageItem';

describe('ChatMessageItem', () => {
    const defaultMessage = forceCastTo<DefaultMessage>({
        text: 'Test message',
        source: 'User',
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders user message correctly', () => {
        render(<ChatMessageItem msg={defaultMessage} index={0} />);

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders assistant message correctly', () => {
        const assistantMessage = forceCastTo<DefaultMessage>({
            ...defaultMessage,
            source: 'RovoDev',
        });

        render(<ChatMessageItem msg={assistantMessage} index={0} />);

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders markdown content correctly', () => {
        const assistantMessage = forceCastTo<DefaultMessage>({
            text: '**Bold text**',
            source: 'RovoDev',
        });

        render(<ChatMessageItem msg={assistantMessage} index={0} />);
        expect(screen.getByText('Bold text')).toBeTruthy();
    });
});
