import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import CloseIcon from '@atlaskit/icon/core/close';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';
import { RovoDevContext, RovoDevContextItem, RovoDevInitState, State, SubState } from 'src/rovo-dev/rovoDevTypes';
import { v4 } from 'uuid';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from '../../../rovo-dev/rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../messagingApi';
import { FeedbackType } from './feedback-form/FeedbackForm';
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
    extractLastNMessages,
    isCodeChangeTool,
    parseToolReturnMessage,
    Response,
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
    const [currentState, setCurrentState] = useState(State.WaitingForPrompt);
    const [currentSubState, setCurrentSubState] = useState(SubState.None);
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

    const [history, setHistory] = useState<Response[]>([]);

    const [isFeedbackFormVisible, setIsFeedbackFormVisible] = React.useState(false);

    const [outgoingMessage, dispatch] = useState<RovoDevViewResponse | undefined>(undefined);

    React.useEffect(() => {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [history, currentState, pendingToolCallMessage]);

    const validateResponseFinalized = useCallback(() => {
        setHistory((prev) => {
            const last = prev[prev.length - 1];
            if (!Array.isArray(last) && last?.source === 'User') {
                const msg: ErrorMessage = {
                    source: 'RovoDevError',
                    type: 'error',
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
    }, [setRetryAfterErrorEnabled]);

    const removeModifiedFileToolReturns = useCallback(
        (files: ToolReturnParseResult[]) => {
            setTotalModifiedFiles((prev) => prev.filter((x) => !files.includes(x)));
        },
        [setTotalModifiedFiles],
    );

    const keepFiles = useCallback(
        (files: ToolReturnParseResult[]) => {
            if (files.length === 0) {
                return;
            }
            dispatch({
                type: RovoDevViewResponseType.KeepFileChanges,
                files: files.map(
                    (file) =>
                        ({
                            filePath: file.filePath,
                            type: file.type,
                        }) as ModifiedFile,
                ),
            });
            removeModifiedFileToolReturns(files);
        },
        [dispatch, removeModifiedFileToolReturns],
    );

    const undoFiles = useCallback(
        (files: ToolReturnParseResult[]) => {
            dispatch({
                type: RovoDevViewResponseType.UndoFileChanges,
                files: files.map(
                    (file) =>
                        ({
                            filePath: file.filePath,
                            type: file.type,
                        }) as ModifiedFile,
                ),
            });
            removeModifiedFileToolReturns(files);
        },
        [dispatch, removeModifiedFileToolReturns],
    );

    const finalizeResponse = useCallback(() => {
        setPendingToolCallMessage('');
        setCurrentState(State.WaitingForPrompt);
    }, []);

    const clearChatHistory = useCallback(() => {
        setHistory([]);
        keepFiles(totalModifiedFiles);
        setTotalModifiedFiles([]);
        setIsDeepPlanCreated(false);
        setIsFeedbackFormVisible(false);
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

    const appendResponse = useCallback(
        (response: Response) => {
            setHistory((prev) => {
                if (!response) {
                    return prev;
                }

                const latest = prev.pop();

                if (!Array.isArray(response)) {
                    if (!Array.isArray(latest)) {
                        // Streaming text response, append to current message
                        if (latest && latest.source === 'RovoDev' && response.source === 'RovoDev') {
                            latest.text += response.text;
                            return [...prev, latest];
                        }
                        // Group tool return with previous message if applicable
                        if (response.source === 'ToolReturn') {
                            handleAppendModifiedFileToolReturns(response);
                            if (response.tool_name !== 'create_technical_plan') {
                                // Do not group if User or Error message is the latest
                                const canGroup =
                                    latest &&
                                    latest.source !== 'User' &&
                                    latest.source !== 'RovoDevError' &&
                                    latest.source !== 'PullRequest';

                                let thinkingGroup: ChatMessage[] = canGroup ? [latest, response] : [response];

                                if (canGroup) {
                                    const prevGroup = prev.pop();
                                    // if previous message is also a thinking group, merge them
                                    if (Array.isArray(prevGroup)) {
                                        thinkingGroup = [...prevGroup, ...thinkingGroup];
                                    } else {
                                        if (prevGroup) {
                                            prev.push(prevGroup);
                                        }
                                    }
                                }
                                return [...prev, thinkingGroup];
                            }
                        }
                    } else {
                        if (response.source === 'ToolReturn') {
                            handleAppendModifiedFileToolReturns(response);
                            if (response.tool_name !== 'create_technical_plan') {
                                latest.push(response);
                                return [...prev, latest];
                            }
                        }
                        return [...prev, latest, response];
                    }
                }

                if (latest) {
                    return [...prev, latest, response];
                } else {
                    return [...prev, response];
                }
            });
        },
        [handleAppendModifiedFileToolReturns],
    );

    const onMessageHandler = useCallback(
        (event: RovoDevProviderMessage): void => {
            let object: RovoDevResponse;
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
                    object = event.dataObject;
                    if (object.event_kind === 'text' && object.content) {
                        const msg: ChatMessage = {
                            text: object.content || '',
                            source: 'RovoDev',
                        };
                        appendResponse(msg);
                    }
                    break;

                case RovoDevProviderMessageType.UserChatMessage:
                    appendResponse(event.message);
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    if (
                        currentState === State.GeneratingResponse ||
                        currentState === State.ExecutingPlan ||
                        currentState === State.CancellingResponse
                    ) {
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
                    object = event.dataObject;
                    if (object.event_kind !== 'tool-call') {
                        break;
                    }
                    const callMessage: ToolCallMessage = {
                        source: 'ToolCall',
                        tool_name: object.tool_name,
                        args: object.args,
                        tool_call_id: object.tool_call_id, // Optional ID for tracking
                    };
                    const toolCallMessage = parseToolCallMessage(callMessage);
                    setPendingToolCallMessage(toolCallMessage);
                    break;

                case RovoDevProviderMessageType.ToolReturn:
                    if (currentState === State.WaitingForPrompt) {
                        setCurrentState(State.GeneratingResponse);
                    }
                    object = event.dataObject;
                    if (object.event_kind !== 'tool-return') {
                        break;
                    }
                    const returnMessage: ToolReturnGenericMessage = {
                        source: 'ToolReturn',
                        tool_name: object.tool_name,
                        content: object.content || '',
                        parsedContent: object.parsedContent,
                        tool_call_id: object.tool_call_id, // Optional ID for tracking
                        args: object.toolCallMessage.args,
                    };

                    setPendingToolCallMessage(DEFAULT_LOADING_MESSAGE); // Clear pending tool call
                    appendResponse(returnMessage);
                    break;

                case RovoDevProviderMessageType.ErrorMessage:
                    if (event.message.type === 'error') {
                        if (event.message.isProcessTerminated) {
                            setCurrentState(State.ProcessTerminated);
                        }
                        finalizeResponse();
                    }
                    const msg = event.message;
                    setRetryAfterErrorEnabled(msg.isRetriable ? msg.uid : '');
                    appendResponse(msg);
                    break;

                case RovoDevProviderMessageType.ClearChat:
                    clearChatHistory();
                    setPendingToolCallMessage('');
                    setCurrentState(State.WaitingForPrompt);
                    break;

                case RovoDevProviderMessageType.SetInitState:
                    setInitState(event.newState);
                    setCurrentState(State.WaitingForPrompt);
                    setCurrentSubState(SubState.None);
                    break;

                case RovoDevProviderMessageType.ProviderReady:
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
                    if (
                        currentState === State.GeneratingResponse ||
                        currentState === State.ExecutingPlan ||
                        currentState === State.CancellingResponse
                    ) {
                        finalizeResponse();
                    }
                    clearChatHistory();
                    setCurrentState(State.Disabled);
                    if (event.reason === 'needAuth') {
                        setCurrentSubState(SubState.NeedAuth);
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

                case RovoDevProviderMessageType.ForceStop:
                    // Signal user that Rovo Dev is stopping
                    if (currentState === State.GeneratingResponse || currentState === State.ExecutingPlan) {
                        setCurrentState(State.CancellingResponse);
                    }
                    break;

                case RovoDevProviderMessageType.ShowFeedbackForm:
                    setIsFeedbackFormVisible(true);
                    break;
                default:
                    // this is never supposed to happen since there aren't other type of messages
                    appendResponse({
                        source: 'RovoDevError',
                        type: 'error',
                        // @ts-expect-error ts(2339) - event here should be 'never'
                        text: `Unknown message type: ${event.type}`,
                        isRetriable: false,
                        uid: v4(),
                    });
                    break;
            }
        },
        [currentState, appendResponse, clearChatHistory, finalizeResponse, validateResponseFinalized],
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
            dispatch({
                type: RovoDevViewResponseType.Prompt,
                text,
                enable_deep_plan: isDeepPlanToggled,
                context: { ...promptContextCollection },
            });

            // Clear the input field
            setPromptText('');
        },
        [currentState, isDeepPlanCreated, isDeepPlanToggled, setCurrentState, promptContextCollection],
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
    }, [currentState, setCurrentState, sendPrompt]);

    const retryPromptAfterError = useCallback((): void => {
        setCurrentState(State.GeneratingResponse);
        setRetryAfterErrorEnabled('');

        postMessage({
            type: RovoDevViewResponseType.RetryPromptAfterError,
        });
    }, [setCurrentState, postMessage]);

    const cancelResponse = useCallback((): void => {
        if (currentState === State.CancellingResponse) {
            return;
        }

        setCurrentState(State.CancellingResponse);
        if (isDeepPlanCreated) {
            setIsDeepPlanCreated(false);
        }

        // Send the signal to cancel the response
        postMessage({
            type: RovoDevViewResponseType.CancelResponse,
        });
    }, [postMessage, currentState, setCurrentState, isDeepPlanCreated]);

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

            appendResponse(msg);

            postMessage({
                type: RovoDevViewResponseType.ReportChangesGitPushed,
                pullRequestCreated,
            });
        },
        [totalModifiedFiles, appendResponse, postMessage, keepFiles],
    );

    const onCollapsiblePanelExpanded = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.ReportThinkingDrawerExpanded,
        });
    }, [postMessage]);

    // Copy the last response to clipboard
    // This is for PromptInputBox because it cannot access the chat stream directly
    const handleCopyResponse = useCallback(() => {
        const lastMessage = history.at(-1);
        if (currentState !== State.WaitingForPrompt || !lastMessage || Array.isArray(lastMessage)) {
            return;
        }

        if (lastMessage.source !== 'RovoDev' || !lastMessage.text) {
            return;
        }

        if (!navigator.clipboard) {
            console.warn('Clipboard API not available');
            return;
        }

        navigator.clipboard.writeText(lastMessage.text);
    }, [currentState, history]);

    const executeGetAgentMemory = useCallback(() => {
        dispatch({
            type: RovoDevViewResponseType.GetAgentMemory,
        });
    }, []);

    const handleShowFeedbackForm = useCallback(() => {
        setIsFeedbackFormVisible(true);
    }, []);

    const executeSendFeedback = useCallback(
        (feedbackType: FeedbackType, feedack: string, canContact: boolean, includeTenMessages: boolean) => {
            let lastTenMessages: string[] | undefined = undefined;
            if (includeTenMessages) {
                lastTenMessages = extractLastNMessages(10, history);
            }

            postMessage({
                type: RovoDevViewResponseType.SendFeedback,
                feedbackType,
                feedbackMessage: feedack,
                lastTenMessages,
                canContact,
            });
            setIsFeedbackFormVisible(false);
        },
        [history, postMessage],
    );

    const onLoginClick = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.LaunchJiraAuth,
        });
    }, [postMessage]);

    return (
        <div className="rovoDevChat">
            <ChatStream
                chatHistory={history}
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
                subState={currentSubState}
                initState={initState}
                downloadProgress={downloadProgress}
                onChangesGitPushed={onChangesGitPushed}
                onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                feedbackVisible={isFeedbackFormVisible}
                setFeedbackVisible={setIsFeedbackFormVisible}
                sendFeedback={executeSendFeedback}
                onLoginClick={onLoginClick}
            />
            {currentState !== State.Disabled && (
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
                            disabled={workspaceCount === 0 || currentState === State.ProcessTerminated}
                            hideButtons={workspaceCount === 0}
                            state={currentState}
                            promptText={promptText}
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
                            onCopy={handleCopyResponse}
                            handleMemoryCommand={executeGetAgentMemory}
                            handleTriggerFeedbackCommand={handleShowFeedbackForm}
                        />
                    </div>
                    <div className="ai-disclaimer">Uses AI. Verify results.</div>
                </div>
            )}
        </div>
    );
};

export default RovoDevView;
