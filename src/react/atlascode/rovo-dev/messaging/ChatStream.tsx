import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import { State, ToolPermissionDialogChoice } from 'src/rovo-dev/rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';
import { ConnectionTimeout } from 'src/util/time';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { useMessagingApi } from '../../messagingApi';
import { CheckFileExistsFunc, FollowUpActionFooter, OpenFileFunc, OpenJiraFunc } from '../common/common';
import { DialogMessageItem } from '../common/DialogMessage';
import { PullRequestForm } from '../create-pr/PullRequestForm';
import { FeedbackForm, FeedbackType } from '../feedback-form/FeedbackForm';
import { RovoDevLanding } from '../landing-page/RovoDevLanding';
import { McpConsentChoice, RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';
import { CodePlanButton } from '../technical-plan/CodePlanButton';
import { ToolCallItem } from '../tools/ToolCallItem';
import { DialogMessage, PullRequestMessage, Response, scrollToEnd } from '../utils';
import { ChatStreamMessageRenderer } from './ChatStreamMessageRenderer';
import { DropdownButton } from './dropdown-button/DropdownButton';

const IsBoysenberry = process.env.ROVODEV_BBY === 'true';

interface ChatStreamProps {
    chatHistory: Response[];
    modalDialogs: DialogMessage[];
    renderProps: {
        openFile: OpenFileFunc;
        openJira: OpenJiraFunc;
        checkFileExists: CheckFileExistsFunc;
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
    onChangesGitPushed: (msg: PullRequestMessage, pullRequestCreated: boolean) => void;
    onCollapsiblePanelExpanded: () => void;
    feedbackVisible: boolean;
    setFeedbackVisible: (visible: boolean) => void;
    sendFeedback: (feedbackType: FeedbackType, feedack: string, canContact: boolean, lastTenMessages: boolean) => void;
    onLoginClick: () => void;
    onOpenFolder: () => void;
    onMcpChoice: (choice: McpConsentChoice, serverName?: string) => void;
    setPromptText: (context: string) => void;
    jiraWorkItems: MinimalIssue<DetailedSiteInfo>[] | undefined;
    onJiraItemClick: (issue: MinimalIssue<DetailedSiteInfo>) => void;
    onToolPermissionChoice: (toolCallId: string, choice: ToolPermissionDialogChoice | 'enableYolo') => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
    chatHistory,
    modalDialogs,
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
    setPromptText,
    jiraWorkItems,
    onJiraItemClick,
    onToolPermissionChoice,
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

    const onLinkClick = React.useCallback(
        (href: string) => {
            messagingApi.postMessage({ type: RovoDevViewResponseType.OpenExternalLink, href });
        },
        [messagingApi],
    );
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
            if (!Array.isArray(newMessage) && newMessage?.event_kind === '_RovoDevUserPrompt') {
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
        modalDialogs,
        isFormVisible,
        pendingToolCall,
        autoScrollEnabled,
        performAutoScroll,
    ]);

    // Other state management effect
    if (IsBoysenberry) {
        React.useEffect(() => {
            if (currentState.state === 'WaitingForPrompt') {
                const canCreatePR = chatHistory.length > 0;
                setCanCreatePR(canCreatePR);
                if (canCreatePR) {
                    // Only check git changes if there's something in the chat
                    checkGitChanges();
                }
            }
        }, [currentState, chatHistory, isFormVisible, checkGitChanges]);
    }

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
            {!IsBoysenberry && (
                <RovoDevLanding
                    currentState={currentState}
                    isHistoryEmpty={chatHistory.length === 0}
                    onLoginClick={onLoginClick}
                    onOpenFolder={onOpenFolder}
                    onMcpChoice={onMcpChoice}
                    setPromptText={setPromptText}
                    jiraWorkItems={jiraWorkItems}
                    onJiraItemClick={onJiraItemClick}
                />
            )}
            {!isChatHistoryDisabled && (
                <ChatStreamMessageRenderer
                    chatHistory={chatHistory}
                    currentState={currentState}
                    handleCopyResponse={handleCopyResponse}
                    handleFeedbackTrigger={handleFeedbackTrigger}
                    onToolPermissionChoice={onToolPermissionChoice}
                    onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                    renderProps={renderProps}
                    onLinkClick={onLinkClick}
                />
            )}

            {!isChatHistoryDisabled && shouldShowToolCall && pendingToolCall && (
                <div style={{ marginBottom: '16px' }}>
                    <ToolCallItem toolMessage={pendingToolCall} currentState={currentState} />
                </div>
            )}

            {!isChatHistoryDisabled && (
                <div>
                    {modalDialogs.map((dialog) => (
                        <DialogMessageItem
                            msg={dialog}
                            isRetryAfterErrorButtonEnabled={renderProps.isRetryAfterErrorButtonEnabled}
                            retryAfterError={renderProps.retryPromptAfterError}
                            onToolPermissionChoice={onToolPermissionChoice}
                        />
                    ))}
                    {modalDialogs.length > 1 && modalDialogs.every((d) => d.type === 'toolPermissionRequest') && (
                        <DropdownButton
                            buttonItem={{
                                label: 'Allow all',
                                onSelect: () => onToolPermissionChoice(modalDialogs[0].toolCallId, 'allowAll'),
                            }}
                            items={[
                                {
                                    label: 'Allow all',
                                    onSelect: () => onToolPermissionChoice(modalDialogs[0].toolCallId, 'allowAll'),
                                },
                                {
                                    label: 'Enable YOLO mode',
                                    onSelect: () => onToolPermissionChoice(modalDialogs[0].toolCallId, 'enableYolo'),
                                },
                            ]}
                        />
                    )}
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
                            onPullRequestCreated={(url, branchName) => {
                                setCanCreatePR(false);
                                setIsFormVisible(false);

                                const pullRequestCreated = !!url;
                                onChangesGitPushed(
                                    {
                                        event_kind: '_RovoDevPullRequest',
                                        text: url
                                            ? `Successfully pushed changes to the remote repository with branch "${branchName}". Click to create PR: ${url}`
                                            : `Successfully pushed changes to the remote repository with branch "${branchName}".`,
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
