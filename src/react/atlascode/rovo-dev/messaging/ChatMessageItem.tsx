import CopyIcon from '@atlaskit/icon/core/copy';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import React from 'react';

import { mdParser } from '../common/common';
import { PromptContextCollection } from '../prompt-box/promptContext/promptContextCollection';
import { DefaultMessage } from '../utils';

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    icon?: React.ReactNode;
    enableActions?: boolean;
    onCopy?: (text: string) => void;
}> = ({ msg, icon, enableActions, onCopy }) => {
    const messageTypeStyles = msg.source === 'User' ? 'user-message' : 'agent-message';
    const content = (
        <div
            style={{ display: 'flex', flexDirection: 'column' }}
            dangerouslySetInnerHTML={{ __html: mdParser.render(msg.text || '') }}
        />
    );

    return (
        <>
            <div
                className={`chat-message ${messageTypeStyles}`}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}
            >
                {icon && <div className="message-icon">{icon}</div>}
                <div className="message-content">{content}</div>
            </div>
            {msg.source === 'User' && msg.context && (
                <div className="message-context">
                    <PromptContextCollection content={msg.context} direction="column" align="right" inChat={true} />
                </div>
            )}
            {msg.source === 'RovoDev' && enableActions && (
                <div className="chat-message-actions">
                    <button aria-label="like-response-button" title="Helpful" className="chat-message-action">
                        <ThumbsUpIcon label="thumbs-up" />
                    </button>
                    <button aria-label="dislike-response-button" title="Unhelpful" className="chat-message-action">
                        <ThumbsDownIcon label="thumbs-down" />
                    </button>
                    <button
                        aria-label="copy-button"
                        title="Copy response"
                        className="chat-message-action"
                        onClick={() => {
                            onCopy && onCopy(msg.text || '');
                        }}
                    >
                        <CopyIcon label="Copy button" />
                    </button>
                </div>
            )}
        </>
    );
};
