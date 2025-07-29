import ChevronDown from '@atlaskit/icon/glyph/chevron-down';
import ChevronRight from '@atlaskit/icon/glyph/chevron-right';
import React, { useCallback } from 'react';

import { OpenFileFunc, renderChatHistory } from '../common/common';
import { ToolCallItem } from '../tools/ToolCallItem';
import { ChatMessage } from '../utils';

interface MessageDrawerProps {
    messages: ChatMessage[];
    renderProps: {
        openFile: OpenFileFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
        getOriginalText: (fp: string, lr?: number[]) => Promise<string>;
    };
    onCollapsiblePanelExpanded: () => void;
    opened: boolean;
    pendingToolCall?: string;
}

export const MessageDrawer: React.FC<MessageDrawerProps> = ({
    messages,
    renderProps: { openFile, isRetryAfterErrorButtonEnabled, retryPromptAfterError, getOriginalText },
    onCollapsiblePanelExpanded,
    opened,
    pendingToolCall,
}) => {
    const [isOpen, setIsOpen] = React.useState(opened);

    const openDrawer = useCallback(
        (value: boolean) => {
            setIsOpen(value);
            if (value) {
                onCollapsiblePanelExpanded();
            }
        },
        [setIsOpen, onCollapsiblePanelExpanded],
    );

    return (
        <div className="message-drawer">
            <div className="message-drawer-header" onClick={() => openDrawer(!isOpen)}>
                <div className="message-drawer-title">
                    <span>Thinking</span>
                    <div className="message-drawer-lozenge">{messages.length}</div>
                </div>
                <div>
                    {isOpen ? (
                        <ChevronDown label="chevron-down" size="medium" />
                    ) : (
                        <ChevronRight label="chevron-right" size="medium" />
                    )}
                </div>
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
            {pendingToolCall && <ToolCallItem toolMessage={pendingToolCall} />}
        </div>
    );
};
