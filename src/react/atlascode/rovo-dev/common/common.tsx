import StatusErrorIcon from '@atlaskit/icon/core/error';
import MarkdownIt from 'markdown-it';
import React from 'react';

import { ChatMessageItem } from '../messaging/ChatMessageItem';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ChatMessage, DefaultMessage, parseToolReturnMessage } from '../utils';
import { ErrorMessageItem } from './errorMessage';

export const mdParser = new MarkdownIt({
    html: true,
    breaks: true,
    typographer: true,
    linkify: true,
});

export interface OpenFileFunc {
    (filePath: string, tryShowDiff?: boolean, lineRange?: number[]): void;
}

export const FollowUpActionFooter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
                    return <TechnicalPlanComponent content={message.technicalPlan} openFile={openFile} />;
                }
                return <ToolReturnParsedItem msg={message} openFile={openFile} />;
            });
        case 'RovoDevError':
            return (
                <ErrorMessageItem
                    msg={msg}
                    isRetryAfterErrorButtonEnabled={isRetryAfterErrorButtonEnabled}
                    retryAfterError={retryAfterError}
                />
            );
        case 'RovoDev':
        case 'User':
            return <ChatMessageItem msg={msg} />;
        case 'RovoDevRetry':
            const retryMsg: DefaultMessage = {
                text: msg.content,
                source: 'RovoDev',
            };
            return (
                <ChatMessageItem
                    msg={retryMsg}
                    icon={<StatusErrorIcon color="var(--ds-icon-danger)" label="error-icon" spacing="none" />}
                />
            );
        default:
            return <div>Unknown message type</div>;
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
