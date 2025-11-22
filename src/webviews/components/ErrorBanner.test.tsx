import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { disableConsole } from 'testsutil';

import ErrorBanner from './ErrorBanner';

describe('ErrorBanner', () => {
    const mockOnDismissError = jest.fn();
    const mockOnRetry = jest.fn();
    const mockOnSignIn = jest.fn();

    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Retry button for retryable errors', () => {
        it('shows Retry button for timeout errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="Request timeout"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Retry');
            expect(container.textContent).not.toContain('Sign In');
        });

        it('shows Retry button for network errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="Network connection failed"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Retry');
            expect(container.textContent).not.toContain('Sign In');
        });

        it('shows Retry button for 500 errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="500 Internal Server Error"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Retry');
            expect(container.textContent).not.toContain('Sign In');
        });

        it('calls onRetry when Retry button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <ErrorBanner
                    errorDetails="Request timeout"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            await user.click(screen.getByText('Retry'));
            expect(mockOnRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe('Sign In button for auth errors', () => {
        it('shows Sign In button for 401 errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="401 Unauthorized"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Sign In');
            expect(container.textContent).not.toContain('Retry');
        });

        it('shows Sign In button for 403 errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="403 Forbidden"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Sign In');
            expect(container.textContent).not.toContain('Retry');
        });

        it('shows Sign In button for "sign in" message', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="Unable to connect to Jira. Please sign in again to continue."
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Sign In');
            expect(container.textContent).not.toContain('Retry');
        });

        it('shows Sign In button for session expired errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="Your session has expired. Please sign in again to continue."
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Sign In');
            expect(container.textContent).not.toContain('Retry');
        });

        it('shows Sign In button for permission errors', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="You don't have permission to perform this action"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).toContain('Sign In');
            expect(container.textContent).not.toContain('Retry');
        });

        it('calls onSignIn when Sign In button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <ErrorBanner
                    errorDetails="401 Unauthorized"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                    onSignIn={mockOnSignIn}
                />,
            );

            await user.click(screen.getByText('Sign In'));
            expect(mockOnSignIn).toHaveBeenCalledTimes(1);
        });
    });

    describe('No buttons when callbacks not provided', () => {
        it('shows no buttons when onRetry not provided for retryable error', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="Request timeout"
                    onDismissError={mockOnDismissError}
                    onSignIn={mockOnSignIn}
                />,
            );

            expect(container.textContent).not.toContain('Retry');
        });

        it('shows no buttons when onSignIn not provided for auth error', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="401 Unauthorized"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                />,
            );

            expect(container.textContent).not.toContain('Sign In');
        });
    });

    describe('Error message display', () => {
        it('displays simple string error', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails="Simple error message"
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                />,
            );

            expect(container.textContent).toContain('Simple error message');
        });

        it('displays error with title', () => {
            const { container } = render(
                <ErrorBanner
                    errorDetails={{ title: 'Custom Error Title', message: 'Error details' }}
                    onDismissError={mockOnDismissError}
                    onRetry={mockOnRetry}
                />,
            );

            expect(container.textContent).toContain('Custom Error Title');
        });

        it('displays default title when not provided', () => {
            const { container } = render(
                <ErrorBanner errorDetails="Some error" onDismissError={mockOnDismissError} onRetry={mockOnRetry} />,
            );

            expect(container.textContent).toContain('Something went wrong');
        });
    });
});
