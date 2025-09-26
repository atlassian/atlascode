import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import { setGlobalTheme } from '@atlaskit/tokens';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';
import { DisabledState, RovoDevContextItem, State } from 'src/rovo-dev/rovoDevTypes';
import { v4 } from 'uuid';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import {
    RovoDevDisabledReason,
    RovoDevProviderMessage,
    RovoDevProviderMessageType,
} from '../../../rovo-dev/rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../messagingApi';
import { FeedbackType } from './feedback-form/FeedbackForm';
import { ChatStream } from './messaging/ChatStream';
import { PromptInputBox } from './prompt-box/prompt-input/PromptInput';
import { PromptContextCollection } from './prompt-box/promptContext/promptContextCollection';
import { UpdatedFilesComponent } from './prompt-box/updated-files/UpdatedFilesComponent';
import {
    McpConsentChoice,
    ModifiedFile,
    RovoDevViewResponse,
    RovoDevViewResponseType,
    ToolPermissionChoice,
} from './rovoDevViewMessages';
import { DebugPanel } from './tools/DebugPanel';
import { parseToolCallMessage } from './tools/ToolCallItem';
import {
    appendResponse,
    ChatMessage,
    CODE_PLAN_EXECUTE_PROMPT,
    DefaultMessage,
    DialogMessage,
    extractLastNMessages,
    isCodeChangeTool,
    parseToolReturnMessage,
    Response,
    ToolReturnGenericMessage,
    ToolReturnParseResult,
} from './utils';

const DEFAULT_LOADING_MESSAGE: string = 'Rovo dev is working';

function mapRovoDevDisabledReasonToSubState(reason: RovoDevDisabledReason): DisabledState['subState'] {
    switch (reason) {
        case 'needAuth':
            return 'NeedAuth';
        case 'noOpenFolder':
            return 'NoWorkspaceOpen';
        case 'other':
            return 'Other';
        default:
            // @ts-expect-error ts(2339) - reason here should be 'never'
            throw new Error(reason.toString());
    }
}

const IsBoysenberry = process.env.ROVODEV_BBY === 'true';

