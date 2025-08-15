import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import CloseIcon from '@atlaskit/icon/core/close';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';
import { RovoDevContext, RovoDevContextItem, RovoDevInitState, State } from 'src/rovo-dev/rovoDevTypes';
import { v4 } from 'uuid';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from '../../../rovo-dev/rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../messagingApi';
import { ChatStream } from './messaging/ChatStream';
import { PromptInputBox } from './prompt-box/prompt-input/PromptInput';
import { PromptContextCollection } from './prompt-box/promptContext/promptContextCollection';
import { UpdatedFilesComponent } from './prompt-box/updated-files/UpdatedFilesComponent';
import { ModifiedFile, RovoDevViewResponse, RovoDevViewResponseType } from './rovoDevViewMessages';
import { DEFAULT_LOADING_MESSAGE, parseToolCallMessage } from './tools/ToolCallItem';
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
export const AiGenerativeTextSummaryIcon = () => (
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

export const CloseIconDeepPlan: React.FC<{}> = () => {
    return (
        <span style={{ zoom: '0.5' }}>
            <CloseIcon label="" />
        </span>
    );
};

const RovoDevView: React.FC = () => {
    const [chatStream, setChatStream] = useState<MessageBlockDetails[]>([]);
    const [currentMessage, setCurrentMessage] = useState<DefaultMessage | null>(null);
    const [curThinkingMessages, setCurThinkingMessages] = useState<ChatMessage[]>([]);

    const [currentState, setCurrentState] = useState(State.WaitingForPrompt);
    const [initState, setInitState] = useState(
        process.env.ROVODEV_BBY ? RovoDevInitState.Initialized : RovoDevInitState.NotInitialized,
    );

    const [downloadProgress, setDownloadProgress] = useState<[number, number]>([0, 0]);
    const [promptText, setPromptText] = useState('');
    const [pendingToolCallMessage, setPendingToolCallMessage] = useState('');
    const [retryAfterErrorEnabled, setRetryAfterErrorEnabled] = useState('');
    const [totalModifiedFiles, setTotalModifiedFiles] = useState<ToolReturnParseResult[]>([]);
    const [isDeepPlanCreated, setIsDeepPlanCreated] = useState(false);
    const [isDeepPlanToggled, setIsDeepPlanToggled] = useState(false);
    const [workspaceCount, setWorkspaceCount] = useState(process.env.ROVODEV_BBY ? 1 : 0);

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
    }, [setCurrentState, setPendingToolCallMessage, setIsDeepPlanToggled, dispatch, totalModifiedFiles]);

    const handleAppendError = useCallback((msg: ErrorMessage) => {
        setChatStream((prev) => {
            setRetryAfterErrorEnabled(msg.isRetriable ? msg.uid : '');

            return [...prev, msg];
        });
    }, []);

    const validateResponseFinalized = useCallback(() => {
        // setChatHistory here is used to ensure we are accessing the most up-to-date state
        // if we use setHistory, we would not
        setChatStream((prev) => {
            const last = prev[prev.length - 1];
            if (!Array.isArray(last) && last?.source === 'User') {
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

    const removeModifiedFileToolReturns = useCallback(
        (files: ToolReturnParseResult[]) => {
            setTotalModifiedFiles((prev) => prev.filter((x) => !files.includes(x)));
        },
        [setTotalModifiedFiles],
    );

    const keepFiles = useCallback(
        (files: ToolReturnParseResult[]) => {
            dispatch({
                type: RovoDevViewResponseType.KeepFileChanges,
                files: files.map((file) => ({ filePath: file.filePath, type: file.type }) as ModifiedFile),
            });
            removeModifiedFileToolReturns(files);
        },
        [dispatch, removeModifiedFileToolReturns],
    );

    const undoFiles = useCallback(
        (files: ToolReturnParseResult[]) => {
            dispatch({
                type: RovoDevViewResponseType.UndoFileChanges,
                files: files.map((file) => ({ filePath: file.filePath, type: file.type }) as ModifiedFile),
            });
            removeModifiedFileToolReturns(files);
        },
        [dispatch, removeModifiedFileToolReturns],
    );

    const clearChatHistory = useCallback(() => {
        setChatStream([]);
        keepFiles(totalModifiedFiles);
        setTotalModifiedFiles([]);
        setIsDeepPlanCreated(false);
        setCurThinkingMessages([]);
        setCurrentMessage(null);
    }, [totalModifiedFiles, keepFiles]);

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
        (data: RovoDevResponse, isReplay?: boolean) => {
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

                    setPendingToolCallMessage(DEFAULT_LOADING_MESSAGE); // Clear pending tool call
                    handleAppendToolReturn(returnMessage);
                    if (!isReplay) {
                        handleAppendModifiedFileToolReturns(returnMessage);
                    }
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
                    setIsDeepPlanToggled(event.enable_deep_plan || false);
                    setCurrentState(State.GeneratingResponse);
                    setPendingToolCallMessage(DEFAULT_LOADING_MESSAGE);
                    break;

                case RovoDevProviderMessageType.Response:
                    if (currentState === State.WaitingForPrompt) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.UserChatMessage:
                    handleAppendUserPrompt(event.message);
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    if (currentState !== State.WaitingForPrompt) {
                        finalizeResponse();
                        if (!event.isReplay) {
                            validateResponseFinalized();
                        }
                    }
                    break;

                case RovoDevProviderMessageType.ToolCall:
                    if (currentState === State.WaitingForPrompt) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    handleResponse(event.dataObject);
                    break;

                case RovoDevProviderMessageType.ToolReturn:
                    if (currentState === State.WaitingForPrompt) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    const isReplay = event.isReplay || false;
                    handleResponse(event.dataObject, isReplay);
                    break;

                case RovoDevProviderMessageType.ErrorMessage:
                    if (currentState === State.GeneratingResponse || currentState === State.ExecutingPlan) {
                        finalizeResponse();
                    }
                    if (event.message.isProcessTerminated) {
                        setCurrentState(State.ProcessTerminated);
                    }
                    handleAppendError(event.message);
                    break;

                case RovoDevProviderMessageType.NewSession:
                    clearChatHistory();
                    setPendingToolCallMessage('');
                    setCurrentState(State.WaitingForPrompt);
                    break;

                case RovoDevProviderMessageType.SetInitState:
                    setInitState(event.newState);
                    break;

                case RovoDevProviderMessageType.WorkspaceChanged:
                    setWorkspaceCount(event.workspaceCount);
                    setCurrentState(event.workspaceCount ? State.WaitingForPrompt : State.NoWorkspaceOpen);
                    break;

                case RovoDevProviderMessageType.SetDownloadProgress:
                    setDownloadProgress([event.downloadedBytes, event.totalBytes]);
                    break;

                case RovoDevProviderMessageType.CancelFailed:
                    if (currentState === State.CancellingResponse) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    break;

                case RovoDevProviderMessageType.RovoDevDisabled:
                    setCurrentState(State.Disabled);
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
                    setPromptContextCollection((prev) => {
                        const newItem = event.context;
                        const match = (item: any) =>
                            item.file.absolutePath === newItem.file.absolutePath &&
                            item.selection?.start === newItem.selection?.start &&
                            item.selection?.end === newItem.selection?.end;

                        const contextItems = prev.contextItems || [];
                        const idx = contextItems.findIndex(match);
                        // Add new item only if it does not already exist
                        return idx === -1
                            ? {
                                  ...prev,
                                  contextItems: [...contextItems, newItem],
                              }
                            : prev;
                    });
                    break;

                case RovoDevProviderMessageType.CreatePRComplete:
                case RovoDevProviderMessageType.GetCurrentBranchNameComplete:
                case RovoDevProviderMessageType.CheckGitChangesComplete:
                    break; // This is handled elsewhere

                default:
                    // this is never supposed to happen since there aren't other type of messages
                    handleAppendError({
                        source: 'RovoDevError',
                        // @ts-expect-error ts(2339) - event here should be 'never'
                        text: `Unknown message type: ${event.type}`,
                        isRetriable: false,
                        uid: v4(),
                    });
                    break;
            }
        },
        [
            handleResponse,
            handleAppendUserPrompt,
            finalizeResponse,
            validateResponseFinalized,
            clearChatHistory,
            handleAppendError,
            setInitState,
            currentState,
        ],
    );

    const { postMessage, postMessagePromise } = useMessagingApi<
        RovoDevViewResponse,
        RovoDevProviderMessage,
        RovoDevProviderMessage
    >(onMessageHandler);

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
            if (text.trim() === '' || currentState !== State.WaitingForPrompt) {
                return;
            }

            if (isDeepPlanCreated) {
                setIsDeepPlanCreated(false);
            }

            // Disable the send button, and enable the pause button
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
        [currentState, isDeepPlanCreated, isDeepPlanToggled, postMessage, promptContextCollection],
    );

    // On the first render, get the context update
    React.useEffect(() => {
        postMessage?.({
            type: RovoDevViewResponseType.ForceUserFocusUpdate,
        });
    }, [postMessage]);

    // Notify the backend that the webview is ready
    // This is used to initialize the process manager if needed
    // and to signal that the webview is ready to receive messages
    React.useEffect(() => {
        postMessage?.({
            type: RovoDevViewResponseType.WebviewReady,
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

    const isRetryAfterErrorButtonEnabled = useCallback(
        (uid: string) => retryAfterErrorEnabled === uid,
        [retryAfterErrorEnabled],
    );

    const onChangesGitPushed = useCallback(
        (msg: DefaultMessage, pullRequestCreated: boolean) => {
            if (totalModifiedFiles.length > 0) {
                keepFiles(totalModifiedFiles);
            }

            setChatStream((prev) => [...prev, msg]);

            postMessage({
                type: RovoDevViewResponseType.ReportChangesGitPushed,
                pullRequestCreated,
            });
        },
        [keepFiles, setChatStream, postMessage, totalModifiedFiles],
    );

    const onCollapsiblePanelExpanded = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.ReportThinkingDrawerExpanded,
        });
    }, [postMessage]);

    return (
        <div className="rovoDevChat">
            <ChatStream
                chatHistory={chatStream}
                currentThinking={curThinkingMessages}
                currentMessage={currentMessage}
                renderProps={{
                    openFile,
                    isRetryAfterErrorButtonEnabled,
                    retryPromptAfterError,
                }}
                messagingApi={{
                    postMessage,
                    postMessagePromise,
                }}
                pendingToolCall={pendingToolCallMessage}
                deepPlanCreated={isDeepPlanCreated}
                executeCodePlan={executeCodePlan}
                state={currentState}
                initState={initState}
                downloadProgress={downloadProgress}
                onChangesGitPushed={onChangesGitPushed}
                onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
            />
            <div className="input-section-container">
                <UpdatedFilesComponent
                    modifiedFiles={totalModifiedFiles}
                    onUndo={undoFiles}
                    onKeep={keepFiles}
                    openDiff={openFile}
                    actionsEnabled={currentState === State.WaitingForPrompt}
                />
                <div className="prompt-container">
                    <PromptContextCollection
                        content={promptContextCollection}
                        readonly={false}
                        onRemoveContext={(item: RovoDevContextItem) => {
                            setPromptContextCollection((prev) => ({
                                ...prev,
                                contextItems: prev.contextItems?.filter(
                                    (contextItem) =>
                                        contextItem.file.absolutePath !== item.file.absolutePath ||
                                        contextItem.selection?.start !== item.selection?.start ||
                                        contextItem.selection?.end !== item.selection?.end,
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
                    <PromptInputBox
                        disabled={
                            workspaceCount === 0 ||
                            currentState === State.Disabled ||
                            currentState === State.ProcessTerminated
                        }
                        hideButtons={workspaceCount === 0 || currentState === State.Disabled}
                        state={currentState}
                        promptText={promptText}
                        onPromptTextChange={(element) => setPromptText(element)}
                        isDeepPlanEnabled={isDeepPlanToggled}
                        onDeepPlanToggled={() => setIsDeepPlanToggled(!isDeepPlanToggled)}
                        onSend={sendPrompt}
                        onCancel={cancelResponse}
                        sendButtonDisabled={currentState !== State.WaitingForPrompt}
                        onAddContext={() => {
                            postMessage({
                                type: RovoDevViewResponseType.AddContext,
                                currentContext: promptContextCollection,
                            });
                        }}
                    />
                </div>
                <div className="ai-disclaimer">Uses AI. Verify Results</div>
            </div>
        </div>
    );
};

export default RovoDevView;
