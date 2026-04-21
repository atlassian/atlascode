import * as React from 'react';
import { RovodevStaticConfig } from 'src/rovo-dev/api/rovodevStaticConfig';
import { State, ToolPermissionDialogChoice } from 'src/rovo-dev/rovoDevTypes';
import { RovoDevProviderMessage } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

import { DetailedSiteInfo, MinimalIssue } from '../../api/extensionApiTypes';
import { CheckFileExistsFunc, OpenFileFunc, OpenJiraFunc } from '../common/common';
import { DialogMessageItem } from '../common/DialogMessage';
import { CredentialHint } from '../landing-page/disabled-messages/RovoDevLoginForm';
import { RovoDevLanding } from '../landing-page/RovoDevLanding';
import { LivePreviewButton } from '../live-preview/LivePreviewButton';
import { useMessagingApi } from '../messagingApi';
import { McpConsentChoice, RovoDevViewResponse } from '../rovoDevViewMessages';
import { SubagentInfo, ToolCallItem } from '../tools/ToolCallItem';
import { DialogMessage, Response, scrollToEnd } from '../utils';
import { ChatStreamMessageRenderer } from './ChatStreamMessageRenderer';
import { DropdownButton } from './dropdown-button/DropdownButton';

interface ChatStreamProps {
    chatHistory: Response[];
    modalDialogs: DialogMessage[];
    renderProps: {
        openFile: OpenFileFunc;
        openJira: OpenJiraFunc;
        checkFileExists: CheckFileExistsFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
        onRestartProcess: () => void;
        onError: (error: Error, errorMessage: string) => void;
    };
    messagingApi: ReturnType<
        typeof useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>
    >;
    pendingToolCall: string;
    pendingSubagentTasks?: SubagentInfo[];
    deepPlanCreated: string | null;
    currentState: State;
    onCollapsiblePanelExpanded: () => void;
    handleFeedbackTrigger: (isPositive: boolean) => void;
    onLoginClick: (openApiTokenLogin: boolean) => void;
    onRovoDevAuthSubmit: (host: string, email: string, apiToken: string) => void;
    onOpenFolder: () => void;
    onMcpChoice: (choice: McpConsentChoice, serverName?: string) => void;
    setPromptText: (context: string) => void;
    jiraWorkItems: MinimalIssue<DetailedSiteInfo>[] | undefined;
    onJiraItemClick: (issue: MinimalIssue<DetailedSiteInfo>) => void;
    onToolPermissionChoice: (toolCallId: string, choice: ToolPermissionDialogChoice | 'enableYolo') => void;
    onLinkClick: (href: string) => void;
    credentialHints?: CredentialHint[];
    onGeneratePlanClick?: (planId: string, proceed: boolean) => void;
    showLivePreviewButton?: boolean;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
    chatHistory,
    modalDialogs,
    renderProps,
    pendingToolCall,
    pendingSubagentTasks,
    deepPlanCreated,
    currentState,
    messagingApi,
    onCollapsiblePanelExpanded,
    handleFeedbackTrigger,
    onLoginClick,
    onRovoDevAuthSubmit,
    onOpenFolder,
    onMcpChoice,
    setPromptText,
    jiraWorkItems,
    onJiraItemClick,
    onToolPermissionChoice,
    onLinkClick,
    credentialHints,
    onGeneratePlanClick,
    showLivePreviewButton,
}) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const prevChatHistoryLengthRef = React.useRef(chatHistory.length);
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
        pendingToolCall,
        autoScrollEnabled,
        performAutoScroll,
    ]);

    const handleCopyResponse = React.useCallback((text: string) => {
        if (!navigator.clipboard) {
            console.warn('Clipboard API not supported');
            return;
        }
        navigator.clipboard.writeText(text);
    }, []);

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
            {(!RovodevStaticConfig.isBBY ||
                (currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance')) && (
                <RovoDevLanding
                    currentState={currentState}
                    isHistoryEmpty={chatHistory.length === 0}
                    onLoginClick={onLoginClick}
                    onRovoDevAuthSubmit={onRovoDevAuthSubmit}
                    onOpenFolder={onOpenFolder}
                    onMcpChoice={onMcpChoice}
                    setPromptText={setPromptText}
                    jiraWorkItems={jiraWorkItems}
                    onJiraItemClick={onJiraItemClick}
                    onLinkClick={onLinkClick}
                    credentialHints={credentialHints}
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
                    deepPlanCreated={deepPlanCreated}
                    onGeneratePlanClick={onGeneratePlanClick}
                />
            )}

            {!isChatHistoryDisabled && shouldShowToolCall && pendingToolCall && (
                <div style={{ marginBottom: '16px' }}>
                    <ToolCallItem
                        toolMessage={pendingToolCall}
                        currentState={currentState}
                        subagentTasks={pendingSubagentTasks}
                    />
                </div>
            )}

            {!isChatHistoryDisabled && (
                <div>
                    {modalDialogs.map((dialog) => (
                        <DialogMessageItem
                            msg={dialog}
                            isRetryAfterErrorButtonEnabled={renderProps.isRetryAfterErrorButtonEnabled}
                            retryAfterError={renderProps.retryPromptAfterError}
                            onRestartProcess={renderProps.onRestartProcess}
                            onToolPermissionChoice={onToolPermissionChoice}
                            onLinkClick={onLinkClick}
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
                    {showLivePreviewButton && <LivePreviewButton messagingApi={messagingApi} />}
                </FollowUpActionFooter>
            )}
            <div id="sentinel" ref={sentinelRef} style={{ height: '10px', width: '100%', pointerEvents: 'none' }} />
        </div>
    );
};
