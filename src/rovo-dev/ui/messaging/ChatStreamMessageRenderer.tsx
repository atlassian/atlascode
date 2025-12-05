import React from 'react';
import { ToolPermissionChoice } from 'src/rovo-dev/client';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { CheckFileExistsFunc, OpenFileFunc, OpenJiraFunc } from '../common/common';
import { Response } from '../utils';
import { ChatItem } from './ChatItem';

interface ChatStreamMessageRendererProps {
    chatHistory: Response[];
    currentState: State;
    handleCopyResponse: (content: string) => void;
    handleFeedbackTrigger: (isPositive: boolean) => void;
    renderProps: {
        openFile: OpenFileFunc;
        openJira: OpenJiraFunc;
        checkFileExists: CheckFileExistsFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
        onOpenLogFile: () => void;
    };
    onToolPermissionChoice: (toolCallId: string, choice: ToolPermissionChoice) => void;
    onCollapsiblePanelExpanded: () => void;
    onLinkClick: (href: string) => void;
}

export const ChatStreamMessageRenderer = React.memo<ChatStreamMessageRendererProps>(
    ({
        chatHistory,
        currentState,
        handleCopyResponse,
        handleFeedbackTrigger,
        onToolPermissionChoice,
        onCollapsiblePanelExpanded,
        renderProps,
        onLinkClick,
    }) => {
        if (!chatHistory) {
            return null;
        }

        const openDrawerIdx = React.useMemo(() => {
            if (currentState.state === 'WaitingForPrompt') {
                return -1;
            }

            const msgIdx = chatHistory.findLastIndex(
                (msg) => Array.isArray(msg) || msg?.event_kind === '_RovoDevUserPrompt',
            );

            const msg = chatHistory[msgIdx];
            if (msgIdx === -1 || (!Array.isArray(msg) && msg?.event_kind === '_RovoDevUserPrompt')) {
                return -1;
            }

            return msgIdx;
        }, [chatHistory, currentState.state]);

        return chatHistory.map((block, idx) => {
            if (!block) {
                return null;
            }
            const key = Array.isArray(block) ? `thinking-${idx}-${block.length}` : `${block.event_kind}-${idx}`;

            return (
                <ChatItem
                    key={key}
                    block={block}
                    handleCopyResponse={handleCopyResponse}
                    handleFeedbackTrigger={handleFeedbackTrigger}
                    onToolPermissionChoice={onToolPermissionChoice}
                    onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                    renderProps={renderProps}
                    drawerOpen={idx === openDrawerIdx}
                    onLinkClick={onLinkClick}
                />
            );
        });
    },
    (prevProps, nextProps) =>
        prevProps.chatHistory === nextProps.chatHistory &&
        prevProps.currentState === nextProps.currentState &&
        prevProps.handleCopyResponse === nextProps.handleCopyResponse &&
        prevProps.handleFeedbackTrigger === nextProps.handleFeedbackTrigger &&
        prevProps.onToolPermissionChoice === nextProps.onToolPermissionChoice &&
        prevProps.onCollapsiblePanelExpanded === nextProps.onCollapsiblePanelExpanded &&
        prevProps.renderProps === nextProps.renderProps,
);
