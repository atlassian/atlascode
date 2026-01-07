import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RovoDevErrorBoundary } from './RovoDevErrorBoundary';
import { RovoDevViewResponseType } from './rovoDevViewMessages';

jest.mock('./common/DialogMessage', () => ({
    DialogMessageItem: ({ msg, customButton, onLinkClick }: any) => (
        <div data-testid="dialog-message-item">
            <div data-testid="dialog-title">{msg.title}</div>
            <div data-testid="dialog-text">{msg.text}</div>
            {msg.stackTrace && <div data-testid="dialog-stack-trace">{msg.stackTrace}</div>}
            {msg.stderr && <div data-testid="dialog-stderr">{msg.stderr}</div>}
            {customButton && (
                <button data-testid="custom-button" onClick={customButton.onClick}>
                    {customButton.text}
                </button>
            )}
            <button data-testid="link-click" onClick={() => onLinkClick('test-link')}>
                Link
            </button>
        </div>
    ),
}));

const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
    shouldThrow = true,
    errorMessage = 'Test error',
}) => {
    if (shouldThrow) {
        throw new Error(errorMessage);
    }
    return <div>No error</div>;
};

describe('RovoDevErrorBoundary', () => {
    let mockPostMessage: jest.Mock;
    let mockOnStartNewSession: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPostMessage = jest.fn();
        mockOnStartNewSession = jest.fn();

        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Normal rendering', () => {
        it('renders children when there is no error', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <div>Test content</div>
                </RovoDevErrorBoundary>,
            );

            expect(screen.getByText('Test content')).toBeTruthy();
            expect(screen.queryByTestId('dialog-message-item')).not.toBeTruthy();
            expect(mockPostMessage).not.toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        it('catches errors and displays error dialog', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            expect(screen.getByTestId('dialog-message-item')).toBeTruthy();
            expect(screen.getByTestId('dialog-title')).toBeTruthy();
            expect(screen.getByText('Rovo Dev encountered a rendering error')).toBeTruthy();
        });

        it('displays error message in dialog', () => {
            const errorMessage = 'Custom error message';
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError errorMessage={errorMessage} />
                </RovoDevErrorBoundary>,
            );

            expect(screen.getByTestId('dialog-text')).toBeTruthy();
            expect(screen.getByText(errorMessage)).toBeTruthy();
        });

        it('displays default error message when error message is missing', () => {
            const ErrorWithoutMessage = () => {
                const error = new Error();
                error.message = '';
                throw error;
            };

            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ErrorWithoutMessage />
                </RovoDevErrorBoundary>,
            );

            expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
        });

        it('reports error to backend via postMessage', () => {
            const errorMessage = 'Test error message';
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError errorMessage={errorMessage} />
                </RovoDevErrorBoundary>,
            );

            expect(mockPostMessage).toHaveBeenCalledTimes(1);
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: RovoDevViewResponseType.ReportRenderError,
                errorType: 'Error',
                errorMessage: errorMessage,
                errorStack: expect.any(String),
                componentStack: expect.any(String),
            });
        });

        it('includes error stack trace in dialog when available', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            const stackTraceElement = screen.queryByTestId('dialog-stack-trace');
            expect(stackTraceElement).toBeTruthy();
        });

        it('includes component stack in stderr field when available', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            const stderrElement = screen.queryByTestId('dialog-stderr');
            expect(stderrElement).toBeTruthy();
        });
    });

    describe('Start new session', () => {
        it('renders start new session button', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            const button = screen.getByTestId('custom-button');
            expect(button).toBeTruthy();
            expect(screen.getByText('Start New Chat Session')).toBeTruthy();
        });

        it('calls postMessage with StartNewSession when button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            const button = screen.getByTestId('custom-button');
            await user.click(button);

            expect(mockPostMessage).toHaveBeenCalledWith({
                type: RovoDevViewResponseType.StartNewSession,
            });
        });

        it('calls onStartNewSession callback when button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage} onStartNewSession={mockOnStartNewSession}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            const button = screen.getByTestId('custom-button');
            await user.click(button);

            expect(mockOnStartNewSession).toHaveBeenCalledTimes(1);
        });

        it('resets error state after starting new session', async () => {
            const user = userEvent.setup();
            const NoErrorComponent = () => <div>No error</div>;

            // Use a wrapper component with state to control which children are rendered
            const TestWrapper = () => {
                const [shouldThrow, setShouldThrow] = React.useState(true);

                const handleStartNewSession = () => {
                    mockOnStartNewSession();
                    setShouldThrow(false);
                };

                return (
                    <RovoDevErrorBoundary postMessage={mockPostMessage} onStartNewSession={handleStartNewSession}>
                        {shouldThrow ? <ThrowError /> : <NoErrorComponent />}
                    </RovoDevErrorBoundary>
                );
            };

            render(<TestWrapper />);

            expect(screen.getByTestId('dialog-message-item')).toBeTruthy();

            const button = screen.getByTestId('custom-button');
            await user.click(button);

            // Verify that postMessage and callback were called
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: RovoDevViewResponseType.StartNewSession,
            });
            expect(mockOnStartNewSession).toHaveBeenCalledTimes(1);

            await waitFor(() => {
                expect(screen.getByText('No error')).toBeTruthy();
                expect(screen.queryByTestId('dialog-message-item')).not.toBeTruthy();
            });
        });
    });

    describe('Error boundary lifecycle', () => {
        it('updates state correctly when error is caught', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            // Error should be caught and displayed
            expect(screen.getByTestId('dialog-message-item')).toBeTruthy();
        });

        it('handles multiple errors correctly', () => {
            const { rerender } = render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError errorMessage="First error" />
                </RovoDevErrorBoundary>,
            );

            expect(screen.getByText('First error')).toBeTruthy();
            expect(mockPostMessage).toHaveBeenCalledTimes(1);

            // Simulate a new error by re-rendering with a different error
            rerender(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError errorMessage="Second error" />
                </RovoDevErrorBoundary>,
            );

            // Should still show error dialog
            expect(screen.getByTestId('dialog-message-item')).toBeTruthy();
        });
    });

    describe('Link click handler', () => {
        it('provides empty link click handler', () => {
            render(
                <RovoDevErrorBoundary postMessage={mockPostMessage}>
                    <ThrowError />
                </RovoDevErrorBoundary>,
            );

            const linkButton = screen.getByTestId('link-click');
            expect(linkButton).toBeTruthy();

            // Should not throw when clicked
            expect(() => {
                linkButton.click();
            }).not.toThrow();
        });
    });
});
