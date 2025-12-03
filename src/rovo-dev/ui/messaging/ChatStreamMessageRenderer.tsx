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
            // Find the last user prompt to identify the current generation
            const lastUserPromptIdx = chatHistory.findLastIndex(
                (msg) => !Array.isArray(msg) && msg?.event_kind === '_RovoDevUserPrompt',
            );

            // Only consider drawer that come after the last user prompt
            const lastArrayIdx = chatHistory.findLastIndex((msg, idx) => {
                if (!Array.isArray(msg)) {
                    return false;
                }

                return lastUserPromptIdx === -1 || idx > lastUserPromptIdx;
            });
            return lastArrayIdx;
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
