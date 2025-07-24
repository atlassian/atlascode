import React from 'react';

import { mdParser } from '../common/common';
import { DefaultMessage } from '../utils';

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    index: number;
}> = ({ msg, index }) => {
    const messageTypeStyles = msg.source === 'User' ? 'user-message' : 'agent-message';

    const content = (
        <div
            style={{ display: 'flex', flexDirection: 'column' }}
            key="parsed-content"
            dangerouslySetInnerHTML={{ __html: mdParser.render(msg.text || '') }}
        />
    );

    return (
        <div key={index} className={`chat-message ${messageTypeStyles}`}>
            <div className="message-content">{content}</div>
        </div>
    );
};
