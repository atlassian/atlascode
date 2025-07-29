import React from 'react';

import { mdParser } from '../common/common';
import { PromptContextCollection } from '../prompt-box/promptContext/promptContextCollection';
import { DefaultMessage } from '../utils';

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    index?: number;
    icon?: React.ReactNode;
}> = ({ msg, index, icon }) => {
    const messageTypeStyles = msg.source === 'User' ? 'user-message' : 'agent-message';
    const content = (
        <div
            style={{ display: 'flex', flexDirection: 'column' }}
            key="parsed-content"
            dangerouslySetInnerHTML={{ __html: mdParser.render(msg.text || '') }}
        />
    );

    return (
        <>
            <div
                key={index}
                className={`chat-message ${messageTypeStyles}`}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}
            >
                {icon && <div className="message-icon">{icon}</div>}
                <div className="message-content">{content}</div>
            </div>
            {msg.source === 'User' && msg.context && (
                <div className="message-context">
                    <PromptContextCollection content={msg.context} direction="column" align="right" />
                </div>
            )}
        </>
    );
};
