import StatusErrorIcon from '@atlaskit/icon/core/error';
import StatusInfoIcon from '@atlaskit/icon/core/information';
import StatusWarningIcon from '@atlaskit/icon/core/warning';
import React, { useCallback } from 'react';

import { chatMessageStyles, errorMessageStyles, inChatButtonStyles, messageContentStyles } from '../rovoDevViewStyles';
import { ErrorMessage } from '../utils';

export const ErrorMessageItem: React.FC<{
    msg: ErrorMessage;
    isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
    retryAfterError: () => void;
}> = ({ msg, isRetryAfterErrorButtonEnabled, retryAfterError }) => {
    const getColor = useCallback(() => {
        switch (msg.type) {
            case 'error':
                return 'var(--vscode-editorError-foreground)';
            case 'warning':
                return 'var(--vscode-editorWarning-foreground)';
            case 'info':
                return 'var(--vscode-editorInfo-foreground)';
        }
    }, [msg.type]);

    const getTitle = useCallback(() => {
        switch (msg.type) {
            case 'error':
                return msg.title ?? 'Rovo Dev encountered an error';
            case 'warning':
                return msg.title ?? 'Rovo Dev';
            case 'info':
                return msg.title ?? 'Rovo Dev';
        }
    }, [msg.type, msg.title]);

    return (
        <div style={{ ...chatMessageStyles, ...errorMessageStyles }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div style={{ padding: '4px', color: getColor() }}>
                    {msg.type === 'error' && <StatusErrorIcon label={getTitle()} />}
                    {msg.type === 'warning' && <StatusWarningIcon label={getTitle()} />}
                    {msg.type === 'info' && <StatusInfoIcon label={getTitle()} />}
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingTop: '2px',
                        paddingLeft: '2px',
                        width: '100%',
                    }}
                >
                    <div style={messageContentStyles}>{getTitle()}</div>
                    <div style={messageContentStyles}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{msg.text}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '8px' }}>
                        {msg.isRetriable && isRetryAfterErrorButtonEnabled(msg.uid) && (
                            <RetryPromptButton retryAfterError={retryAfterError} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const RetryPromptButton: React.FC<{
    retryAfterError: () => void;
}> = ({ retryAfterError }) => {
    return (
        <button style={inChatButtonStyles} onClick={retryAfterError}>
            Try again
        </button>
    );
};
