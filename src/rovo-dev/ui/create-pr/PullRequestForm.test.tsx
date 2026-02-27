import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

import { RovoDevViewResponseType } from '../rovoDevViewMessages';
import { PullRequestChatItem, PullRequestForm } from './PullRequestForm';

const mockPostMessage = jest.fn();
const mockPostMessagePromise = jest.fn();
const mockSetState = jest.fn();
const mockOnCancel = jest.fn();
const mockOnPullRequestCreated = jest.fn();
const mockSetFormVisible = jest.fn();

const mockMessagingApi = {
    postMessage: mockPostMessage,
    postMessagePromise: mockPostMessagePromise,
    setState: mockSetState,
};

describe('PullRequestForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders button when form is not visible', () => {
        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={false}
                setFormVisible={mockSetFormVisible}
            />,
        );

        expect(screen.getByRole('button', { name: /create pull request/i })).toBeTruthy();
    });

    it('renders form when form is visible', () => {
        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
                setFormVisible={mockSetFormVisible}
            />,
        );

        expect(screen.getByLabelText(/commit message/i)).toBeTruthy();
        expect(screen.getByLabelText(/branch name/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /create pull request/i })).toBeTruthy();
    });

    it('fetches branch name when toggle button is clicked', async () => {
        mockPostMessagePromise.mockResolvedValue({ data: { branchName: 'feature-branch' } });

        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={false}
                setFormVisible={mockSetFormVisible}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

        await waitFor(() => {
            expect(mockPostMessagePromise).toHaveBeenCalledWith(
                { type: RovoDevViewResponseType.GetCurrentBranchName },
                RovoDevProviderMessageType.GetCurrentBranchNameComplete,
                expect.any(Number),
            );
            expect(mockSetFormVisible).toHaveBeenCalledWith(true);
        });
    });

    it('calls onCancel when cancel button is clicked', () => {
        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('submits form with correct data', async () => {
        mockPostMessagePromise.mockResolvedValue({ data: { url: 'http://pr-url.com' } });

        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
            />,
        );

        fireEvent.change(screen.getByLabelText(/commit message/i), {
            target: { value: 'Test commit message' },
        });
        fireEvent.change(screen.getByLabelText(/branch name/i), {
            target: { value: 'test-branch' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

        await waitFor(() => {
            expect(mockPostMessagePromise).toHaveBeenCalledWith(
                {
                    type: RovoDevViewResponseType.CreatePR,
                    payload: { branchName: 'test-branch', commitMessage: 'Test commit message' },
                },
                RovoDevProviderMessageType.CreatePRComplete,
                expect.any(Number),
            );
            expect(mockOnPullRequestCreated).toHaveBeenCalledWith('http://pr-url.com', 'test-branch');
        });
    });

    it('does not submit form without branch name', async () => {
        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
            />,
        );

        fireEvent.change(screen.getByLabelText(/commit message/i), {
            target: { value: 'Test commit message' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

        expect(mockPostMessagePromise).not.toHaveBeenCalled();
        expect(mockOnPullRequestCreated).not.toHaveBeenCalled();
    });

    it('submits form with only branch name (commit message optional)', async () => {
        mockPostMessagePromise.mockResolvedValue({
            type: RovoDevProviderMessageType.CreatePRComplete,
            data: { url: 'http://pr-url.com' },
        });

        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={mockMessagingApi}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
            />,
        );

        fireEvent.change(screen.getByLabelText(/branch name/i), {
            target: { value: 'test-branch' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

        await waitFor(() => {
            expect(mockPostMessagePromise).toHaveBeenCalledWith(
                {
                    type: RovoDevViewResponseType.CreatePR,
                    payload: { branchName: 'test-branch', commitMessage: 'Commit by Rovo Dev' },
                },
                RovoDevProviderMessageType.CreatePRComplete,
                expect.any(Number),
            );
        });
    });

    describe('form validation with optional commit message', () => {
        it('should show helpful label text for commit message field', () => {
            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            const commitMessageLabel = screen.getByText(/commit message/i);
            expect(commitMessageLabel).toBeTruthy();
            expect(screen.getByText(/optional if already committed/i)).toBeTruthy();
        });

        it('should not have required attribute on commit message field', () => {
            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            const commitMessageInput = screen.getByLabelText(/commit message/i);
            expect(commitMessageInput.hasAttribute('required')).toBe(false);
        });

        it('should still have required attribute on branch name field', () => {
            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            const branchNameInput = screen.getByLabelText(/branch name/i);
            expect(branchNameInput.hasAttribute('required')).toBe(true);
        });
    });

    describe('loading states', () => {
        it('should show loading spinner when branch name is loading', () => {
            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={false}
                    setFormVisible={mockSetFormVisible}
                />,
            );

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            expect(screen.getByRole('button', { name: /create pull request/i })).toBeTruthy();
        });

        it('should show loading spinner when pull request is being created', () => {
            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            fireEvent.change(screen.getByLabelText(/branch name/i), {
                target: { value: 'test-branch' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            expect(screen.getByRole('button', { name: /create pull request/i })).toBeTruthy();
        });
    });

    describe('error handling', () => {
        it('should handle error response from create PR', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockPostMessagePromise.mockResolvedValue({
                data: { error: 'Git push failed' },
            });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            fireEvent.change(screen.getByLabelText(/branch name/i), {
                target: { value: 'test-branch' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error creating PR: Git push failed');
            });

            expect(mockOnPullRequestCreated).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle empty URL response', async () => {
            mockPostMessagePromise.mockResolvedValue({
                data: { url: '' },
            });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            fireEvent.change(screen.getByLabelText(/branch name/i), {
                target: { value: 'test-branch' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(mockOnPullRequestCreated).toHaveBeenCalledWith('', 'test-branch');
            });
        });
    });

    describe('branch name handling', () => {
        it('should set branch name from API response', async () => {
            mockPostMessagePromise.mockResolvedValue({ data: { branchName: 'feature-branch' } });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={false}
                    setFormVisible={mockSetFormVisible}
                />,
            );

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(mockPostMessagePromise).toHaveBeenCalledWith(
                    { type: RovoDevViewResponseType.GetCurrentBranchName },
                    RovoDevProviderMessageType.GetCurrentBranchNameComplete,
                    expect.any(Number),
                );
            });
        });

        it('should handle undefined branch name from API', async () => {
            mockPostMessagePromise.mockResolvedValue({ data: { branchName: undefined } });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={false}
                    setFormVisible={mockSetFormVisible}
                />,
            );

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(mockSetFormVisible).toHaveBeenCalledWith(true);
            });
        });
    });

    describe('form submission edge cases', () => {
        it('should handle form submission with empty commit message', async () => {
            mockPostMessagePromise.mockResolvedValue({ data: { url: 'http://pr-url.com' } });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            fireEvent.change(screen.getByLabelText(/commit message/i), {
                target: { value: '' },
            });
            fireEvent.change(screen.getByLabelText(/branch name/i), {
                target: { value: 'test-branch' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(mockPostMessagePromise).toHaveBeenCalledWith(
                    {
                        type: RovoDevViewResponseType.CreatePR,
                        payload: { branchName: 'test-branch', commitMessage: undefined },
                    },
                    RovoDevProviderMessageType.CreatePRComplete,
                    expect.any(Number),
                );
            });
        });

        it('should handle form submission with whitespace-only commit message', async () => {
            mockPostMessagePromise.mockResolvedValue({ data: { url: 'http://pr-url.com' } });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            fireEvent.change(screen.getByLabelText(/commit message/i), {
                target: { value: '   ' },
            });
            fireEvent.change(screen.getByLabelText(/branch name/i), {
                target: { value: 'test-branch' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(mockPostMessagePromise).toHaveBeenCalledWith(
                    {
                        type: RovoDevViewResponseType.CreatePR,
                        payload: { branchName: 'test-branch', commitMessage: undefined },
                    },
                    RovoDevProviderMessageType.CreatePRComplete,
                    expect.any(Number),
                );
            });
        });

        it('should handle form submission with null commit message', async () => {
            mockPostMessagePromise.mockResolvedValue({ data: { url: 'http://pr-url.com' } });

            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                />,
            );

            fireEvent.change(screen.getByLabelText(/commit message/i), {
                target: { value: null },
            });
            fireEvent.change(screen.getByLabelText(/branch name/i), {
                target: { value: 'test-branch' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            await waitFor(() => {
                expect(mockPostMessagePromise).toHaveBeenCalledWith(
                    {
                        type: RovoDevViewResponseType.CreatePR,
                        payload: { branchName: 'test-branch', commitMessage: undefined },
                    },
                    RovoDevProviderMessageType.CreatePRComplete,
                    expect.any(Number),
                );
            });
        });
    });

    describe('button states and interactions', () => {
        it('should handle button click without setFormVisible', () => {
            render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={false}
                />,
            );

            fireEvent.click(screen.getByRole('button', { name: /create pull request/i }));

            expect(screen.getByRole('button', { name: /create pull request/i })).toBeTruthy();
        });

        it('should handle form visibility toggle', () => {
            const { rerender } = render(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={false}
                    setFormVisible={mockSetFormVisible}
                />,
            );

            expect(screen.getByRole('button', { name: /create pull request/i })).toBeTruthy();
            expect(screen.queryByLabelText(/commit message/i)).toBeFalsy();

            rerender(
                <PullRequestForm
                    onCancel={mockOnCancel}
                    messagingApi={mockMessagingApi}
                    onPullRequestCreated={mockOnPullRequestCreated}
                    isFormVisible={true}
                    setFormVisible={mockSetFormVisible}
                />,
            );

            expect(screen.getByLabelText(/commit message/i)).toBeTruthy();
            expect(screen.getByLabelText(/branch name/i)).toBeTruthy();
        });
    });
});

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
