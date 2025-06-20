import LoadingButton from '@atlaskit/button/loading-button';
import SendIcon from '@atlaskit/icon/glyph/send';
import PauseIcon from '@atlaskit/icon/glyph/vid-pause';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import React, { useCallback, useState } from 'react';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import { useMessagingApi } from '../messagingApi';
import { ChatMessageItem, renderChatHistory, ToolCallItem, ToolDrawer, UpdatedFilesComponent } from './common';
import * as styles from './rovoDevViewStyles';
import { ChatMessage, isCodeChangeTool, ToolCallMessage, ToolReturnGenericMessage } from './utils';

const enum State {
    WaitingForPrompt,
    GeneratingResponse,
    CancellingResponse,
}

const TextAreaMessages: Record<State, string> = {
    [State.WaitingForPrompt]: 'Type in a question',
    [State.GeneratingResponse]: 'Generating response...',
    [State.CancellingResponse]: 'Cancelling the response...',
};

const RovoDevView: React.FC = () => {
    const [sendButtonDisabled, setSendButtonDisabled] = useState(true);
    const [currentState, setCurrentState] = useState(State.WaitingForPrompt);
    const [promptContainerFocused, setPromptContainerFocused] = useState(false);

    const [promptText, setPromptText] = useState('');
    const [currentResponse, setCurrentResponse] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [pendingToolCall, setPendingToolCall] = useState<ToolCallMessage | null>(null);

    const [currentTools, setCurrentTools] = useState<ToolReturnGenericMessage[]>([]);
    const [totalModifiedFiles, setTotalModifiedFiles] = useState<ToolReturnGenericMessage[]>([]);

    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const inputAreaRef = React.useRef<HTMLDivElement>(null);

    // Scroll to bottom when chat updates
    React.useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }

        const codeBlocks = document.querySelectorAll('pre code');

        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [chatHistory, currentResponse]);

    const appendCurrentResponse = useCallback(
        (text) => {
            if (text) {
                setCurrentResponse((currentText) => {
                    if (!currentText || !currentText.trim() || currentText === '...') {
                        return text;
                    } else {
                        return currentText + text;
                    }
                });
            }
        },
        [setCurrentResponse],
    );

    const handleAppendChatHistory = useCallback(
        (msg: ChatMessage) => {
            setChatHistory((prev) => {
                return [...prev, msg];
            });
        },
        [setChatHistory],
    );

    const handleAppendToolReturns = useCallback(
        (toolReturn: ToolReturnGenericMessage) => {
            setCurrentTools((prev) => {
                return [...prev, toolReturn];
            });
        },
        [setCurrentTools],
    );

    const handleAppendModifiedFileToolReturns = useCallback(
        (toolReturn: ToolReturnGenericMessage) => {
            setTotalModifiedFiles((prev) => {
                return [...prev, toolReturn];
            });
        },
        [setTotalModifiedFiles],
    );

    const handleResponse = useCallback(
        (data: RovoDevResponse) => {
            console.log('Received response data:', data);
            switch (data.event_kind) {
                case 'text':
                    if (!data.content) {
                        break;
                    }
                    if (currentTools && currentTools.length > 0) {
                        handleAppendChatHistory({
                            author: 'ReturnGroup',
                            tool_returns: currentTools,
                        });
                        setCurrentTools([]); // Clear tools if new text response comes in
                    }

                    appendCurrentResponse(data.content);
                    break;

                case 'tool-call':
                    const callMessage: ToolCallMessage = {
                        author: 'ToolCall',
                        tool_name: data.tool_name,
                        args: data.args,
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                    };
                    setPendingToolCall(callMessage);
                    break;

                case 'tool-return':
                    const args =
                        data.tool_call_id === pendingToolCall?.tool_call_id ? pendingToolCall?.args : undefined;

                    const returnMessage: ToolReturnGenericMessage = {
                        author: 'ToolReturn',
                        tool_name: data.tool_name,
                        content: data.content || '',
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                        args: args, // Use args from pending tool call if available
                    };
                    setPendingToolCall(null); // Clear pending tool call
                    handleAppendToolReturns(returnMessage);
                    if (isCodeChangeTool(data.tool_name)) {
                        handleAppendModifiedFileToolReturns(returnMessage);
                    }
                    break;

                default:
                    appendCurrentResponse(`\n\nUnknown part_kind: ${data.event_kind}\n\n`);
                    break;
            }
        },
        [
            appendCurrentResponse,
            currentTools,
            handleAppendChatHistory,
            handleAppendModifiedFileToolReturns,
            handleAppendToolReturns,
            pendingToolCall,
        ],
    );

    const completeMessage = useCallback(
        (force?: boolean) => {
            if (force || (currentResponse && currentResponse !== '...')) {
                const message: ChatMessage = {
                    text: currentResponse === '...' ? 'Error: Unable to retrieve the response' : currentResponse,
                    author: 'RovoDev',
                };
                handleAppendChatHistory(message);
            }
            setCurrentResponse('');
        },
        [currentResponse, handleAppendChatHistory, setCurrentResponse],
    );

    const onMessageHandler = useCallback(
        (event: any): void => {
            switch (event.type) {
                case 'response': {
                    handleResponse(event.dataObject);
                    break;
                }

                case 'userChatMessage': {
                    completeMessage();
                    handleAppendChatHistory(event.message);
                    break;
                }

                case 'completeMessage': {
                    completeMessage(true);
                    setSendButtonDisabled(false);
                    setCurrentState(State.WaitingForPrompt);
                    break;
                }

                case 'toolCall': {
                    completeMessage();
                    handleResponse(event.dataObject);
                    break;
                }

                case 'toolReturn': {
                    completeMessage();
                    handleResponse(event.dataObject);
                    break;
                }

                case 'errorMessage': {
                    handleAppendChatHistory(event.message);
                    setCurrentResponse('');
                    setSendButtonDisabled(false);
                    setCurrentState(State.WaitingForPrompt);
                    break;
                }

                case 'newSession': {
                    setChatHistory([]);
                    break;
                }

                case 'initialized': {
                    setSendButtonDisabled(false);
                    break;
                }

                default:
                    console.warn('Unknown message type:', event.type);
                    break;
            }
        },
        [handleResponse, handleAppendChatHistory, setSendButtonDisabled, setCurrentState, completeMessage],
    );

    const [postMessage] = useMessagingApi<any, any, any>(onMessageHandler);

    const sendPrompt = useCallback(
        (text: string): void => {
            if (sendButtonDisabled || text.trim() === '' || currentState !== State.WaitingForPrompt) {
                return;
            }

            setCurrentResponse('...');

            // Disable the send button, and enable the pause button
            setSendButtonDisabled(true);
            setCurrentState(State.GeneratingResponse);

            // Send the prompt to backend
            postMessage({
                type: 'prompt',
                text,
            });

            // Clear the input field
            setPromptText('');
        },
        [postMessage, setCurrentResponse, sendButtonDisabled, setSendButtonDisabled, currentState, setCurrentState],
    );

    const cancelResponse = useCallback((): void => {
        if (currentState === State.CancellingResponse) {
            return;
        }

        setCurrentState(State.CancellingResponse);

        // Send the signal to cancel the response
        postMessage({
            type: 'cancelResponse',
        });
    }, [postMessage, currentState, setCurrentState]);

    const openFile = useCallback(
        (filePath: string, range?: any[]) => {
            // Implement file opening logic here
            if (!range || range.length !== 2) {
                postMessage({
                    type: 'openFile',
                    filePath,
                });
            } else {
                postMessage({
                    type: 'openFile',
                    filePath,
                    range,
                });
            }
        },
        [postMessage],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendPrompt(promptText);
            }
        },
        [sendPrompt, promptText],
    );

    return (
        <div className="rovoDevChat" style={styles.rovoDevContainerStyles}>
            <div style={styles.chatMessagesContainerStyles}>
                {chatHistory.map((msg, index) => renderChatHistory(msg, index, openFile))}
                {currentTools && currentTools.length > 0 && (
                    <ToolDrawer content={currentTools} openFile={openFile} isStreaming={true} />
                )}
                {pendingToolCall && <ToolCallItem msg={pendingToolCall} />}
                {currentResponse && (
                    <div
                        style={{
                            ...styles.agentMessageStyles,
                            ...styles.streamingMessageStyles,
                            borderRadius: '8px',
                        }}
                    >
                        <ChatMessageItem
                            msg={{
                                text: currentResponse,
                                author: 'RovoDev',
                            }}
                            index={chatHistory.length}
                        />
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div style={styles.rovoDevInputSectionStyles} ref={inputAreaRef}>
                <UpdatedFilesComponent
                    modidiedFiles={totalModifiedFiles}
                    onUndo={() => {
                        console.log('Undoing changes');
                    }}
                    onAccept={() => {
                        console.log('Accepting changes');
                    }}
                    openDiff={(filePath: string) => openFile(filePath)}
                />
                <div style={styles.rovoDevPromptContainerStyles}>
                    <div
                        onFocus={() => setPromptContainerFocused(true)}
                        onBlur={() => setPromptContainerFocused(false)}
                        style={
                            promptContainerFocused
                                ? {
                                      ...styles.rovoDevTextareaContainerStyles,
                                      outline: 'var(--vscode-focusBorder) solid 1px',
                                  }
                                : styles.rovoDevTextareaContainerStyles
                        }
                    >
                        <textarea
                            style={styles.rovoDevTextareaStyles}
                            placeholder={TextAreaMessages[currentState]}
                            onChange={(element) => setPromptText(element.target.value)}
                            onKeyDown={handleKeyDown}
                            value={promptText}
                        />
                        <div style={styles.rovoDevButtonStyles}>
                            {currentState === State.WaitingForPrompt && (
                                <LoadingButton
                                    style={{
                                        color: 'var(--vscode-input-foreground) !important',
                                        border: '1px solid var(--vscode-button-border) !important',
                                        backgroundColor: 'var(--vscode-input-background) !important',
                                    }}
                                    label="Send button"
                                    iconBefore={<SendIcon size="small" label="Send" />}
                                    isDisabled={sendButtonDisabled}
                                    onClick={() => sendPrompt(promptText)}
                                />
                            )}
                            {currentState !== State.WaitingForPrompt && (
                                <LoadingButton
                                    style={{
                                        color: 'var(--vscode-input-foreground) !important',
                                        border: '1px solid var(--vscode-button-border) !important',
                                        backgroundColor: 'var(--vscode-input-background) !important',
                                    }}
                                    label="Stop button"
                                    iconBefore={<PauseIcon size="small" label="Stop" />}
                                    isDisabled={currentState === State.CancellingResponse}
                                    onClick={() => cancelResponse()}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RovoDevView;
