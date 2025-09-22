import CopyIcon from '@atlaskit/icon/core/copy';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import React from 'react';

import { MarkedDown } from '../common/common';
import { PromptContextCollection } from '../prompt-box/promptContext/promptContextCollection';
import { DefaultMessage } from '../utils';

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    icon?: React.ReactNode;
    enableActions?: boolean;
    onCopy?: (text: string) => void;
    onFeedback?: (isPositive: boolean) => void;
}> = ({ msg, icon, enableActions, onCopy, onFeedback }) => {
    const messageTypeStyles = msg.source === 'User' ? 'user-message' : 'agent-message';

    return (
        <>
            <div
                className={`chat-message ${messageTypeStyles}`}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'start', gap: '8px' }}
            >
                {icon && <div className="message-icon">{icon}</div>}
                <div className="message-content">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <MarkedDown value={msg.text || ''} />
                    </div>
                </div>
            </div>
            {msg.source === 'User' && msg.context && (
                <div className="message-context">
                    <PromptContextCollection content={msg.context} direction="column" align="right" inChat={true} />
                </div>
            )}
            {msg.source === 'RovoDev' && enableActions && (
                <div className="chat-message-actions">
                    <button
                        onClick={() => onFeedback && onFeedback(true)}
                        aria-label="like-response-button"
                        title="Helpful"
                        className="chat-message-action"
                    >
                        <ThumbsUpIcon label="thumbs-up" spacing="none" />
                    </button>
                    <button
                        onClick={() => onFeedback && onFeedback(false)}
                        aria-label="dislike-response-button"
                        title="Unhelpful"
                        className="chat-message-action"
                    >
                        <ThumbsDownIcon label="thumbs-down" spacing="none" />
                    </button>
                    <button
                        aria-label="copy-button"
                        title="Copy response"
                        className="chat-message-action"
                        onClick={() => {
                            onCopy && onCopy(msg.text || '');
                        }}
                    >
                        <CopyIcon label="Copy button" spacing="none" />
                    </button>
                </div>
            )}
        </>
    );
};
