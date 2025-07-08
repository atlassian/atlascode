import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import LoadingButton from '@atlaskit/button/loading-button';
import SendIcon from '@atlaskit/icon/glyph/send';
import PauseIcon from '@atlaskit/icon/glyph/vid-pause';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from '../../../rovo-dev/rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../messagingApi';
import { ChatMessageItem, renderChatHistory, ToolCallItem, UpdatedFilesComponent } from './common';
import { RovoDevViewResponse, RovoDevViewResponseType } from './rovoDevViewMessages';
import * as styles from './rovoDevViewStyles';
import {
    ChatMessage,
    isCodeChangeTool,
    parseToolReturnMessage,
    ToolCallMessage,
    ToolReturnGenericMessage,
    ToolReturnParseResult,
} from './utils';

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
    const [sendButtonDisabled, setSendButtonDisabled] = useState(false);
    const [currentState, setCurrentState] = useState(State.WaitingForPrompt);
    const [promptContainerFocused, setPromptContainerFocused] = useState(false);

    const [promptText, setPromptText] = useState('');
    const [currentResponse, setCurrentResponse] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [pendingToolCall, setPendingToolCall] = useState<ToolCallMessage | null>(null);

    // const [currentTools, setCurrentTools] = useState<ToolReturnGenericMessage[]>([]);
    const [totalModifiedFiles, setTotalModifiedFiles] = useState<ToolReturnParseResult[]>([]);

    const chatEndRef = React.useRef<HTMLDivElement>(null);

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

    const handleAppendModifiedFileToolReturns = useCallback(
        (toolReturn: ToolReturnGenericMessage) => {
            if (isCodeChangeTool(toolReturn.tool_name)) {
                const msg = parseToolReturnMessage(toolReturn).filter((msg) => msg.filePath);
                setTotalModifiedFiles((prev) => {
                    // Ensure unique file paths
                    return Array.from(new Map([...prev, ...msg].map((item) => [item.filePath, item])).values());
                });
            }
        },
        [setTotalModifiedFiles],
    );

    const removeModifiedFileToolReturns = useCallback(
        (filePaths: string[]) => {
            setTotalModifiedFiles((prev) => prev.filter((x) => !filePaths.includes(x.filePath!)));
        },
        [setTotalModifiedFiles],
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

    const handleResponse = useCallback(
        (data: RovoDevResponse) => {
            console.log('Received response data:', data);
            switch (data.event_kind) {
                case 'text':
                    if (!data.content) {
                        break;
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
                    completeMessage(true);
                    handleAppendChatHistory(returnMessage);
                    handleAppendModifiedFileToolReturns(returnMessage);
                    break;

                default:
                    appendCurrentResponse(`\n\nUnknown part_kind: ${data.event_kind}\n\n`);
                    break;
            }
        },
        [
            appendCurrentResponse,
            completeMessage,
            handleAppendChatHistory,
            handleAppendModifiedFileToolReturns,
            pendingToolCall,
        ],
    );

    const onMessageHandler = useCallback(
        (event: RovoDevProviderMessage): void => {
            switch (event.type) {
                case RovoDevProviderMessageType.PromptSent:
                    // Disable the send button, and enable the pause button
                    setSendButtonDisabled(true);
                    setCurrentState(State.GeneratingResponse);
                    setCurrentResponse('...');
                    break;

                case RovoDevProviderMessageType.Response:
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.UserChatMessage:
                    completeMessage();
                    handleAppendChatHistory(event.message);
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    completeMessage(true);
                    setSendButtonDisabled(false);
                    setCurrentState(State.WaitingForPrompt);

                    setPendingToolCall(null);

                    break;

                case RovoDevProviderMessageType.ToolCall:
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.ToolReturn:
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.ErrorMessage:
                    completeMessage();
                    handleAppendChatHistory(event.message);
                    setCurrentResponse('');
                    setSendButtonDisabled(false);
                    setCurrentState(State.WaitingForPrompt);
                    setPendingToolCall(null);
                    break;

                case RovoDevProviderMessageType.NewSession:
                    setChatHistory([]);
                    setPendingToolCall(null);
                    break;

                case RovoDevProviderMessageType.Initialized:
                    setSendButtonDisabled(false);
                    break;

                case RovoDevProviderMessageType.CancelFailed:
                    if (currentState === State.CancellingResponse) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    break;

                default:
                    console.warn('Unknown message type:', (event as any).type);
                    break;
            }
        },
        [handleResponse, completeMessage, handleAppendChatHistory, currentState, setCurrentState],
    );

    const [postMessage, postMessageWithReturn] = useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, any>(
        onMessageHandler,
    );

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
                type: RovoDevViewResponseType.Prompt,
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
            type: RovoDevViewResponseType.CancelResponse,
        });
    }, [postMessage, currentState, setCurrentState]);

    const openFile = useCallback(
        (filePath: string, tryShowDiff?: boolean, range?: number[]) => {
            postMessage({
                type: RovoDevViewResponseType.OpenFile,
                filePath,
                tryShowDiff: !!tryShowDiff,
                range: range && range.length === 2 ? range : undefined,
            });
        },
        [postMessage],
    );

    const undoFiles = useCallback(
        (filePaths: string[]) => {
            postMessage({
                type: RovoDevViewResponseType.UndoFiles,
                filePaths,
            });
            removeModifiedFileToolReturns(filePaths);
        },
        [postMessage, removeModifiedFileToolReturns],
    );

    const acceptFiles = useCallback(
        (filePaths: string[]) => {
            postMessage({
                type: RovoDevViewResponseType.AcceptFiles,
                filePaths,
            });
            removeModifiedFileToolReturns(filePaths);
        },
        [postMessage, removeModifiedFileToolReturns],
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

    // Function to get the original text of a file for planning diff
    const getOriginalText = useCallback(
        async (filePath: string, range?: number[]) => {
            const uniqueNonce = `${Math.random()}-${Date.now()}`; // Unique identifier for the request
            const res = await postMessageWithReturn(
                {
                    type: RovoDevViewResponseType.GetOriginalText,
                    filePath,
                    range: range && range.length === 2 ? range : undefined,
                    requestId: uniqueNonce, // Unique identifier for the request
                },
                RovoDevProviderMessageType.ReturnText,
                1500,
                uniqueNonce,
            );

            return (res.text as string) || '';
        },
        [postMessageWithReturn],
    );

    return (
        <div className="rovoDevChat" style={styles.rovoDevContainerStyles}>
            <div style={styles.chatMessagesContainerStyles}>
                {chatHistory.map((msg, index) => renderChatHistory(msg, index, openFile, getOriginalText))}
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
                            openFile={openFile}
                        />
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div style={styles.rovoDevInputSectionStyles}>
                <UpdatedFilesComponent
                    modifiedFiles={totalModifiedFiles}
                    onUndo={undoFiles}
                    onAccept={acceptFiles}
                    openDiff={openFile}
                    onCreatePR={() => {
                        postMessage({
                            type: RovoDevViewResponseType.CreatePR,
                        });
                    }}
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
