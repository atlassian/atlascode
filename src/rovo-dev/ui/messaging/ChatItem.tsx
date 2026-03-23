import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import React from 'react';
import { ToolPermissionChoice } from 'src/rovo-dev/client';

import { CheckFileExistsFunc, OpenFileFunc, OpenJiraFunc } from '../common/common';
import { DialogMessageItem } from '../common/DialogMessage';
import { PullRequestChatItem } from '../create-pr/PullRequestForm';
import { GroupedOpenFilePill, ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ToDoList } from '../tools/ToDoList';
import { parseToolReturnMessage, Response, ToolReturnParseResult } from '../utils';
import { ChatMessageItem } from './ChatMessageItem';
import { MessageDrawer } from './MessageDrawer';

/** Group consecutive "Opened file" pills into a single GroupedOpenFilePill */
function renderToolReturnMessages(
    messages: ToolReturnParseResult[],
    openFile: OpenFileFunc,
    onLinkClick: (href: string) => void,
): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    let openGroup: ToolReturnParseResult[] = [];
    let groupKey = 0;

    const flushOpenGroup = () => {
        if (openGroup.length > 0) {
            const key = `open-group-${groupKey++}`;
            result.push(<GroupedOpenFilePill key={key} msgs={openGroup} openFile={openFile} />);
            openGroup = [];
        }
    };

    messages.forEach((msg, i) => {
        if (msg.content === 'Opened file' && msg.type === 'open') {
            openGroup.push(msg);
        } else {
            flushOpenGroup();
            result.push(
                <ToolReturnParsedItem key={i} msg={msg} openFile={openFile} onLinkClick={onLinkClick} />,
            );
        }
    });

    flushOpenGroup();
    return result;
}

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
        onRestartProcess: () => void;
        onError: (error: Error, errorMessage: string) => void;
    };
    drawerOpen: boolean;
    onLinkClick: (href: string) => void;
    deepPlanCreated?: string | null;
    onGeneratePlanClick?: (planId: string, proceed: boolean) => void;
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
        deepPlanCreated,
        onGeneratePlanClick,
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
        } else if (
            block.event_kind === '_RovoDevUserPrompt' ||
            block.event_kind === 'text' ||
            block.event_kind === '_RovoDevExitPlanMode'
        ) {
            return (
                <ChatMessageItem
                    msg={block}
                    enableActions={
                        (block.event_kind === 'text' && block.isSummary === true) ||
                        block.event_kind === '_RovoDevExitPlanMode'
                    }
                    onCopy={handleCopyResponse}
                    onFeedback={handleFeedbackTrigger}
                    openFile={renderProps.openFile}
                    openJira={renderProps.openJira}
                    onLinkClick={onLinkClick}
                    deepPlanCreated={deepPlanCreated}
                    onGeneratePlanClick={onGeneratePlanClick}
                />
            );
        } else if (block.event_kind === 'tool-return') {
            const parsedMessages = parseToolReturnMessage(block, renderProps.onError);

            return renderToolReturnMessages(parsedMessages, renderProps.openFile, onLinkClick);
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
                    onRestartProcess={renderProps.onRestartProcess}
                    onToolPermissionChoice={onToolPermissionChoice}
                    customButton={customButton}
                    onLinkClick={onLinkClick}
                />
            );
        } else if (block.event_kind === 'update_todo') {
            return (
                <div className="tool-return-item-base tool-return-item tool-return-update-todo">
                    <i className="codicon codicon-checklist" />
                    <div className="tool-return-update-todo-content">
                        {block.todos && block.todos.length > 0 ? (
                            <ToDoList todos={block.todos} />
                        ) : (
                            <span className="tool-return-path">Updated To-Do list</span>
                        )}
                    </div>
                </div>
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
            prevProps.drawerOpen === nextProps.drawerOpen &&
            prevProps.deepPlanCreated === nextProps.deepPlanCreated
        );
    },
);
