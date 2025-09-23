import StatusErrorIcon from '@atlaskit/icon/core/error';
import MarkdownIt from 'markdown-it';
import React from 'react';

import { ChatMessageItem } from '../messaging/ChatMessageItem';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ChatMessage, DefaultMessage, parseToolReturnMessage } from '../utils';
import { ErrorMessageItem } from './errorMessage';

const mdParser = new MarkdownIt({
    html: false,
    breaks: true,
    typographer: true,
    linkify: true,
});

mdParser.linkify.set({ fuzzyLink: false });

// Add a core plugin to mark tokens that are inside lists
mdParser.core.ruler.before('linkify', 'mark_list_tokens', function (state) {
    let listDepth = 0;

    for (let i = 0; i < state.tokens.length; i++) {
        const token = state.tokens[i];

        if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
            listDepth++;
        } else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
            listDepth--;
        } else if (listDepth > 0) {
            // Mark any token that's inside a list
            token.attrSet('data-in-list', 'true');
            if (token.children) {
                // Also mark child tokens
                for (let j = 0; j < token.children.length; j++) {
                    token.children[j].attrSet('data-in-list', 'true');
                }
            }
        }
    }
});

const defaultTextRenderer = mdParser.renderer.rules.text || ((tokens, idx) => tokens[idx].content);
mdParser.renderer.rules.text = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx];
    const content = token.content;

    // Check if this token is marked as being inside a list
    const isInList = token.attrGet && token.attrGet('data-in-list') === 'true';

    if (isInList) {
        return defaultTextRenderer(tokens, idx, options, env, renderer);
    }

    const colonPattern = /^([^:]*:)(.*)$/;
    const match = content.match(colonPattern);

    if (match) {
        const [, boldPart, remainingPart] = match;

        const exceptions = [
            /^https?:/i, // URLs (http:, https:)
            /^ftp:/i, // FTP URLs
            /^file:/i, // File URLs
            /^[a-z]:\\/i, // Windows drive paths (C:\, D:\)
            /\d+:/, // Port numbers (8080:, 3000:)
            /\/\/.*:/, // Any URL-like pattern with ://
            /^[^a-zA-Z]*$/, // Only symbols/numbers (no letters)
        ];

        const isException = exceptions.some((pattern) => pattern.test(boldPart));

        if (boldPart.length <= 100 && boldPart.trim().length > 0 && !isException && /[a-zA-Z]/.test(boldPart)) {
            return `<strong>${boldPart}</strong>${remainingPart}`;
        }
    }

    return defaultTextRenderer(tokens, idx, options, env, renderer);
};

export const MarkedDown: React.FC<{ value: string }> = ({ value }) => {
    // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- necessary to apply MarkDown formatting
    return <span dangerouslySetInnerHTML={{ __html: mdParser.render(value) }} />;
};

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
