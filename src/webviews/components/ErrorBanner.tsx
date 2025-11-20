import SectionMessage from '@atlaskit/section-message';
import { isErrorCollection, isErrorWithMessages } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

export type ErrorBannerProps = {
    errorDetails: any;
    onDismissError?: () => void;
    onRetry?: () => void;
    onSignIn?: () => void;
};

export default class ErrorBanner extends React.Component<ErrorBannerProps, { errorDetails: any }> {
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
    private extractErrorText(errorDetails: any): string {
        // Simple string error
        if (typeof errorDetails === 'string') {
            return errorDetails;
        }

        if (errorDetails?.message) {
            return errorDetails.message;
        }

        if (isErrorWithMessages(errorDetails)) {
            return errorDetails.errorMessages.join(' ');
        }

        if (isErrorCollection(errorDetails)) {
            const fieldErrors = Object.values(errorDetails.errors);
            const generalErrors = errorDetails.errorMessages;
            return [...fieldErrors, ...generalErrors].join(' ');
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
    private canRetry(errorDetails: any): boolean {
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
        if (isErrorCollection(this.state.errorDetails)) {
            Object.keys(this.state.errorDetails.errors).forEach((key) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <b>{key}:</b>
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {this.state.errorDetails.errors[key]}
                        </span>
                    </p>,
                );
            });

            this.state.errorDetails.errorMessages.forEach((msg) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {msg}
                        </span>
                    </p>,
                );
            });
        } else if (isErrorWithMessages(this.state.errorDetails)) {
            this.state.errorDetails.errorMessages.forEach((msg) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {msg}
                        </span>
                    </p>,
                );
            });
        } else if (typeof this.state.errorDetails === 'object') {
            Object.keys(this.state.errorDetails).forEach((key) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <b>{key}:</b>
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {JSON.stringify(this.state.errorDetails[key])}
                        </span>
                    </p>,
                );
            });
        } else {
            errorMarkup.push(<p className="force-wrap">{this.state.errorDetails}</p>);
        }

        const title: string = this.state.errorDetails.title ? this.state.errorDetails.title : 'Something went wrong';
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
