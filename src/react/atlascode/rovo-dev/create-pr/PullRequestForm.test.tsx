import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';
import { forceCastTo } from 'testsutil/miscFunctions';

import { RovoDevViewResponseType } from '../rovoDevViewMessages';
import { DefaultMessage, ToolReturnParseResult } from '../utils';
import { PullRequestChatItem, PullRequestForm } from './PullRequestForm';

const mockPostMessage = jest.fn();
const mockPostMessagePromise = jest.fn();
const mockOnCancel = jest.fn();
const mockOnPullRequestCreated = jest.fn();
const mockSetFormVisible = jest.fn();

const mockModifiedFiles = forceCastTo<ToolReturnParseResult[]>([
    {
        content: 'file content',
        filePath: 'src/file.ts',
        type: 'modify',
    },
]);

describe('PullRequestForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders null when no modified files', () => {
        const { container } = render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={[]}
                onPullRequestCreated={mockOnPullRequestCreated}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders button when form is not visible', () => {
        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={mockModifiedFiles}
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
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={mockModifiedFiles}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
                setFormVisible={mockSetFormVisible}
            />,
        );

        expect(screen.getByLabelText(/commit message/i)).toBeTruthy();
        expect(screen.getByLabelText(/branch name/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /create pr/i })).toBeTruthy();
    });

    it('fetches branch name when toggle button is clicked', async () => {
        mockPostMessagePromise.mockResolvedValue({ data: { branchName: 'feature-branch' } });

        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={mockModifiedFiles}
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
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={mockModifiedFiles}
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
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={mockModifiedFiles}
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

        fireEvent.click(screen.getByRole('button', { name: /create pr/i }));

        await waitFor(() => {
            expect(mockPostMessagePromise).toHaveBeenCalledWith(
                {
                    type: RovoDevViewResponseType.CreatePR,
                    payload: { branchName: 'test-branch', commitMessage: 'Test commit message' },
                },
                RovoDevProviderMessageType.CreatePRComplete,
                expect.any(Number),
            );
            expect(mockOnPullRequestCreated).toHaveBeenCalledWith('http://pr-url.com');
        });
    });

    it('does not submit form with empty fields', async () => {
        render(
            <PullRequestForm
                onCancel={mockOnCancel}
                messagingApi={{ postMessage: mockPostMessage, postMessagePromise: mockPostMessagePromise }}
                modifiedFiles={mockModifiedFiles}
                onPullRequestCreated={mockOnPullRequestCreated}
                isFormVisible={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /create pr/i }));

        expect(mockPostMessagePromise).not.toHaveBeenCalled();
        expect(mockOnPullRequestCreated).not.toHaveBeenCalled();
    });
});

describe('PullRequestChatItem', () => {
    it('renders message content with markdown', () => {
        const mockMessage = forceCastTo<DefaultMessage>({
            text: 'This is a **Bold text** and normal text',
            source: 'PullRequest',
        });

        render(<PullRequestChatItem msg={mockMessage} />);

        expect(screen.getByText(/Bold text/)).toBeTruthy();
        expect(screen.getByText(/and normal text/)).toBeTruthy();
    });
});
