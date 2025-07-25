import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import LoadingButton from '@atlaskit/button/loading-button';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import CloseIcon from '@atlaskit/icon/core/close';
import StopIcon from '@atlaskit/icon/core/video-stop';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';
import { RovoDevContext } from 'src/rovo-dev/rovoDevTypes';
import { v4 } from 'uuid';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from '../../../rovo-dev/rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../messagingApi';
import { UpdatedFilesComponent } from './common/common';
import { ChatStream } from './messaging/ChatStream';
import { PromptContextCollection } from './promptContext/promptContextCollection';
import { RovoDevViewResponse, RovoDevViewResponseType } from './rovoDevViewMessages';
import * as styles from './rovoDevViewStyles';
import { parseToolCallMessage } from './tools/ToolCallItem';
import {
    ChatMessage,
    CODE_PLAN_EXECUTE_PROMPT,
    DefaultMessage,
    ErrorMessage,
    isCodeChangeTool,
    MessageBlockDetails,
    parseToolReturnMessage,
    ToolCallMessage,
    ToolReturnGenericMessage,
    ToolReturnParseResult,
} from './utils';

// TODO - replace with @atlaskit/icon implementation
const AiGenerativeTextSummaryIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        role="presentation"
        style={{ width: '16px', height: '16px', overflow: 'hidden', verticalAlign: 'bottom' }}
    >
        <path
            d="M0 0H14V1.5H0V0ZM0 4.1663H14V5.6663H0V4.1663ZM10.7958 8.49428C10.9038 8.19825 11.1853 8.00129 11.5004 8.00129C11.8155 8.00129 12.0975 8.19825 12.2055 8.49428L12.8206 10.1807L14.507 10.7958C14.803 10.9038 15 11.1853 15 11.5004C15 11.8155 14.803 12.0975 14.507 12.2055L12.8206 12.8206L12.2055 14.507C12.0975 14.803 11.816 15 11.5009 15C11.1858 15 10.9038 14.803 10.7958 14.507L10.1807 12.8206L8.49428 12.2055C8.19825 12.0975 8.00129 11.816 8.00129 11.5009C8.00129 11.1858 8.19825 10.9038 8.49428 10.7958L10.1807 10.1807L10.7958 8.49428ZM0 8.3326H7V9.8326H0V8.3326ZM0 12.4989H5V13.9989H0V12.4989Z"
            fill="currentColor"
        />
    </svg>
);

const CloseIconDeepPlan: React.FC<{}> = () => {
    return (
        <span style={{ zoom: '0.5' }}>
            <CloseIcon label="" />
        </span>
    );
};

export const enum State {
    WaitingForPrompt,
    GeneratingResponse,
    CancellingResponse,
    ExecutingPlan,
}

const TextAreaMessages: Record<State, string> = {
    [State.WaitingForPrompt]: 'Type in a question',
    [State.GeneratingResponse]: 'Generating response...',
    [State.CancellingResponse]: 'Cancelling the response...',
    [State.ExecutingPlan]: 'Executing the code plan...',
};

