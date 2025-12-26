import React, { Component, ErrorInfo, ReactNode } from 'react';

import { DialogMessageItem } from './common/DialogMessage';
import { PostMessageFunc } from './messagingApi';
import { RovoDevViewResponse, RovoDevViewResponseType } from './rovoDevViewMessages';
import { ErrorDialogMessage } from './utils';

const STACK_LIMIT = 1500;

interface Props {
    children: ReactNode;
    postMessage: PostMessageFunc<RovoDevViewResponse>;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class RovoDevErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });

        // Report error to backend
        this.props.postMessage({
            type: RovoDevViewResponseType.ReportRenderError,
            errorType: error.name,
            errorMessage: error.message,
            errorStack: this.simplifyStack(error.stack || ''),
            componentStack: this.simplifyStack(errorInfo.componentStack || ''),
        });
    }

    private simplifyStack(stack: string): string {
        const lines = stack
            .split('\n')
            .map((line) => {
                // Extract function/component name
                const match = line.match(/at (.*) \((.*)\)/);
                return match ? match[1] : line.match(/at (.*)/)?.[1];
            })
            .filter(Boolean)
            .join(' < ');

        return lines.length > STACK_LIMIT ? lines.substring(0, STACK_LIMIT) + '...' : lines;
    }

    private handleStartNewSession = () => {
        // Use setTimeout to reset state after a brief delay
        // This gives the command time to execute before React tries to re-render
        setTimeout(() => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
            });
        }, 100);
    };

    override render() {
        if (this.state.hasError) {
            // Create a DialogMessage object from the error
            const errorDialog: ErrorDialogMessage = {
                event_kind: '_RovoDevDialog',
                type: 'error',
                title: 'Rovo Dev encountered a rendering error',
                text: this.state.error?.message || 'An unexpected error occurred',
                stackTrace: this.state.error?.stack || undefined,
                stderr: this.state.errorInfo?.componentStack || undefined, // Using stderr field for component stack
                uid: 'error-boundary', // Required for ErrorDialogMessage
            };

            return (
                <DialogMessageItem
                    msg={errorDialog}
                    customButton={{
                        text: 'Start New Chat Session',
                        href: 'command:atlascode.rovodev.newChatSession',
                        onClick: this.handleStartNewSession,
                    }}
                    onLinkClick={() => {}} // Required prop, but not used for error boundary
                />
            );
        }

        return this.props.children;
    }
}
