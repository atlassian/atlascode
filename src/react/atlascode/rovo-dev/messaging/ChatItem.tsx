import React from 'react';
import { ToolPermissionChoice } from 'src/rovo-dev/rovoDevApiClientInterfaces';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { CheckFileExistsFunc, OpenFileFunc } from '../common/common';
import { DialogMessageItem } from '../common/DialogMessage';
import { PullRequestChatItem } from '../create-pr/PullRequestForm';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { parseToolReturnMessage, Response } from '../utils';
import { ChatMessageItem } from './ChatMessageItem';
import { MessageDrawer } from './MessageDrawer';

interface ChatItemProps {
    block: Response;
    handleCopyResponse: (content: string) => void;
    handleFeedbackTrigger: (isPositive: boolean) => void;
    onToolPermissionChoice: (toolCallId: string, choice: ToolPermissionChoice) => void;
    onCollapsiblePanelExpanded: () => void;
    renderProps: {
        openFile: OpenFileFunc;
        checkFileExists: CheckFileExistsFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
    };
    currentState: State;
    drawerOpen: boolean;
    onLinkClick: (href: string) => void;
}

export const ChatItem = React.memo<ChatItemProps>(
    ({
        block,
        handleCopyResponse,
        handleFeedbackTrigger,
        onToolPermissionChoice,
        onCollapsiblePanelExpanded,
        renderProps,
        currentState,
        drawerOpen,
        onLinkClick,
    }) => {
        if (!block) {
            return null;
        }

        if (Array.isArray(block)) {
            return (
                <MessageDrawer
                    messages={block}
                    opened={drawerOpen}
                    renderProps={renderProps}
                    onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                />
            );
        } else if (block.event_kind === '_RovoDevUserPrompt' || block.event_kind === 'text') {
            return (
                <ChatMessageItem
                    msg={block}
                    enableActions={block.event_kind === 'text' && currentState.state === 'WaitingForPrompt'}
                    onCopy={handleCopyResponse}
                    onFeedback={handleFeedbackTrigger}
                    openFile={renderProps.openFile}
                    onLinkClick={onLinkClick}
                />
            );
        } else if (block.event_kind === 'tool-return') {
            const parsedMessages = parseToolReturnMessage(block);

            return parsedMessages.map((message) => {
                if (message.technicalPlan) {
                    return (
                        <TechnicalPlanComponent
                            content={message.technicalPlan}
                            openFile={renderProps.openFile}
                            checkFileExists={renderProps.checkFileExists}
                        />
                    );
                }
                return <ToolReturnParsedItem msg={message} openFile={renderProps.openFile} />;
            });
        } else if (block.event_kind === '_RovoDevDialog') {
            return (
                <DialogMessageItem
                    msg={block}
                    isRetryAfterErrorButtonEnabled={renderProps.isRetryAfterErrorButtonEnabled}
                    retryAfterError={renderProps.retryPromptAfterError}
                    onToolPermissionChoice={onToolPermissionChoice}
                />
            );
        } else if (block.event_kind === '_RovoDevPullRequest') {
            return <PullRequestChatItem msg={block} onLinkClick={onLinkClick} />;
        } else {
            return null;
        }
    },
    (prevProps, nextProps) => {
        const isAppendedMessages = () => {
            if (
                !Array.isArray(prevProps.block) &&
                !Array.isArray(nextProps.block) &&
                prevProps.block &&
                nextProps.block
            ) {
                if (prevProps.block.event_kind === 'text' && nextProps.block.event_kind === 'text') {
                    return prevProps.block.content.length < nextProps.block.content.length;
                }
                return false;
            }
            return false;
        };

        return (
            prevProps.block === nextProps.block &&
            !isAppendedMessages() &&
            prevProps.currentState === nextProps.currentState &&
            prevProps.drawerOpen === nextProps.drawerOpen
        );
    },
);
