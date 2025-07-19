import React from 'react';

import { ChatMessageItem, ErrorMessageItem, OpenFileFunc, TechnicalPlanComponent } from '../common/common';
import {
    ChatMessage,
    DefaultMessage,
    ErrorMessage,
    parseToolReturnMessage,
    TechnicalPlan,
    ToolCallMessage,
} from '../utils';
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
    pendingToolCall: ToolCallMessage | null;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, renderProps, pendingToolCall }) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const [currentMessage, setCurrentMessage] = React.useState<DefaultMessage | null>(null);
    const [curThinkingMessages, setCurThinkingMessages] = React.useState<ChatMessage[]>([]);
    const [messageBlocks, setMessageBlocks] = React.useState<MessageBlockDetails[]>([]);

    React.useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }

        const handleMessages = () => {
            if (messages.length === 0) {
                return;
            }

            const newMessage = messages.pop();
            if (newMessage && newMessage !== currentMessage) {
                if (newMessage.source === 'User') {
                    if (curThinkingMessages.length > 0) {
                        setMessageBlocks((prev) => [...prev, { messages: curThinkingMessages }]);
                        setCurThinkingMessages([]);
                    }

                    if (currentMessage && currentMessage.source === 'RovoDev') {
                        setMessageBlocks((prev) => [...prev, { messages: currentMessage }]);
                    }
                    setCurrentMessage(null);
                    setMessageBlocks((prev) => [...prev, { messages: newMessage }]);
                    return;
                }

                if (newMessage.source === 'RovoDev') {
                    setCurrentMessage((prev) => {
                        if (prev && prev.text === '...') {
                            return newMessage;
                        }
                        newMessage.text = prev ? prev.text + newMessage.text : newMessage.text;
                        return newMessage;
                    });
                    return;
                }

                if (newMessage.source === 'ToolReturn') {
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
                    return;
                }

                if (newMessage.source === 'RovoDevError') {
                    setMessageBlocks((prev) => [...prev, { messages: newMessage }]);

                    setCurrentMessage(null);
                    return;
                }
            }
        };
        handleMessages();
    }, [curThinkingMessages, currentMessage, messages]);

    return (
        <div className="chat-message-container">
            <div id="chat-history">
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
                                return (
                                    <MessageDrawer messages={block.messages} opened={false} renderProps={renderProps} />
                                );
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
            </div>
            <div id="thinking-messages">
                {curThinkingMessages.length > 0 && (
                    <MessageDrawer
                        messages={curThinkingMessages}
                        opened={true}
                        renderProps={renderProps}
                        pendingToolCall={pendingToolCall || undefined}
                    />
                )}
            </div>
            <div id="current-message">
                {currentMessage && <ChatMessageItem msg={currentMessage} index={messages.length - 1} />}
            </div>
            <div ref={chatEndRef} />
        </div>
    );
};
