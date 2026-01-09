import React, { Component, ErrorInfo, ReactNode } from 'react';

import { DialogMessageItem } from './common/DialogMessage';
import { PostMessageFunc } from './messagingApi';
import { RovoDevViewResponse, RovoDevViewResponseType } from './rovoDevViewMessages';
import { ErrorDialogMessage } from './utils';

const STACK_LIMIT = 1500;

interface Props {
    children: ReactNode;
    postMessage: PostMessageFunc<RovoDevViewResponse>;
    onStartNewSession?: () => void;
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
            errorStack: this.simplifyStack(error.stack || '', (line) => line.match(/at (.*) \((.*)\)/)?.[1]),
            componentStack: this.simplifyStack(
                errorInfo.componentStack || '',
                (line) => line.match(/in (.*) \(created by (.*)\)/)?.[1],
            ),
        });
    }

    private simplifyStack(stack: string, extractFunc: (line: string) => string | undefined): string {
        const line = stack.split('\n').map(extractFunc).filter(Boolean).join(' < ');

        return line.length > STACK_LIMIT ? line.substring(0, STACK_LIMIT) + '...' : line;
    }

    private handleStartNewSession = () => {
        // Send message to extension to start new session
        this.props.postMessage({
            type: RovoDevViewResponseType.StartNewSession,
        });

        // Call the callback to reset any parent state (e.g., test error state)
        if (this.props.onStartNewSession) {
            this.props.onStartNewSession();
        }

        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
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
                        onClick: this.handleStartNewSession,
                    }}
                    onLinkClick={() => {}} // Required prop, but not used for error boundary
                />
            );
        }

        return this.props.children;
    }
}
