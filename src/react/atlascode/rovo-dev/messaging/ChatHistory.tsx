import React from 'react';

import { PostMessageFunc, PostMessagePromiseFunc } from '../../messagingApi';
import {
    ErrorMessageItem,
    FollowUpActionFooter,
    OpenFileFunc,
    PullRequestButton,
    TechnicalPlanComponent,
} from '../common/common';
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
}) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const [currentMessage, setCurrentMessage] = React.useState<DefaultMessage | null>(null);
    const [curThinkingMessages, setCurThinkingMessages] = React.useState<ChatMessage[]>([]);
    const [messageBlocks, setMessageBlocks] = React.useState<MessageBlockDetails[]>([]);
    const [canCreatePR, setCanCreatePR] = React.useState(false);

    React.useEffect(() => {
        if (chatEndRef.current) {
            scrollToEnd(chatEndRef.current);
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

        const handleMessages = () => {
            if (messages.length === 0) {
                return;
            }

            const newMessage = messages.pop();

            if (newMessage && newMessage !== currentMessage) {
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
                        return;

                    case 'RovoDev':
                        setCurrentMessage((prev) => {
                            if (prev && prev.text === '...') {
                                return newMessage;
                            }
                            newMessage.text = prev ? prev.text + newMessage.text : newMessage.text;
                            return newMessage;
                        });
                        return;

                    case 'RovoDevError':
                        setMessageBlocks((prev) => [...prev, { messages: newMessage }]);

                        setCurrentMessage(null);
                        return;
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

                                setMessageBlocks((prev) => [
                                    ...prev,
                                    { messages: null, technicalPlan: msg.technicalPlan },
                                ]);
                            });
                        } else {
                            setCurThinkingMessages((prev) => [...prev, newMessage]);
                        }
                        return;

                    default:
                        console.warn(`Unknown message source: ${newMessage.source}`);
                        return;
                }
            }
        };
        handleMessages();
    }, [curThinkingMessages, currentMessage, messages, state]);

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
                        <PullRequestButton
                            key="pull-request-button"
                            postMessagePromise={postMessageWithReturn}
                            modifiedFiles={modifiedFiles}
                            onPullRequestCreated={(url) => {
                                if (url) {
                                    injectMessage?.({
                                        source: 'RovoDev',
                                        text: `Pull request prepared [here](${url})`,
                                    });
                                }
                                // Errors are handled by the extension logic
                                setCanCreatePR(false);
                            }}
                        />
                    )}
                </FollowUpActionFooter>
            )}
        </div>
    );
};
