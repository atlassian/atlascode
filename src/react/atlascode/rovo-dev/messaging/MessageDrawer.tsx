import ChevronDown from '@atlaskit/icon/glyph/chevron-down';
import ChevronRight from '@atlaskit/icon/glyph/chevron-right';
import React from 'react';

import { OpenFileFunc, renderChatHistory } from '../common/common';
import { ToolCallItem } from '../tools/ToolCallItem';
import { ChatMessage, ToolCallMessage } from '../utils';

interface MessageDrawerProps {
    messages: ChatMessage[];
    renderProps: {
        openFile: OpenFileFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
        getOriginalText: (fp: string, lr?: number[]) => Promise<string>;
    };
    opened?: boolean;
    pendingToolCall?: ToolCallMessage;
}

export const MessageDrawer: React.FC<MessageDrawerProps> = ({
    messages,
    renderProps: { openFile, isRetryAfterErrorButtonEnabled, retryPromptAfterError, getOriginalText },
    opened,
    pendingToolCall,
}) => {
    const [isOpen, setIsOpen] = React.useState(opened || false);

    return (
        <div className="message-drawer">
            <div className="message-drawer-header" onClick={() => setIsOpen(!isOpen)}>
                <div>
                    <span>Thinking</span>
                </div>
                <div>{isOpen ? <ChevronDown label="" size="medium" /> : <ChevronRight label="" size="medium" />}</div>
            </div>
            <div hidden={!isOpen} className="message-drawer-content">
                {messages.map((msg, index) =>
                    renderChatHistory(
                        msg,
                        index,
                        openFile,
                        isRetryAfterErrorButtonEnabled,
                        retryPromptAfterError,
                        getOriginalText,
                    ),
                )}
            </div>
            {pendingToolCall && <ToolCallItem msg={pendingToolCall} />}
        </div>
    );
};
