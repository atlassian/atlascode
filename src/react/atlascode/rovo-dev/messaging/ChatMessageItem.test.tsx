import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

    describe('Copy functionality', () => {
        it('shows copy button for RovoDev message when enableActions is true', () => {
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} />);

            expect(screen.getByLabelText('copy-button')).toBeTruthy();
        });

        it('does not show copy button when enableActions is false', () => {
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={false} />);

            expect(screen.queryByLabelText('copy-button')).toBeFalsy();
        });

        it('calls onCopy when copy button is clicked', () => {
            const mockOnCopy = jest.fn();
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} onCopy={mockOnCopy} />);

            const copyButton = screen.getByLabelText('copy-button');
            fireEvent.click(copyButton);

            expect(mockOnCopy).toHaveBeenCalledWith('Test message');
        });

        it('shows copied state after copy button is clicked', async () => {
            const mockOnCopy = jest.fn();
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} onCopy={mockOnCopy} />);

            const copyButton = screen.getByLabelText('copy-button');
            fireEvent.click(copyButton);

            // Should show copied state immediately
            expect(screen.getByLabelText('Copied!')).toBeTruthy();

            // Should reset after timeout
            await waitFor(
                () => {
                    expect(screen.queryByLabelText('Copied!')).toBeFalsy();
                },
                { timeout: 3000 },
            );
        });

        it('does not call onCopy when onCopy is not provided', () => {
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} />);

            const copyButton = screen.getByLabelText('copy-button');
            fireEvent.click(copyButton);

            // Should not throw error and should show copied state
            expect(screen.getByLabelText('Copied!')).toBeTruthy();
        });
    });

    describe('Feedback functionality', () => {
        it('shows feedback buttons for RovoDev message when enableActions is true', () => {
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} />);

            expect(screen.getByLabelText('like-response-button')).toBeTruthy();
            expect(screen.getByLabelText('dislike-response-button')).toBeTruthy();
        });

        it('calls onFeedback with true when like button is clicked', () => {
            const mockOnFeedback = jest.fn();
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} onFeedback={mockOnFeedback} />);

            const likeButton = screen.getByLabelText('like-response-button');
            fireEvent.click(likeButton);

            expect(mockOnFeedback).toHaveBeenCalledWith(true);
        });

        it('calls onFeedback with false when dislike button is clicked', () => {
            const mockOnFeedback = jest.fn();
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={true} onFeedback={mockOnFeedback} />);

            const dislikeButton = screen.getByLabelText('dislike-response-button');
            fireEvent.click(dislikeButton);

            expect(mockOnFeedback).toHaveBeenCalledWith(false);
        });

        it('does not show feedback buttons when enableActions is false', () => {
            const rovoDevMessage = forceCastTo<DefaultMessage>({
                text: 'Test message',
                source: 'RovoDev',
            });

            render(<ChatMessageItem msg={rovoDevMessage} enableActions={false} />);

            expect(screen.queryByLabelText('like-response-button')).toBeFalsy();
            expect(screen.queryByLabelText('dislike-response-button')).toBeFalsy();
        });
    });
});
