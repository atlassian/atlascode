import PullRequestIcon from '@atlaskit/icon/core/pull-request';
import React from 'react';

import { MarkedDown } from '../common/common';
import { PullRequestMessage } from '../utils';

export const PullRequestChatItem: React.FC<{ msg: PullRequestMessage; onLinkClick: (href: string) => void }> = ({
    msg,
    onLinkClick,
}) => {
    const content = (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <MarkedDown value={msg.text || ''} onLinkClick={onLinkClick} />
        </div>
    );
    return (
        <div className="chat-message pull-request-chat-item agent-message">
            <PullRequestIcon label="pull-request-icon" spacing="none" />
            <div className="message-content">{content}</div>
        </div>
    );
};
