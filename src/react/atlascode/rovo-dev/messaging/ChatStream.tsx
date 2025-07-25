import { random } from 'lodash';
import * as React from 'react';

import { PostMessageFunc, PostMessagePromiseFunc } from '../../messagingApi';
import { ErrorMessageItem, FollowUpActionFooter, OpenFileFunc, TechnicalPlanComponent } from '../common/common';
import { PullRequestChatItem, PullRequestForm } from '../create-pr/PullRequestForm';
import { RovoDevLanding } from '../rovoDevLanding';
import { State } from '../rovoDevView';
import { RovoDevViewResponse } from '../rovoDevViewMessages';
import { CodePlanButton } from '../technical-plan/CodePlanButton';
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
    messagingApi: {
        postMessage: PostMessageFunc<RovoDevViewResponse>;
        postMessageWithReturn: PostMessagePromiseFunc<RovoDevViewResponse, any>;
    };
    modifiedFiles?: ToolReturnParseResult[];
    pendingToolCall: string;
    deepPlanCreated: boolean;
    executeCodePlan: () => void;
    state: State;
    injectMessage?: (msg: DefaultMessage) => void;
    keepAllFileChanges?: () => void;
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
    messagingApi: { postMessageWithReturn },
    modifiedFiles,
    injectMessage,
    keepAllFileChanges,
}) => {
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const [canCreatePR, setCanCreatePR] = React.useState(false);
    const [isFormVisible, setIsFormVisible] = React.useState(false);

    React.useEffect(() => {
        if (chatEndRef.current) {
            scrollToEnd(chatEndRef.current);
        }

        if (state === State.WaitingForPrompt) {
            setCanCreatePR(true);
        }
    }, [state, chatHistory, currentThinking, currentMessage, isFormVisible]);

    return (
        <div ref={chatEndRef} className="chat-message-container">
            <RovoDevLanding />
            {chatHistory &&
                chatHistory.map((block, idx) => {
                    if (block) {
                        if (Array.isArray(block)) {
                            return <MessageDrawer messages={block} opened={false} renderProps={renderProps} />;
                        } else if (block.source === 'User' || block.source === 'RovoDev') {
                            return <ChatMessageItem msg={block} index={idx} />;
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
                    pendingToolCall={pendingToolCall || undefined}
                />
            )}
            {currentMessage && <ChatMessageItem msg={currentMessage} index={random()} />}
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
