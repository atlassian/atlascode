import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CopyIcon from '@atlaskit/icon/core/copy';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import Tooltip from '@atlaskit/tooltip';
import React, { useCallback, useState } from 'react';

import { MarkedDown, OpenFileFunc } from '../common/common';
import { PromptContextCollection } from '../prompt-box/promptContext/promptContextCollection';
import { DefaultMessage } from '../utils';

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    icon?: React.ReactNode;
    enableActions?: boolean;
    onCopy?: (text: string) => void;
    onFeedback?: (isPositive: boolean) => void;
    openFile?: OpenFileFunc;
}> = ({ msg, icon, enableActions, onCopy, onFeedback, openFile }) => {
    const [isCopied, setIsCopied] = useState(false);
    const messageTypeStyles = msg.source === 'User' ? 'user-message' : 'agent-message';

    const handleCopyClick = useCallback(() => {
        if (onCopy && msg.text) {
            onCopy(msg.text);
            setIsCopied(true);
            // Reset the copied state and remove the check icon after 2 seconds
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }
    }, [onCopy, msg.text]);

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
                    <PromptContextCollection
                        content={msg.context}
                        direction="column"
                        align="right"
                        inChat={true}
                        openFile={openFile}
                    />
                </div>
            )}
            {msg.source === 'RovoDev' && enableActions && (
                <div className="chat-message-actions">
                    <Tooltip content="Helpful">
                        <button
                            onClick={() => onFeedback?.(true)}
                            aria-label="like-response-button"
                            className="chat-message-action"
                        >
                            <ThumbsUpIcon label="thumbs-up" spacing="none" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Unhelpful">
                        <button
                            onClick={() => onFeedback?.(false)}
                            aria-label="dislike-response-button"
                            className="chat-message-action"
                        >
                            <ThumbsDownIcon label="thumbs-down" spacing="none" />
                        </button>
                    </Tooltip>
                    <Tooltip key={isCopied ? 'copied' : 'copy'} content={isCopied ? 'Copied!' : 'Copy response'}>
                        <button
                            aria-label="copy-button"
                            className={`chat-message-action copy-button ${isCopied ? 'copied' : ''}`}
                            onClick={handleCopyClick}
                        >
                            {isCopied ? (
                                <CheckCircleIcon label="Copied!" spacing="none" />
                            ) : (
                                <CopyIcon label="Copy button" spacing="none" />
                            )}
                        </button>
                    </Tooltip>
                </div>
            )}
        </>
    );
};
