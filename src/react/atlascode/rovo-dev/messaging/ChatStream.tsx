import * as React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';
import { ConnectionTimeout } from 'src/util/time';

import { useMessagingApi } from '../../messagingApi';
import { FollowUpActionFooter, OpenFileFunc } from '../common/common';
import { ErrorMessageItem } from '../common/errorMessage';
import { PullRequestChatItem, PullRequestForm } from '../create-pr/PullRequestForm';
import { FeedbackForm, FeedbackType } from '../feedback-form/FeedbackForm';
import { RovoDevLanding } from '../rovoDevLanding';
import { McpConsentChoice, RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';
import { CodePlanButton } from '../technical-plan/CodePlanButton';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolCallItem } from '../tools/ToolCallItem';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { DefaultMessage, parseToolReturnMessage, Response, scrollToEnd } from '../utils';
import { ChatMessageItem } from './ChatMessageItem';
import { MessageDrawer } from './MessageDrawer';

interface ChatStreamProps {
    chatHistory: Response[];
    renderProps: {
        openFile: OpenFileFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
    };
    messagingApi: ReturnType<
        typeof useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>
    >;
    pendingToolCall: string;
    deepPlanCreated: boolean;
    executeCodePlan: () => void;
    currentState: State;
    onChangesGitPushed: (msg: DefaultMessage, pullRequestCreated: boolean) => void;
    onCollapsiblePanelExpanded: () => void;
    feedbackVisible: boolean;
    setFeedbackVisible: (visible: boolean) => void;
    sendFeedback: (feedbackType: FeedbackType, feedack: string, canContact: boolean, lastTenMessages: boolean) => void;
    onLoginClick: () => void;
    onOpenFolder: () => void;
    onMcpChoice: (choice: McpConsentChoice, serverName?: string) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
    chatHistory,
    renderProps,
    pendingToolCall,
    deepPlanCreated,
    executeCodePlan,
    currentState,
    messagingApi,
    onChangesGitPushed,
    onCollapsiblePanelExpanded,
    feedbackVisible = false,
    setFeedbackVisible,
    sendFeedback,
    onLoginClick,
    onOpenFolder,
    onMcpChoice,
}) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const prevChatHistoryLengthRef = React.useRef(chatHistory.length);
    const [canCreatePR, setCanCreatePR] = React.useState(false);
    const [hasChangesInGit, setHasChangesInGit] = React.useState(false);
    const [isFormVisible, setIsFormVisible] = React.useState(false);
    const [feedbackType, setFeedbackType] = React.useState<'like' | 'dislike' | undefined>(undefined);

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
        isFormVisible,
        pendingToolCall,
        autoScrollEnabled,
        performAutoScroll,
    ]);

    // Other state management effect
    React.useEffect(() => {
        if (process.env.ROVODEV_BBY && currentState.state === 'WaitingForPrompt') {
            const canCreatePR = chatHistory.length > 0;
            setCanCreatePR(canCreatePR);
            if (canCreatePR) {
                // Only check git changes if there's something in the chat
                checkGitChanges();
            }
        }
    }, [currentState, chatHistory, isFormVisible, checkGitChanges]);

    const handleCopyResponse = React.useCallback((text: string) => {
        if (!navigator.clipboard) {
            console.warn('Clipboard API not supported');
            return;
        }
        navigator.clipboard.writeText(text);
    }, []);

    const handleFeedbackTrigger = React.useCallback(
        (isPositive: boolean) => {
            setFeedbackType(isPositive ? 'like' : 'dislike');
            setFeedbackVisible(true);
        },
        [setFeedbackVisible],
    );

    const isChatHistoryDisabled =
        (currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance') ||
        (currentState.state === 'Disabled' && currentState.subState !== 'Other');

    const shouldShowToolCall =
        currentState.state !== 'Disabled' &&
        currentState.state !== 'ProcessTerminated' &&
        currentState.state !== 'WaitingForPrompt' &&
        (currentState.state !== 'Initializing' || currentState.isPromptPending);

    return (
        <div ref={chatEndRef} className="chat-message-container">
            <RovoDevLanding
                currentState={currentState}
                onLoginClick={onLoginClick}
                onOpenFolder={onOpenFolder}
                onMcpChoice={onMcpChoice}
            />
            {!isChatHistoryDisabled &&
                chatHistory &&
                chatHistory.map((block, idx) => {
                    const drawerOpen =
                        idx === chatHistory.findLastIndex((msg) => Array.isArray(msg)) &&
                        currentState.state !== 'WaitingForPrompt';

                    if (block) {
                        if (Array.isArray(block)) {
                            return (
                                <MessageDrawer
                                    messages={block}
                                    opened={drawerOpen}
                                    renderProps={renderProps}
                                    onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                                />
                            );
                        } else if (block.source === 'User' || block.source === 'RovoDev') {
                            return (
                                <ChatMessageItem
                                    msg={block}
                                    enableActions={
                                        block.source === 'RovoDev' && currentState.state === 'WaitingForPrompt'
                                    }
                                    onCopy={handleCopyResponse}
                                    onFeedback={handleFeedbackTrigger}
                                />
                            );
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

            {!isChatHistoryDisabled && shouldShowToolCall && pendingToolCall && (
                <div style={{ marginBottom: '16px' }}>
                    <ToolCallItem toolMessage={pendingToolCall} currentState={currentState} />
                </div>
            )}

            {!isChatHistoryDisabled && currentState.state === 'WaitingForPrompt' && (
                <FollowUpActionFooter>
                    {deepPlanCreated && !feedbackVisible && <CodePlanButton execute={executeCodePlan} />}
                    {canCreatePR && !deepPlanCreated && !feedbackVisible && hasChangesInGit && (
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
                    {feedbackVisible && (
                        <FeedbackForm
                            type={feedbackType}
                            onSubmit={(feedbackType, feedback, canContact, includeTenMessages) => {
                                setFeedbackType(undefined);
                                sendFeedback(feedbackType, feedback, canContact, includeTenMessages);
                            }}
                            onCancel={() => {
                                setFeedbackType(undefined);
                                setFeedbackVisible(false);
                            }}
                        />
                    )}
                </FollowUpActionFooter>
            )}
            <div id="sentinel" ref={sentinelRef} style={{ height: '10px', width: '100%', pointerEvents: 'none' }} />
        </div>
    );
};
