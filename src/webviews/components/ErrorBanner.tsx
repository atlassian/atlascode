import SectionMessage from '@atlaskit/section-message';
import {
    ErrorCollection,
    ErrorWithMessages,
    isErrorCollection,
    isErrorWithMessages,
} from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

export type ErrorDetails =
    | string
    | ErrorCollection
    | ErrorWithMessages
    | { message: string }
    | { title?: string }
    | undefined;

export type ErrorBannerProps = {
    errorDetails: ErrorDetails;
    onDismissError?: () => void;
    onRetry?: () => void;
    onSignIn?: () => void;
};

export default class ErrorBanner extends React.Component<ErrorBannerProps, { errorDetails: ErrorDetails }> {
    constructor(props: ErrorBannerProps) {
        super(props);
        this.state = {
            errorDetails: this.props.errorDetails,
        };
    }

    static getDerivedStateFromProps(nextProps: Partial<ErrorBannerProps>) {
        return {
            errorDetails: nextProps.errorDetails,
        };
    }

    /**
     * Extracts text content from various error formats that Jira API might return
     */
    private extractErrorText(errorDetails: ErrorDetails): string {
        if (!errorDetails) {
            return '';
        }

        // Simple string error
        if (typeof errorDetails === 'string') {
            return errorDetails;
        }

        if (isErrorCollection(errorDetails)) {
            const fieldErrors = Object.values(errorDetails.errors);
            const generalErrors = errorDetails.errorMessages;

            return [...fieldErrors, ...generalErrors].join(' ');
        }

        if (isErrorWithMessages(errorDetails)) {
            return errorDetails.errorMessages.join(' ');
        }

        if ('message' in errorDetails && typeof errorDetails.message === 'string') {
            return errorDetails.message;
        }

        if (typeof errorDetails === 'object') {
            return JSON.stringify(errorDetails);
        }

        return '';
    }

    /**
     * Determines if an error is retryable based on its content
     * Auth/permission errors cannot be retried - user must re-authenticate
     */
    private canRetry(errorDetails: ErrorDetails): boolean {
        if (!errorDetails) {
            return true;
        }

        const errorText = this.extractErrorText(errorDetails).toLowerCase();

        // Don't retry for auth/permission issues
        // Based on real error messages from clientManager.ts, authStore.ts, basicInterceptor.ts
        const authErrorIndicators = [
            '401',
            '403',
            'unauthorized',
            'forbidden',
            'sign in',
            'session has expired',
            'unable to connect',
            'permission',
            'credentials refused',
        ];

        const isAuthError = authErrorIndicators.some((indicator) => errorText.includes(indicator));

        // Return true (can retry) if it's NOT an auth error
        return !isAuthError;
    }

    override render() {
        const errorMarkup = [];
        const errorDetails = this.state.errorDetails;

        if (isErrorCollection(errorDetails)) {
            Object.keys(errorDetails.errors).forEach((key) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <b>{key}:</b>
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {errorDetails.errors[key]}
                        </span>
                    </p>,
                );
            });

            errorDetails.errorMessages.forEach((msg) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {msg}
                        </span>
                    </p>,
                );
            });
        } else if (isErrorWithMessages(errorDetails)) {
            errorDetails.errorMessages.forEach((msg) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {msg}
                        </span>
                    </p>,
                );
            });
        } else if (typeof errorDetails === 'object') {
            Object.keys(errorDetails).forEach((key) => {
                const value = errorDetails[key as keyof typeof errorDetails];
                errorMarkup.push(
                    <p className="force-wrap">
                        <b>{key}:</b>
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {JSON.stringify(value)}
                        </span>
                    </p>,
                );
            });
        } else {
            errorMarkup.push(<p className="force-wrap">{errorDetails}</p>);
        }

        const title: string =
            typeof errorDetails === 'object' && 'title' in errorDetails && errorDetails.title
                ? errorDetails.title
                : 'Something went wrong';
        const canRetry = this.canRetry(this.state.errorDetails);
        const isAuthError = !canRetry;

        const showRetryButton = canRetry && this.props.onRetry;
        const showSignInButton = isAuthError && this.props.onSignIn;

        return (
            <SectionMessage appearance="warning" title={title}>
                <div>{errorMarkup}</div>
                {showRetryButton && <button onClick={this.props.onRetry}>Retry</button>}
                {showSignInButton && <button onClick={this.props.onSignIn}>Sign In</button>}
            </SectionMessage>
        );
    }
}
