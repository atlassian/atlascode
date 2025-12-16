import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import React from 'react';
import { ToolPermissionChoice } from 'src/rovo-dev/client';

import { CheckFileExistsFunc, OpenFileFunc, OpenJiraFunc } from '../common/common';
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
        openJira: OpenJiraFunc;
        checkFileExists: CheckFileExistsFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
        onOpenLogFile: () => void;
    };
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
                    onLinkClick={onLinkClick}
                />
            );
        } else if (block.event_kind === '_RovoDevUserPrompt' || block.event_kind === 'text') {
            return (
                <ChatMessageItem
                    msg={block}
                    enableActions={block.event_kind === 'text' && block.isSummary === true}
                    onCopy={handleCopyResponse}
                    onFeedback={handleFeedbackTrigger}
                    openFile={renderProps.openFile}
                    openJira={renderProps.openJira}
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
                            onLinkClick={onLinkClick}
                            checkFileExists={renderProps.checkFileExists}
                        />
                    );
                }
                return <ToolReturnParsedItem msg={message} openFile={renderProps.openFile} onLinkClick={onLinkClick} />;
            });
        } else if (block.event_kind === '_RovoDevDialog') {
            let customButton: { text: string; onClick: () => void } | undefined = undefined;
            if (block.ctaLink) {
                const { text, link } = block.ctaLink;
                customButton = {
                    text,
                    onClick: () => onLinkClick(link),
                };
            }

            return (
                <DialogMessageItem
                    msg={block}
                    isRetryAfterErrorButtonEnabled={renderProps.isRetryAfterErrorButtonEnabled}
                    retryAfterError={renderProps.retryPromptAfterError}
                    onToolPermissionChoice={onToolPermissionChoice}
                    customButton={customButton}
                    onOpenLogFile={renderProps.onOpenLogFile}
                    onLinkClick={onLinkClick}
                />
            );
        } else if (block.event_kind === '_RovoDevPullRequest') {
            return <PullRequestChatItem msg={block} onLinkClick={onLinkClick} />;
        } else if (block.event_kind === 'retry-prompt') {
            return (
                <ChatMessageItem
                    icon={<CrossCircleIcon label="Retry prompt" />}
                    msg={{ event_kind: 'text', content: block.content, index: -1 }}
                    openFile={renderProps.openFile}
                    openJira={renderProps.openJira}
                    onLinkClick={onLinkClick}
                />
            );
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
            prevProps.drawerOpen === nextProps.drawerOpen
        );
    },
);
