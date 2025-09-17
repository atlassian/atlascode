import ChevronDown from '@atlaskit/icon/glyph/chevron-down';
import ChevronRight from '@atlaskit/icon/glyph/chevron-right';
import React, { useCallback } from 'react';

import { CheckFileExistsFunc, OpenFileFunc, renderChatHistory } from '../common/common';
import { ChatMessage } from '../utils';

interface MessageDrawerProps {
    messages: ChatMessage[];
    renderProps: {
        openFile: OpenFileFunc;
        checkFileExists: CheckFileExistsFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
    };
    opened: boolean;
    onCollapsiblePanelExpanded: () => void;
}

export const MessageDrawer: React.FC<MessageDrawerProps> = ({
    messages,
    renderProps: { openFile, checkFileExists, isRetryAfterErrorButtonEnabled, retryPromptAfterError },
    onCollapsiblePanelExpanded,
    opened,
}) => {
    const [isOpen, setIsOpen] = React.useState(opened);

    // Sync internal state when `opened` prop changes
    React.useEffect(() => {
        setIsOpen(opened);
    }, [opened]);

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
                        checkFileExists,
                        isRetryAfterErrorButtonEnabled,
                        retryPromptAfterError,
                    ),
                )}
            </div>
        </div>
    );
};
