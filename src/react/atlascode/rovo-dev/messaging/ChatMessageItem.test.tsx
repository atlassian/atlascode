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
        render(<ChatMessageItem msg={defaultMessage} />);

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders assistant message correctly', () => {
        const assistantMessage = forceCastTo<DefaultMessage>({
            ...defaultMessage,
            source: 'RovoDev',
        });

        render(<ChatMessageItem msg={assistantMessage} />);

        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('renders markdown content correctly', () => {
        const assistantMessage = forceCastTo<DefaultMessage>({
            text: '**Bold text**',
            source: 'RovoDev',
        });

        render(<ChatMessageItem msg={assistantMessage} />);
        expect(screen.getByText('Bold text')).toBeTruthy();
    });

    describe('User message with context', () => {
        it('renders context when provided for user message', () => {
            const userMessageWithContext = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'User',
                context: [
                    {
                        name: 'test-file.tsx',
                        content: 'file content',
                        path: '/path/to/test-file.tsx',
                    },
                ],
            });

            render(<ChatMessageItem msg={userMessageWithContext} />);

            expect(screen.getByText('Test message')).toBeTruthy();
            expect(screen.getByText('test-file.tsx')).toBeTruthy();
        });

        it('passes openFile prop to PromptContextCollection', () => {
            const mockOpenFile = jest.fn();
            const userMessageWithContext = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'User',
                context: [
                    {
                        name: 'test-file.tsx',
                        content: 'file content',
                        path: '/path/to/test-file.tsx',
                    },
                ],
            });

            render(<ChatMessageItem msg={userMessageWithContext} openFile={mockOpenFile} />);

            expect(screen.getByText('Test message')).toBeTruthy();
        });
    });
});
