import * as React from 'react';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';
import { ConnectionTimeout } from 'src/util/time';

import { useMessagingApi } from '../../messagingApi';
import { ErrorMessageItem, FollowUpActionFooter, OpenFileFunc } from '../common/common';
import { PullRequestChatItem, PullRequestForm } from '../create-pr/PullRequestForm';
import { RovoDevLanding } from '../rovoDevLanding';
import { State } from '../rovoDevView';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';
import { CodePlanButton } from '../technical-plan/CodePlanButton';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolCallItem } from '../tools/ToolCallItem';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import {
    ChatMessage,
    DefaultMessage,
    MessageBlockDetails,
    parseToolReturnMessage,
    scrollToEnd,
    ToolReturnParseResult,
} from '../utils';
import { ChatMessageItem } from './ChatMessageItem';
import { MessageDrawer } from './MessageDrawer';

interface ChatStreamProps {
    chatHistory: MessageBlockDetails[];
    currentThinking: ChatMessage[];
    currentMessage: DefaultMessage | null;
    renderProps: {
        openFile: OpenFileFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
    };
    messagingApi: ReturnType<
        typeof useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>
    >;
    modifiedFiles: ToolReturnParseResult[];
    pendingToolCall: string;
    deepPlanCreated: boolean;
    executeCodePlan: () => void;
    state: State;
    onChangesGitPushed: (msg: DefaultMessage, pullRequestCreated: boolean) => void;
    onCollapsiblePanelExpanded: () => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
    chatHistory,
    currentThinking,
    currentMessage,
    renderProps,
    pendingToolCall,
    deepPlanCreated,
    executeCodePlan,
    state,
    messagingApi,
    modifiedFiles,
    onChangesGitPushed,
    onCollapsiblePanelExpanded,
}) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const prevChatHistoryLengthRef = React.useRef(chatHistory.length);
    const [canCreatePR, setCanCreatePR] = React.useState(false);
    const [hasChangesInGit, setHasChangesInGit] = React.useState(false);
    const [isFormVisible, setIsFormVisible] = React.useState(false);

    const checkGitChanges = React.useCallback(async () => {
        const response = await messagingApi.postMessagePromise(
            { type: RovoDevViewResponseType.CheckGitChanges },
            RovoDevProviderMessageType.CheckGitChangesComplete,
            ConnectionTimeout,
        );
        setHasChangesInGit(response.hasChanges);
    }, [messagingApi]);

    const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true);

    // Helper to perform auto-scroll when enabled
    const performAutoScroll = React.useCallback(() => {
        if (autoScrollEnabled && chatEndRef.current) {
            scrollToEnd(chatEndRef.current);
        }
    }, [autoScrollEnabled]);

    // Combined scroll tracking, intersection observer, and user message detection
    React.useEffect(() => {
        const container = chatEndRef.current;
        if (!container) {
            return;
        }

        let lastScrollTop = 0;
        let scrollEvents: { timestamp: number; delta: number }[] = [];
        const SCROLL_ACCUMULATION_WINDOW = 500; // 500ms window

        const cleanupOldScrollEvents = () => {
            const currentTime = Date.now();
            const cutoffTime = currentTime - SCROLL_ACCUMULATION_WINDOW;
            while (scrollEvents.length > 0 && scrollEvents[0].timestamp < cutoffTime) {
                scrollEvents.shift();
            }
        };

        const getAccumulatedScrollDirection = () => {
            cleanupOldScrollEvents();
            const totalDelta = scrollEvents.reduce((sum, event) => sum + event.delta, 0);
            return totalDelta;
        };

        // Intersection observer to detect when user scrolls back to bottom
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Only re-enable auto-scroll if the user is not scrolling up & sentinel is intersecting
                if (entry.isIntersecting && getAccumulatedScrollDirection() >= 0) {
                    setAutoScrollEnabled(true);
                }
            },
            { threshold: 0, rootMargin: '0px' },
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        const handleUserScroll = (event: Event) => {
            const currentScrollTop = (event.target as HTMLElement).scrollTop;
            // Add scroll event to our tracking array
            scrollEvents.push({ timestamp: Date.now(), delta: currentScrollTop - lastScrollTop });

            // If overall direction is upward (negative delta), disable auto-scroll
            if (getAccumulatedScrollDirection() < 0) {
                setAutoScrollEnabled(false);
            }

            lastScrollTop = currentScrollTop;
        };

        const handleWheel = (event: WheelEvent) => {
            // Add wheel event to our tracking array (deltaY positive = scrolling down, negative = scrolling up)
            scrollEvents.push({ timestamp: Date.now(), delta: event.deltaY });

            // If overall direction is upward (negative delta), disable auto-scroll
            if (getAccumulatedScrollDirection() < 0) {
                setAutoScrollEnabled(false);
            }
        };

        // Check for NEW user messages and enable auto-scroll
        if (chatHistory.length > prevChatHistoryLengthRef.current) {
            const newMessage = chatHistory[chatHistory.length - 1];
            // Check if the new message is a user message (not an array of thinking messages)
            if (!Array.isArray(newMessage) && newMessage?.source === 'User') {
                setAutoScrollEnabled(true);
                // Clear scroll events to reset direction tracking when user sends a message
                scrollEvents = [];
            }
        }
        prevChatHistoryLengthRef.current = chatHistory.length;

        container.addEventListener('scroll', handleUserScroll, { passive: true });
        container.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            observer.disconnect();
            container.removeEventListener('scroll', handleUserScroll);
            container.removeEventListener('wheel', handleWheel);
        };
    }, [autoScrollEnabled, chatHistory]);

    // Auto-scroll when content changes or when re-enabled
    React.useEffect(performAutoScroll, [
        chatHistory,
        currentThinking,
        currentMessage,
        isFormVisible,
        pendingToolCall,
        autoScrollEnabled,
        performAutoScroll,
    ]);

    // Other state management effect
    React.useEffect(() => {
        if (state === State.WaitingForPrompt) {
            setCanCreatePR(true);
            if (currentMessage) {
                // Only check git changes if there's something in the chat
                checkGitChanges();
            }
        }
    }, [state, chatHistory, currentThinking, currentMessage, isFormVisible, pendingToolCall, checkGitChanges]);

    return (
        <div ref={chatEndRef} className="chat-message-container">
            <RovoDevLanding />
            {chatHistory &&
                chatHistory.map((block, idx) => {
                    if (block) {
                        if (Array.isArray(block)) {
                            return (
                                <MessageDrawer
                                    messages={block}
                                    opened={false}
                                    renderProps={renderProps}
                                    onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                                />
                            );
                        } else if (block.source === 'User' || block.source === 'RovoDev') {
                            return <ChatMessageItem msg={block} />;
                        } else if (block.source === 'ToolReturn') {
                            const parsedMessages = parseToolReturnMessage(block);

                            return parsedMessages.map((message) => {
                                if (message.technicalPlan) {
                                    return (
                                        <TechnicalPlanComponent
                                            content={message.technicalPlan}
                                            openFile={renderProps.openFile}
                                        />
                                    );
                                }
                                return <ToolReturnParsedItem msg={message} openFile={renderProps.openFile} />;
                            });
                        } else if (block.source === 'RovoDevError') {
                            return (
                                <ErrorMessageItem
                                    msg={block}
                                    index={idx}
                                    isRetryAfterErrorButtonEnabled={renderProps.isRetryAfterErrorButtonEnabled}
                                    retryAfterError={renderProps.retryPromptAfterError}
                                />
                            );
                        } else if (block.source === 'PullRequest') {
                            return <PullRequestChatItem msg={block} />;
                        }
                    }

                    return null;
                })}
            {currentThinking.length > 0 && (
                <MessageDrawer
                    messages={currentThinking}
                    opened={true}
                    renderProps={renderProps}
                    onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                />
            )}
            {currentMessage && <ChatMessageItem msg={currentMessage} />}

            {pendingToolCall && (
                <div style={{ marginBottom: '16px' }}>
                    <ToolCallItem toolMessage={pendingToolCall} />
                </div>
            )}

            {state === State.WaitingForPrompt && (
                <FollowUpActionFooter>
                    {deepPlanCreated && (
                        <CodePlanButton execute={executeCodePlan} disabled={state !== State.WaitingForPrompt} />
                    )}
                    {canCreatePR && !deepPlanCreated && hasChangesInGit && (
                        <PullRequestForm
                            onCancel={() => {
                                setCanCreatePR(false);
                                setIsFormVisible(false);
                            }}
                            messagingApi={messagingApi}
                            onPullRequestCreated={(url) => {
                                setCanCreatePR(false);
                                setIsFormVisible(false);

                                const pullRequestCreated = !!url;
                                onChangesGitPushed(
                                    {
                                        source: 'PullRequest',
                                        text: url
                                            ? `Pull request ready: ${url}`
                                            : 'Successfully pushed changes to the remote repository.',
                                    },
                                    pullRequestCreated,
                                );
                            }}
                            isFormVisible={isFormVisible}
                            setFormVisible={setIsFormVisible}
                        />
                    )}
                </FollowUpActionFooter>
            )}
            <div id="sentinel" ref={sentinelRef} style={{ height: '10px', width: '100%', pointerEvents: 'none' }} />
        </div>
    );
};
