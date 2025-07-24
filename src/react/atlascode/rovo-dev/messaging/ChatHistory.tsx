import { useCallback } from 'react';
import * as React from 'react';

import { PostMessageFunc, PostMessagePromiseFunc } from '../../messagingApi';
import { ErrorMessageItem, FollowUpActionFooter, OpenFileFunc, TechnicalPlanComponent } from '../common/common';
import { PullRequestChatItem, PullRequestForm } from '../create-pr/PullRequestForm';
import { RovoDevLanding } from '../rovoDevLanding';
import { State } from '../rovoDevView';
import { RovoDevViewResponse } from '../rovoDevViewMessages';
import { CodePlanButton } from '../technical-plan/CodePlanButton';
import {
    ChatMessage,
    DefaultMessage,
    ErrorMessage,
    parseToolReturnMessage,
    scrollToEnd,
    TechnicalPlan,
    ToolReturnParseResult,
} from '../utils';
import { ChatMessageItem } from './ChatMessageItem';
import { MessageDrawer } from './MessageDrawer';

interface MessageBlockDetails {
    messages: ChatMessage[] | DefaultMessage | ErrorMessage | null;
    technicalPlan?: TechnicalPlan;
}
interface ChatHistoryProps {
    messages: ChatMessage[];
    renderProps: {
        openFile: OpenFileFunc;
        isRetryAfterErrorButtonEnabled: (uid: string) => boolean;
        retryPromptAfterError: () => void;
        getOriginalText: (fp: string, lr?: number[]) => Promise<string>;
    };
    messagingApi: {
        postMessage: PostMessageFunc<RovoDevViewResponse>;
        postMessageWithReturn: PostMessagePromiseFunc<RovoDevViewResponse, any>;
    };
    modifiedFiles?: ToolReturnParseResult[];
    pendingToolCall: string;
    deepPlanCreated: boolean;
    executeCodePlan: () => void;
    state: State;
    injectMessage?: (msg: ChatMessage) => void;
    keepAllFileChanges?: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
    messages,
    renderProps,
    pendingToolCall,
    deepPlanCreated,
    executeCodePlan,
    state,
    messagingApi: { postMessageWithReturn },
    modifiedFiles,
    injectMessage,
    keepAllFileChanges,
}) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const [currentMessage, setCurrentMessage] = React.useState<DefaultMessage | null>(null);
    const [curThinkingMessages, setCurThinkingMessages] = React.useState<ChatMessage[]>([]);
    const [messageBlocks, setMessageBlocks] = React.useState<MessageBlockDetails[]>([]);
    const [canCreatePR, setCanCreatePR] = React.useState(false);
    const [msgProcessedCount, setMsgProcessedCount] = React.useState(0);
    const [isFormVisible, setIsFormVisible] = React.useState(false);

    const reset = useCallback(() => {
        setCurrentMessage(null);
        setCurThinkingMessages([]);
        setMessageBlocks([]);
        setCanCreatePR(false);
        setMsgProcessedCount(0);
        setIsFormVisible(false);
    }, [
        setCurrentMessage,
        setCurThinkingMessages,
        setMessageBlocks,
        setCanCreatePR,
        setMsgProcessedCount,
        setIsFormVisible,
    ]);

    React.useEffect(() => {
        if (chatEndRef.current) {
            scrollToEnd(chatEndRef.current);
        }

        // clear everything if there was a reset
        if (messages.length === 0) {
            if (msgProcessedCount > 0) {
                reset();
            }
            return;
        }

        if (state === State.WaitingForPrompt) {
            if (curThinkingMessages.length > 0) {
                setMessageBlocks((prev) => [...prev, { messages: curThinkingMessages }]);
                setCurThinkingMessages([]);
            }
            if (currentMessage) {
                setMessageBlocks((prev) => [...prev, { messages: currentMessage }]);
            }
            setCurrentMessage(null);
        }

        const processedCount = msgProcessedCount;
        setMsgProcessedCount(messages.length);

        for (let i = processedCount; i < messages.length; ++i) {
            const newMessage = messages[i];
            switch (newMessage.source) {
                case 'User':
                    if (curThinkingMessages.length > 0) {
                        setMessageBlocks((prev) => [...prev, { messages: curThinkingMessages }]);
                        setCurThinkingMessages([]);
                    }

                    if (currentMessage && currentMessage.source === 'RovoDev') {
                        setMessageBlocks((prev) => [...prev, { messages: currentMessage }]);
                    }
                    setCurrentMessage(null);
                    setMessageBlocks((prev) => [...prev, { messages: newMessage }]);
                    setCanCreatePR(true);
                    break;

                case 'RovoDev':
                    setCurrentMessage(newMessage);
                    break;

                case 'RovoDevError':
                case 'PullRequest':
                    setMessageBlocks((prev) => [...prev, { messages: newMessage }]);
                    setCurrentMessage(null);
                    break;

                case 'ToolReturn':
                    if (currentMessage) {
                        setCurThinkingMessages((prev) => [...prev, currentMessage]);
                        setCurrentMessage(null);
                    }

                    if (newMessage.tool_name === 'create_technical_plan') {
                        const parsedMessage = parseToolReturnMessage(newMessage);

                        parsedMessage.map((msg, index) => {
                            if (!msg.technicalPlan) {
                                console.error('Technical plan message is missing technicalPlan property');
                                return;
                            }

                            setMessageBlocks((prev) => [...prev, { messages: null, technicalPlan: msg.technicalPlan }]);
                        });
                    } else {
                        setCurThinkingMessages((prev) => [...prev, newMessage]);
                    }
                    break;

                default:
                    console.warn(`Unknown message source: ${newMessage.source}`);
                    break;
            }
        }
    }, [curThinkingMessages, currentMessage, setMsgProcessedCount, reset, messages, state, msgProcessedCount]);

    return (
        <div ref={chatEndRef} className="chat-message-container">
            <RovoDevLanding />
            {messageBlocks &&
                messageBlocks.map((block, idx) => {
                    if (block.technicalPlan) {
                        return (
                            <div>
                                <TechnicalPlanComponent
                                    content={block.technicalPlan}
                                    openFile={renderProps.openFile}
                                    getText={renderProps.getOriginalText}
                                />
                            </div>
                        );
                    }

                    if (block.messages) {
                        if (Array.isArray(block.messages)) {
                            return <MessageDrawer messages={block.messages} opened={false} renderProps={renderProps} />;
                        } else if (block.messages.source === 'User' || block.messages.source === 'RovoDev') {
                            return <ChatMessageItem msg={block.messages} index={idx} />;
                        } else if (block.messages.source === 'RovoDevError') {
                            return (
                                <ErrorMessageItem
                                    msg={block.messages}
                                    index={idx}
                                    isRetryAfterErrorButtonEnabled={renderProps.isRetryAfterErrorButtonEnabled}
                                    retryAfterError={renderProps.retryPromptAfterError}
                                />
                            );
                        } else if (block.messages.source === 'PullRequest') {
                            return <PullRequestChatItem msg={block.messages} />;
                        }
                    }

                    return null;
                })}
            {curThinkingMessages.length > 0 && (
                <MessageDrawer
                    messages={curThinkingMessages}
                    opened={true}
                    renderProps={renderProps}
                    pendingToolCall={pendingToolCall || undefined}
                />
            )}
            {currentMessage && <ChatMessageItem msg={currentMessage} index={messages.length - 1} />}
            {deepPlanCreated && (
                <CodePlanButton execute={executeCodePlan} disabled={state !== State.WaitingForPrompt} />
            )}

            {state === State.WaitingForPrompt && (
                <FollowUpActionFooter>
                    {canCreatePR && (
                        <PullRequestForm
                            onCancel={() => {
                                setCanCreatePR(false);
                                setIsFormVisible(false);
                            }}
                            postMessageWithReturn={postMessageWithReturn}
                            modifiedFiles={modifiedFiles}
                            onPullRequestCreated={(url) => {
                                setCanCreatePR(false);
                                setIsFormVisible(false);
                                if (injectMessage) {
                                    if (url) {
                                        injectMessage({
                                            text: `Pull request ready: ${url}`,
                                            source: 'PullRequest',
                                        });
                                    } else {
                                        injectMessage({
                                            text: 'Successfully pushed changes to the remote repository.',
                                            source: 'PullRequest',
                                        });
                                    }
                                    keepAllFileChanges?.();
                                }
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