const RovoDevView: React.FC = () => {
    const [currentState, setCurrentState] = useState<State>({ state: 'WaitingForPrompt' });
    const [pendingToolCallMessage, setPendingToolCallMessage] = useState('');
    const [retryAfterErrorEnabled, setRetryAfterErrorEnabled] = useState('');
    const [totalModifiedFiles, setTotalModifiedFiles] = useState<ToolReturnParseResult[]>([]);
    const [isDeepPlanCreated, setIsDeepPlanCreated] = useState(false);
    const [isDeepPlanToggled, setIsDeepPlanToggled] = useState(false);
    const [isYoloModeToggled, setIsYoloModeToggled] = useState(IsBoysenberry);
    const [workspacePath, setWorkspacePath] = useState<string>('');
    const [homeDir, setHomeDir] = useState<string>('');
    const [history, setHistory] = useState<Response[]>([]);
    const [modalDialogs, setModalDialogs] = useState<DialogMessage[]>([]);
    const [isFeedbackFormVisible, setIsFeedbackFormVisible] = React.useState(false);
    const [outgoingMessage, dispatch] = useState<RovoDevViewResponse | undefined>(undefined);
    const [promptContextCollection, setPromptContextCollection] = useState<RovoDevContextItem[]>([]);
    const [debugPanelEnabled, setDebugPanelEnabled] = useState(false);
    const [debugPanelContext, setDebugPanelContext] = useState<Record<string, string>>({});
    const [debugPanelMcpContext, setDebugPanelMcpContext] = useState<Record<string, string>>({});
    const [promptText, setPromptText] = useState<string | undefined>(undefined);
    const [fileExistenceMap, setFileExistenceMap] = useState<Map<string, boolean>>(new Map());

    // Initialize atlaskit theme for proper token support
    React.useEffect(() => {
        const initializeTheme = () => {
            const body = document.body;
            const isDark: boolean =
                body.getAttribute('class') === 'vscode-dark' ||
                (body.classList.contains('vscode-high-contrast') &&
                    !body.classList.contains('vscode-high-contrast-light'));

            setGlobalTheme({
                light: 'light',
                dark: 'dark',
                colorMode: isDark ? 'dark' : 'light',
                typography: 'typography-modernized',
            });
        };

        initializeTheme();

        const observer = new MutationObserver(initializeTheme);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [history, currentState, pendingToolCallMessage]);

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
        setCurrentState({ state: 'WaitingForPrompt' });
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

    const handleAppendResponse = useCallback(
        (response: Response) => {
            setHistory((prev) =>
                appendResponse(response, prev, handleAppendModifiedFileToolReturns, setIsDeepPlanCreated),
            );
        },
        [setHistory, handleAppendModifiedFileToolReturns, setIsDeepPlanCreated],
    );

    const onMessageHandler = useCallback(
        (event: RovoDevProviderMessage): void => {
            let object: RovoDevResponse;
            switch (event.type) {
                case RovoDevProviderMessageType.SignalPromptSent:
                    setIsDeepPlanToggled(event.enable_deep_plan || false);
                    setPendingToolCallMessage(DEFAULT_LOADING_MESSAGE);
                    if (event.echoMessage) {
                        handleAppendResponse({ source: 'User', text: event.text, context: event.context });
                    }
                    break;

                case RovoDevProviderMessageType.Response:
                    setCurrentState((prev) =>
                        prev.state === 'WaitingForPrompt' ? { state: 'GeneratingResponse' } : prev,
                    );
                    object = event.dataObject;
                    if (object.event_kind === 'text' && object.content) {
                        const msg: ChatMessage = {
                            text: object.content || '',
                            source: 'RovoDev',
                        };
                        handleAppendResponse(msg);
                    }
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    if (
                        currentState.state === 'GeneratingResponse' ||
                        currentState.state === 'ExecutingPlan' ||
                        currentState.state === 'CancellingResponse'
                    ) {
                        finalizeResponse();
                    }
                    break;

                case RovoDevProviderMessageType.ToolCall:
                    setCurrentState((prev) =>
                        prev.state === 'WaitingForPrompt' ? { state: 'GeneratingResponse' } : prev,
                    );
                    object = event.dataObject;
                    if (object.event_kind !== 'tool-call') {
                        break;
                    }
                    setPendingToolCallMessage(parseToolCallMessage(object.tool_name));
                    break;

                case RovoDevProviderMessageType.ToolReturn:
                    setCurrentState((prev) =>
                        prev.state === 'WaitingForPrompt' ? { state: 'GeneratingResponse' } : prev,
                    );
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
                    handleAppendResponse(returnMessage);
                    break;

                case RovoDevProviderMessageType.ShowDialog:
                    const msg = event.message;
                    if (msg.type === 'toolPermissionRequest') {
                        setModalDialogs((prev) => [...prev, msg]);
                    } else {
                        if (msg.type === 'error') {
                            if (msg.isProcessTerminated) {
                                setCurrentState({ state: 'ProcessTerminated' });
                            } else {
                                setRetryAfterErrorEnabled(msg.isRetriable ? msg.uid : '');
                            }
                        }
                        handleAppendResponse(msg);
                    }
                    break;

                case RovoDevProviderMessageType.ClearChat:
                    clearChatHistory();
                    setPendingToolCallMessage('');
                    break;

                case RovoDevProviderMessageType.ProviderReady:
                    setWorkspacePath(event.workspacePath || '');
                    setHomeDir(event.homeDir || '');
                    setCurrentState({ state: 'WaitingForPrompt' });
                    break;

                case RovoDevProviderMessageType.SetDebugPanel:
                    setDebugPanelEnabled(event.enabled);
                    if (event.enabled) {
                        setDebugPanelContext(event.context);
                        setDebugPanelMcpContext(event.mcpContext);
                    }
                    break;

                case RovoDevProviderMessageType.SetInitializing:
                    setCurrentState({
                        state: 'Initializing',
                        subState: 'Other',
                        isPromptPending: event.isPromptPending,
                    });
                    break;

                case RovoDevProviderMessageType.SetDownloadProgress:
                    setCurrentState({
                        state: 'Initializing',
                        subState: 'UpdatingBinaries',
                        isPromptPending: event.isPromptPending,
                        totalBytes: event.totalBytes,
                        downloadedBytes: event.downloadedBytes,
                    });
                    break;

                case RovoDevProviderMessageType.SetMcpAcceptanceRequired:
                    setCurrentState({
                        state: 'Initializing',
                        subState: 'MCPAcceptance',
                        mcpIds: event.mcpIds,
                        isPromptPending: event.isPromptPending,
                    });
                    break;

                case RovoDevProviderMessageType.RovoDevReady:
                    setCurrentState({
                        state: event.isPromptPending ? 'GeneratingResponse' : 'WaitingForPrompt',
                    });
                    break;

                case RovoDevProviderMessageType.CancelFailed:
                    setCurrentState((prev) =>
                        prev.state === 'CancellingResponse' ? { state: 'GeneratingResponse' } : prev,
                    );
                    break;

                case RovoDevProviderMessageType.RovoDevDisabled:
                    if (
                        currentState.state === 'GeneratingResponse' ||
                        currentState.state === 'ExecutingPlan' ||
                        currentState.state === 'CancellingResponse'
                    ) {
                        finalizeResponse();
                    }
                    setCurrentState({
                        state: 'Disabled',
                        subState: mapRovoDevDisabledReasonToSubState(event.reason),
                    });
                    break;

                case RovoDevProviderMessageType.ContextAdded:
                    setPromptContextCollection((prev) => {
                        const newItem = event.context;
                        const idx = prev.findIndex((x) => x.file.absolutePath === newItem.file.absolutePath);
                        if (idx < 0) {
                            return [...prev, newItem];
                        } else if (!newItem.isFocus || prev[idx].isFocus) {
                            // never replace explicitely added with focused
                            prev[idx] = newItem;
                            return [...prev];
                        } else {
                            return prev;
                        }
                    });
                    break;

                case RovoDevProviderMessageType.ContextRemoved:
                    setPromptContextCollection((prev) => {
                        if (event.isFocus) {
                            return [...prev.filter((x) => !x.isFocus)];
                        } else {
                            return [...prev.filter((x) => x.file.absolutePath !== event.context.file.absolutePath)];
                        }
                    });
                    break;

                case RovoDevProviderMessageType.CreatePRComplete:
                case RovoDevProviderMessageType.GetCurrentBranchNameComplete:
                case RovoDevProviderMessageType.CheckGitChangesComplete:
                    break; // This is handled elsewhere

                case RovoDevProviderMessageType.CheckFileExistsComplete:
                    setFileExistenceMap((prev) => new Map(prev.set(event.filePath, event.exists)));
                    break;

                case RovoDevProviderMessageType.ForceStop:
                    // Signal user that Rovo Dev is stopping
                    if (currentState.state === 'GeneratingResponse' || currentState.state === 'ExecutingPlan') {
                        setCurrentState({ state: 'CancellingResponse' });
                    }
                    break;

                case RovoDevProviderMessageType.ShowFeedbackForm:
                    setIsFeedbackFormVisible(true);
                    break;

                case RovoDevProviderMessageType.SetPromptText:
                    setPromptText(event.text);
                    break;

                default:
                    // this is never supposed to happen since there aren't other type of messages
                    handleAppendResponse({
                        source: 'RovoDevDialog',
                        type: 'error',
                        // @ts-expect-error ts(2339) - event here should be 'never'
                        text: `Unknown message type: ${event.type}`,
                        isRetriable: false,
                        uid: v4(),
                    });
                    break;
            }
        },
        [currentState.state, handleAppendResponse, clearChatHistory, finalizeResponse],
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

    const sendPrompt = useCallback(
        (text: string): boolean => {
            if (text.trim() === '') {
                return false;
            }

            const isWaitingForPrompt =
                currentState.state === 'WaitingForPrompt' ||
                (currentState.state === 'Initializing' && !currentState.isPromptPending);
            if (!isWaitingForPrompt) {
                return false;
            }

            if (isDeepPlanCreated) {
                setIsDeepPlanCreated(false);
            }

            // Disable the send button, and enable the pause button
            setCurrentState((prev) => {
                if (prev.state === 'Initializing') {
                    return { ...prev, isPromptPending: true };
                } else {
                    return { state: 'GeneratingResponse' };
                }
            });

            // Send the prompt to backend
            postMessage({
                type: RovoDevViewResponseType.Prompt,
                text,
                enable_deep_plan: isDeepPlanToggled,
                context: promptContextCollection.filter((x) => x.enabled),
            });

            return true;
        },
        [
            currentState,
            isDeepPlanCreated,
            isDeepPlanToggled,
            promptContextCollection,
            setIsDeepPlanCreated,
            setCurrentState,
            postMessage,
        ],
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
        if (currentState.state !== 'WaitingForPrompt') {
            return;
        }
        if (sendPrompt(CODE_PLAN_EXECUTE_PROMPT)) {
            setCurrentState({ state: 'ExecutingPlan' });
        }
    }, [currentState, setCurrentState, sendPrompt]);

    const retryPromptAfterError = useCallback((): void => {
        setCurrentState({ state: 'GeneratingResponse' });
        setRetryAfterErrorEnabled('');

        postMessage({
            type: RovoDevViewResponseType.RetryPromptAfterError,
        });
    }, [setCurrentState, postMessage]);

    const cancelResponse = useCallback((): void => {
        if (currentState.state === 'CancellingResponse') {
            return;
        }

        setCurrentState({ state: 'CancellingResponse' });
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

    const checkFileExists = useCallback(
        (filePath: string): boolean | null => {
            if (fileExistenceMap.has(filePath)) {
                return fileExistenceMap.get(filePath)!;
            }

            const requestId = v4();
            postMessage({
                type: RovoDevViewResponseType.CheckFileExists,
                filePath,
                requestId,
            });

            return null;
        },
        [postMessage, fileExistenceMap],
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

            handleAppendResponse(msg);

            postMessage({
                type: RovoDevViewResponseType.ReportChangesGitPushed,
                pullRequestCreated,
            });
        },
        [totalModifiedFiles, handleAppendResponse, postMessage, keepFiles],
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
        if (currentState.state !== 'WaitingForPrompt' || !lastMessage || Array.isArray(lastMessage)) {
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

    const handlePromptTextSet = useCallback(() => {
        setPromptText(undefined);
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

    const onOpenFolder = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.OpenFolder,
        });
    }, [postMessage]);

    const onMcpChoice = useCallback(
        (choice: McpConsentChoice, serverName?: string) => {
            postMessage({
                type: RovoDevViewResponseType.McpConsentChoiceSubmit,
                choice,
                serverName,
            });
        },
        [postMessage],
    );

    const onToolPermissionChoice = useCallback(
        (toolCallId: string, choice: ToolPermissionChoice) => {
            // remove the dialog after the choice is submitted
            setModalDialogs((prev) =>
                prev.filter((x) => x.type !== 'toolPermissionRequest' || x.toolCallId !== toolCallId),
            );

            postMessage({
                type: RovoDevViewResponseType.ToolPermissionChoiceSubmit,
                choice,
                toolCallId,
            });
        },
        [setModalDialogs, postMessage],
    );

    const onYoloModeToggled = useCallback(() => setIsYoloModeToggled((prev) => !prev), [setIsYoloModeToggled]);

    React.useEffect(() => {
        // the event below (YoloModeToggled) with value true automatically approves any pending confirmation
        if (isYoloModeToggled) {
            setModalDialogs([]);
        }

        postMessage({
            type: RovoDevViewResponseType.YoloModeToggled,
            value: isYoloModeToggled,
        });
    }, [postMessage, isYoloModeToggled]);

    const hidePromptBox =
        currentState.state === 'Disabled' ||
        (currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance');

    return (
        <div className="rovoDevChat">
            {debugPanelEnabled && (
                <DebugPanel
                    currentState={currentState}
                    debugContext={debugPanelContext}
                    debugMcpContext={debugPanelMcpContext}
                />
            )}
            <ChatStream
                chatHistory={history}
                modalDialogs={modalDialogs}
                renderProps={{
                    openFile,
                    checkFileExists,
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
                currentState={currentState}
                onChangesGitPushed={onChangesGitPushed}
                onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                feedbackVisible={isFeedbackFormVisible}
                setFeedbackVisible={setIsFeedbackFormVisible}
                sendFeedback={executeSendFeedback}
                onLoginClick={onLoginClick}
                onOpenFolder={onOpenFolder}
                onMcpChoice={onMcpChoice}
                onToolPermissionChoice={onToolPermissionChoice}
            />
            {!hidePromptBox && (
                <div className="input-section-container">
                    <UpdatedFilesComponent
                        modifiedFiles={totalModifiedFiles}
                        onUndo={undoFiles}
                        onKeep={keepFiles}
                        openDiff={openFile}
                        actionsEnabled={currentState.state === 'WaitingForPrompt'}
                        workspacePath={workspacePath}
                        homeDir={homeDir}
                    />
                    <div className="prompt-container">
                        <PromptContextCollection
                            content={promptContextCollection}
                            readonly={false}
                            onRemoveContext={(item: RovoDevContextItem) => {
                                setPromptContextCollection((prev) => {
                                    return [...prev.filter((x) => x.file.absolutePath !== item.file.absolutePath)];
                                });
                            }}
                            onToggleActiveItem={(enabled) => {
                                setPromptContextCollection((prev) => {
                                    const idx = prev.findIndex((x) => x.isFocus);
                                    if (idx < 0) {
                                        return prev;
                                    } else {
                                        prev[idx].enabled = enabled;
                                        return [...prev];
                                    }
                                });
                            }}
                        />
                        <PromptInputBox
                            disabled={currentState.state === 'ProcessTerminated'}
                            currentState={currentState}
                            isDeepPlanEnabled={isDeepPlanToggled}
                            isYoloModeEnabled={isYoloModeToggled}
                            onDeepPlanToggled={() => setIsDeepPlanToggled((prev) => !prev)}
                            onYoloModeToggled={IsBoysenberry ? undefined : () => onYoloModeToggled()}
                            onSend={sendPrompt}
                            onCancel={cancelResponse}
                            onAddContext={() => {
                                postMessage({
                                    type: RovoDevViewResponseType.AddContext,
                                });
                            }}
                            onCopy={handleCopyResponse}
                            handleMemoryCommand={executeGetAgentMemory}
                            handleTriggerFeedbackCommand={handleShowFeedbackForm}
                            promptText={promptText}
                            onPromptTextSet={handlePromptTextSet}
                        />
                    </div>
                    <div className="ai-disclaimer">Uses AI. Verify results.</div>
                </div>
            )}
        </div>
    );
};

export default RovoDevView;