const RovoDevView: React.FC = () => {
    const [chatStream, setChatStream] = useState<MessageBlockDetails[]>([]);
    const [currentMessage, setCurrentMessage] = useState<DefaultMessage | null>(null);
    const [curThinkingMessages, setCurThinkingMessages] = useState<ChatMessage[]>([]);

    const [sendButtonDisabled, setSendButtonDisabled] = useState(false);
    const [currentState, setCurrentState] = useState(State.WaitingForPrompt);
    const [promptContainerFocused, setPromptContainerFocused] = useState(false);

    const [promptText, setPromptText] = useState('');
    const [pendingToolCallMessage, setPendingToolCallMessage] = useState('');
    const [retryAfterErrorEnabled, setRetryAfterErrorEnabled] = useState('');
    const [totalModifiedFiles, setTotalModifiedFiles] = useState<ToolReturnParseResult[]>([]);
    const [isDeepPlanCreated, setIsDeepPlanCreated] = useState(false);
    const [isDeepPlanToggled, setIsDeepPlanToggled] = useState(false);

    const [outgoingMessage, dispatch] = useState<RovoDevViewResponse | undefined>(undefined);

    React.useEffect(() => {
        if (currentState === State.WaitingForPrompt) {
            if (curThinkingMessages.length > 0) {
                setChatStream((prev) => [...prev, curThinkingMessages]);
                setCurThinkingMessages([]);
            }
            if (currentMessage) {
                setChatStream((prev) => [...prev, currentMessage]);
            }
            setCurrentMessage(null);
        }

        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [chatStream, curThinkingMessages, currentMessage, currentState, pendingToolCallMessage]);

    const finalizeResponse = useCallback(() => {
        setSendButtonDisabled(false);
        setCurrentState(State.WaitingForPrompt);
        setPendingToolCallMessage('');
        setIsDeepPlanToggled(false);

        const changedFilesCount = totalModifiedFiles.filter(
            (x) => x.type === 'create' || x.type === 'modify' || x.type === 'delete',
        ).length;
        if (changedFilesCount) {
            dispatch({
                type: RovoDevViewResponseType.ReportChangedFilesPanelShown,
                filesCount: changedFilesCount,
            });
        }
    }, [
        setSendButtonDisabled,
        setCurrentState,
        setPendingToolCallMessage,
        setIsDeepPlanToggled,
        dispatch,
        totalModifiedFiles,
    ]);

    const handleAppendError = useCallback((msg: ErrorMessage) => {
        setChatStream((prev) => {
            setRetryAfterErrorEnabled(msg.isRetriable ? msg.uid : '');

            const last = prev[prev.length - 1];
            if (!Array.isArray(last) && last?.source === 'RovoDev' && last.text === '...') {
                prev.pop();
            }
            return [...prev, msg];
        });
    }, []);

    const validateResponseFinalized = useCallback(() => {
        // setChatHistory here is used to ensure we are accessing the most up-to-date state
        // if we use setHistory, we would not
        setChatStream((prev) => {
            const last = prev[prev.length - 1];
            if (!Array.isArray(last) && last?.source === 'RovoDev' && last.text === '...') {
                const msg: ErrorMessage = {
                    source: 'RovoDevError',
                    text: 'Error: something went wrong while processing the prompt',
                    isRetriable: true,
                    uid: v4(),
                };
                setRetryAfterErrorEnabled(msg.uid);
                prev.pop();
                return [...prev, msg];
            } else {
                return prev;
            }
        });
    }, [setChatStream, setRetryAfterErrorEnabled]);

    const clearChatHistory = useCallback(() => {
        setChatStream([]);
        setCurThinkingMessages([]);
        setCurrentMessage(null);
    }, []);

    const handleAppendModifiedFileToolReturns = useCallback(
        (toolReturn: ToolReturnGenericMessage) => {
            if (isCodeChangeTool(toolReturn.tool_name)) {
                const msg = parseToolReturnMessage(toolReturn).filter((msg) => msg.filePath !== undefined);

                const filesMap = new Map([...totalModifiedFiles].map((item) => [item.filePath!, item]));

                // Logic for handling deletions and modifications
                msg.forEach((file) => {
                    if (!file.filePath) {
                        return;
                    }
                    if (file.type === 'delete') {
                        if (filesMap.has(file.filePath)) {
                            const existingFile = filesMap.get(file.filePath);
                            if (existingFile?.type === 'modify') {
                                filesMap.set(file.filePath, file); // If file was only modified but not created by RovoDev, still show deletion
                            } else {
                                filesMap.delete(file.filePath); // If file was created by RovoDev, remove it from the map
                            }
                        } else {
                            filesMap.set(file.filePath, file);
                        }
                    } else {
                        if (!filesMap.has(file.filePath) || filesMap.get(file.filePath)?.type === 'delete') {
                            filesMap.set(file.filePath, file); // Only add on first modification so we can track if file was created by RovoDev or just modified
                        }
                    }
                });

                setTotalModifiedFiles(Array.from(filesMap.values()));
            }
        },
        [totalModifiedFiles],
    );

    const removeModifiedFileToolReturns = useCallback(
        (filePaths: string[]) => {
            setTotalModifiedFiles((prev) => prev.filter((x) => !filePaths.includes(x.filePath!)));
        },
        [setTotalModifiedFiles],
    );

    const handleAppendToolReturn = useCallback(
        (msg: ToolReturnGenericMessage) => {
            if (currentMessage) {
                setCurThinkingMessages((prev) => [...prev, currentMessage]);
                setCurrentMessage(null);
            }

            if (msg.tool_name === 'create_technical_plan') {
                setIsDeepPlanCreated(true);
                if (curThinkingMessages.length > 0) {
                    setChatStream((prev) => [...prev, curThinkingMessages]);
                    setCurThinkingMessages([]);
                }
                setChatStream((prev) => [...prev, msg]);
                return;
            }

            setCurThinkingMessages((prev) => [...prev, msg]);
        },
        [curThinkingMessages, currentMessage],
    );

    const handleAppendUserPrompt = useCallback(
        (msg: ChatMessage) => {
            if (msg.source === 'User') {
                if (curThinkingMessages.length > 0) {
                    setChatStream((prev) => [...prev, curThinkingMessages]);
                    setCurThinkingMessages([]);
                }
                if (currentMessage) {
                    setChatStream((prev) => [...prev, currentMessage]);
                }
                setCurrentMessage(null);
                setChatStream((prev) => [...prev, msg]);
            }
        },
        [curThinkingMessages, currentMessage],
    );

    const handleAppendCurrentResponse = useCallback((text: string) => {
        if (text) {
            setRetryAfterErrorEnabled('');
            setCurrentMessage((prev) => {
                let message: DefaultMessage | null = prev ? { ...prev } : null;
                if (!message) {
                    message = { text, source: 'RovoDev' };
                } else if (message.text === '...') {
                    message.text = text;
                } else {
                    message.text += text;
                }
                return message;
            });
        }
    }, []);

    const handleResponse = useCallback(
        (data: RovoDevResponse) => {
            switch (data.event_kind) {
                case 'text':
                    if (!data.content) {
                        break;
                    }
                    handleAppendCurrentResponse(data.content);
                    break;

                case 'tool-call':
                    const callMessage: ToolCallMessage = {
                        source: 'ToolCall',
                        tool_name: data.tool_name,
                        args: data.args,
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                    };
                    const toolCallMessage = parseToolCallMessage(callMessage);
                    setPendingToolCallMessage(toolCallMessage);
                    break;

                case 'tool-return':
                    const returnMessage: ToolReturnGenericMessage = {
                        source: 'ToolReturn',
                        tool_name: data.tool_name,
                        content: data.content || '',
                        parsedContent: data.parsedContent,
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                        args: data.toolCallMessage.args,
                    };

                    setPendingToolCallMessage(''); // Clear pending tool call
                    handleAppendToolReturn(returnMessage);
                    handleAppendModifiedFileToolReturns(returnMessage);
                    break;

                case 'retry-prompt':
                    const msg: ToolReturnGenericMessage = {
                        source: 'RovoDevRetry',
                        tool_name: data.tool_name,
                        content: data.content || '',
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                    };

                    handleAppendToolReturn(msg);
                    break;

                default:
                    handleAppendCurrentResponse(`\n\nUnknown part_kind: ${data.event_kind}\n\n`);
                    break;
            }
        },
        [handleAppendCurrentResponse, handleAppendModifiedFileToolReturns, handleAppendToolReturn],
    );

    const onMessageHandler = useCallback(
        (event: RovoDevProviderMessage): void => {
            switch (event.type) {
                case RovoDevProviderMessageType.PromptSent:
                    // Disable the send button, and enable the pause button
                    setSendButtonDisabled(true);
                    setIsDeepPlanToggled(event.enable_deep_plan || false);
                    setCurrentState(State.GeneratingResponse);
                    handleAppendCurrentResponse('...');
                    break;

                case RovoDevProviderMessageType.Response:
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.UserChatMessage:
                    handleAppendUserPrompt(event.message);
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    finalizeResponse();
                    validateResponseFinalized();
                    break;

                case RovoDevProviderMessageType.ToolCall:
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.ToolReturn:
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.ErrorMessage:
                    handleAppendError(event.message);
                    finalizeResponse();
                    break;

                case RovoDevProviderMessageType.NewSession:
                    clearChatHistory();
                    setPendingToolCallMessage('');
                    break;

                case RovoDevProviderMessageType.Initialized:
                    setSendButtonDisabled(false);
                    break;

                case RovoDevProviderMessageType.CancelFailed:
                    if (currentState === State.CancellingResponse) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    break;
                case RovoDevProviderMessageType.UserFocusUpdated:
                    setPromptContextCollection((prev) => ({
                        ...prev,
                        focusInfo: {
                            ...event.userFocus,
                            enabled: prev.focusInfo?.enabled ?? true, // Preserve enabled state if it exists
                        },
                    }));
                    break;
                case RovoDevProviderMessageType.ContextAdded:
                    setPromptContextCollection((prev) => ({
                        ...prev,
                        contextItems: [...(prev.contextItems || []), event.context],
                    }));
                    break;

                case RovoDevProviderMessageType.ReturnText:
                case RovoDevProviderMessageType.CreatePRComplete:
                case RovoDevProviderMessageType.GetCurrentBranchNameComplete:
                    break; // This is handled elsewhere
                default:
                    handleAppendError({
                        source: 'RovoDevError',
                        // event.type complains if this is unreachable
                        // @ts-expect-error ts(2339)
                        text: `Unknown message type: ${event.type}`,
                        isRetriable: false,
                        uid: v4(),
                    });
                    break;
            }
        },
        [
            handleAppendCurrentResponse,
            handleResponse,
            handleAppendUserPrompt,
            finalizeResponse,
            validateResponseFinalized,
            clearChatHistory,
            currentState,
            handleAppendError,
        ],
    );

    const [postMessage, postMessageWithReturn] = useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, any>(
        onMessageHandler,
    );

    React.useEffect(() => {
        if (outgoingMessage) {
            postMessage(outgoingMessage);
            dispatch(undefined);
        }
    }, [postMessage, dispatch, outgoingMessage]);

    // TODO: move this to a separate component, colocate with prompt submission
    const [promptContextCollection, setPromptContextCollection] = useState<RovoDevContext>({});

    const sendPrompt = useCallback(
        (text: string): void => {
            if (sendButtonDisabled || text.trim() === '' || currentState !== State.WaitingForPrompt) {
                return;
            }

            if (isDeepPlanCreated) {
                setIsDeepPlanCreated(false);
            }

            // Disable the send button, and enable the pause button
            setSendButtonDisabled(true);
            setCurrentState(State.GeneratingResponse);

            // Send the prompt to backend
            postMessage({
                type: RovoDevViewResponseType.Prompt,
                text,
                enable_deep_plan: isDeepPlanToggled,
                context: { ...promptContextCollection },
            });

            // Clear the input field
            setPromptText('');
        },
        [sendButtonDisabled, currentState, isDeepPlanCreated, isDeepPlanToggled, postMessage, promptContextCollection],
    );

    // On the first render, get the context update
    React.useEffect(() => {
        postMessage?.({
            type: RovoDevViewResponseType.ForceUserFocusUpdate,
        });
    }, [postMessage]);

    const executeCodePlan = useCallback(() => {
        if (currentState !== State.WaitingForPrompt) {
            return;
        }
        setCurrentState(State.ExecutingPlan);
        sendPrompt(CODE_PLAN_EXECUTE_PROMPT);
    }, [currentState, sendPrompt]);

    const retryPromptAfterError = useCallback((): void => {
        // Disable the send button, and enable the pause button
        setSendButtonDisabled(true);
        setCurrentState(State.GeneratingResponse);

        postMessage({
            type: RovoDevViewResponseType.RetryPromptAfterError,
        });
    }, [postMessage]);

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
                type: RovoDevViewResponseType.UndoFileChanges,
                filePaths,
            });
            removeModifiedFileToolReturns(filePaths);
        },
        [postMessage, removeModifiedFileToolReturns],
    );

    const keepFiles = useCallback(
        (filePaths: string[]) => {
            postMessage({
                type: RovoDevViewResponseType.KeepFileChanges,
                filePaths,
            });
            removeModifiedFileToolReturns(filePaths);
        },
        [postMessage, removeModifiedFileToolReturns],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey && currentState === State.WaitingForPrompt) {
                event.preventDefault();
                sendPrompt(promptText);
            }
        },
        [currentState, sendPrompt, promptText],
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

    const isRetryAfterErrorButtonEnabled = useCallback(
        (uid: string) => retryAfterErrorEnabled === uid,
        [retryAfterErrorEnabled],
    );

    return (
        <div className="rovoDevChat" style={styles.rovoDevContainerStyles}>
            <ChatStream
                chatHistory={chatStream}
                currentThinking={curThinkingMessages}
                currentMessage={currentMessage}
                renderProps={{
                    openFile,
                    isRetryAfterErrorButtonEnabled,
                    retryPromptAfterError,
                    getOriginalText,
                }}
                messagingApi={{
                    postMessage,
                    postMessageWithReturn,
                }}
                pendingToolCall={pendingToolCallMessage}
                deepPlanCreated={isDeepPlanCreated}
                executeCodePlan={executeCodePlan}
                state={currentState}
                modifiedFiles={totalModifiedFiles}
                injectMessage={(msg: DefaultMessage) => {
                    setChatStream((prev) => [...prev, msg]);
                }}
                keepAllFileChanges={() => {
                    if (totalModifiedFiles.length > 0) {
                        keepFiles(totalModifiedFiles.map((file) => file.filePath!));
                    }
                }}
            />
            <div style={styles.rovoDevInputSectionStyles}>
                <UpdatedFilesComponent
                    modifiedFiles={totalModifiedFiles}
                    onUndo={undoFiles}
                    onKeep={keepFiles}
                    openDiff={openFile}
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
                        {' '}
                        <PromptContextCollection
                            content={promptContextCollection}
                            readonly={false}
                            onAddContext={async () => {
                                postMessage({
                                    type: RovoDevViewResponseType.AddContext,
                                    currentContext: promptContextCollection,
                                });
                            }}
                            onRemoveContext={(filePath) => {
                                setPromptContextCollection((prev) => ({
                                    ...prev,
                                    contextItems: prev.contextItems?.filter(
                                        (item) => item.file.absolutePath !== filePath,
                                    ),
                                }));
                            }}
                            onToggleActiveItem={(enabled) => {
                                setPromptContextCollection((prev) => {
                                    if (!prev.focusInfo) {
                                        return prev;
                                    }
                                    return {
                                        ...prev,
                                        focusInfo: {
                                            ...prev.focusInfo,
                                            enabled,
                                        },
                                    };
                                });
                            }}
                        />
                        <textarea
                            style={{ ...{ 'field-sizing': 'content' }, ...styles.rovoDevTextareaStyles }}
                            placeholder={TextAreaMessages[currentState]}
                            onChange={(element) => setPromptText(element.target.value)}
                            onKeyDown={handleKeyDown}
                            value={promptText}
                        />
                        <div style={styles.rovoDevButtonStyles}>
                            <LoadingButton
                                style={{
                                    ...styles.rovoDevDeepPlanStylesSelector(
                                        isDeepPlanToggled,
                                        currentState !== State.WaitingForPrompt,
                                    ),
                                }}
                                spacing="compact"
                                label="Enable deep plan"
                                iconBefore={<AiGenerativeTextSummaryIcon />}
                                iconAfter={isDeepPlanToggled ? <CloseIconDeepPlan /> : undefined}
                                isDisabled={currentState !== State.WaitingForPrompt}
                                onClick={() => setIsDeepPlanToggled(!isDeepPlanToggled)}
                            >
                                {isDeepPlanToggled ? 'Deep plan enabled' : ''}
                            </LoadingButton>
                            {currentState === State.WaitingForPrompt && (
                                <LoadingButton
                                    style={{
                                        ...styles.rovoDevPromptButtonStyles,
                                        color: 'var(--vscode-button-foreground) !important',
                                        backgroundColor: 'var(--vscode-button-background)',
                                    }}
                                    spacing="compact"
                                    label="Send prompt"
                                    iconBefore={<SendIcon label="Send prompt" />}
                                    isDisabled={sendButtonDisabled}
                                    onClick={() => sendPrompt(promptText)}
                                />
                            )}
                            {currentState !== State.WaitingForPrompt && (
                                <LoadingButton
                                    style={styles.rovoDevPromptButtonStyles}
                                    spacing="compact"
                                    label="Stop"
                                    iconBefore={<StopIcon label="Stop" />}
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
