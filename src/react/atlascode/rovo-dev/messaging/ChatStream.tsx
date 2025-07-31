import * as React from 'react';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';
import { ConnectionTimeout } from 'src/util/time';

import { useMessagingApi } from '../../messagingApi';
import { ErrorMessageItem, FollowUpActionFooter, OpenFileFunc, TechnicalPlanComponent } from '../common/common';
import { PullRequestChatItem, PullRequestForm } from '../create-pr/PullRequestForm';
import { RovoDevLanding } from '../rovoDevLanding';
import { State } from '../rovoDevView';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';
import { CodePlanButton } from '../technical-plan/CodePlanButton';
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
        getOriginalText: (fp: string, lr?: number[]) => Promise<string>;
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

    React.useEffect(() => {
        if (chatEndRef.current) {
            scrollToEnd(chatEndRef.current);
        }

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
                                            getText={renderProps.getOriginalText}
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
            {deepPlanCreated && (
                <CodePlanButton execute={executeCodePlan} disabled={state !== State.WaitingForPrompt} />
            )}

            {state === State.WaitingForPrompt && (
                <FollowUpActionFooter>
                    {canCreatePR && hasChangesInGit && (
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
        </div>
    );
};
