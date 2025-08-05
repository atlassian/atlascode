import StatusErrorIcon from '@atlaskit/icon/core/error';
import MarkdownIt from 'markdown-it';
import React from 'react';

import { ChatMessageItem } from '../messaging/ChatMessageItem';
import { chatMessageStyles, errorMessageStyles, inChatButtonStyles, messageContentStyles } from '../rovoDevViewStyles';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ChatMessage, DefaultMessage, ErrorMessage, parseToolReturnMessage } from '../utils';

export const mdParser = new MarkdownIt({
    html: true,
    breaks: true,
    typographer: true,
});

export interface OpenFileFunc {
    (filePath: string, tryShowDiff?: boolean, lineRange?: number[]): void;
}

export const ErrorMessageItem: React.FC<{
    msg: ErrorMessage;
    index: number;
    isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
    retryAfterError: () => void;
}> = ({ msg, index, isRetryAfterErrorButtonEnabled, retryAfterError }) => {
    const content = (
        <div
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            key="parsed-content"
            dangerouslySetInnerHTML={{ __html: mdParser.render(msg.text || '') }}
        />
    );

    return (
        <div key={index} style={{ ...chatMessageStyles, ...errorMessageStyles }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div style={{ padding: '4px', color: 'var(--vscode-editorError-foreground)' }}>
                    <StatusErrorIcon label="Rovo Dev encountered an error" />
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
                    <div style={messageContentStyles}>Rovo Dev encountered an error</div>
                    <div style={messageContentStyles}>{content}</div>
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

export const FollowUpActionFooter: React.FC<{}> = ({ children }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: '8px',
                marginBottom: '8px',
            }}
        >
            {children}
        </div>
    );
};

export const renderChatHistory = (
    msg: ChatMessage,
    index: number,
    openFile: OpenFileFunc,
    isRetryAfterErrorButtonEnabled: (uid: string) => boolean,
    retryAfterError: () => void,
) => {
    switch (msg.source) {
        case 'ToolReturn':
            const parsedMessages = parseToolReturnMessage(msg);
            return parsedMessages.map((message) => {
                if (message.technicalPlan) {
                    return <TechnicalPlanComponent key={index} content={message.technicalPlan} openFile={openFile} />;
                }
                return <ToolReturnParsedItem key={index} msg={message} openFile={openFile} />;
            });
        case 'RovoDevError':
            return (
                <ErrorMessageItem
                    index={index}
                    msg={msg}
                    isRetryAfterErrorButtonEnabled={isRetryAfterErrorButtonEnabled}
                    retryAfterError={retryAfterError}
                />
            );
        case 'RovoDev':
        case 'User':
            return <ChatMessageItem index={index} msg={msg} />;
        case 'RovoDevRetry':
            const retryMsg: DefaultMessage = {
                text: 'Unable to process the request ' + '`' + msg.tool_name + '`',
                source: 'RovoDev',
            };
            return (
                <ChatMessageItem
                    index={index}
                    msg={retryMsg}
                    icon={<StatusErrorIcon color="var(--ds-icon-danger)" label="error-icon" spacing="none" />}
                />
            );
        default:
            return <div key={index}>Unknown message type</div>;
    }
};

export const FileLozenge: React.FC<{ filePath: string; openFile?: OpenFileFunc }> = ({ filePath, openFile }) => {
    const fileTitle = filePath ? filePath.match(/([^/\\]+)$/)?.[0] : undefined;

    return (
        <div onClick={() => openFile && openFile(filePath)} className="file-lozenge">
            <span className="file-path">{fileTitle || filePath}</span>
        </div>
    );
};
