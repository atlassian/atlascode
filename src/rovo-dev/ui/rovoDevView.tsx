import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import InformationCircleIcon from '@atlaskit/icon/core/information-circle';
import { setGlobalTheme } from '@atlaskit/tokens';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';
import { AgentMode, RovoDevModeInfo, RovoDevToolReturnResponse } from 'src/rovo-dev/client';
import { RovoDevContextItem, State, ToolPermissionDialogChoice } from 'src/rovo-dev/rovoDevTypes';
import { v4 } from 'uuid';

import { DetailedSiteInfo, MinimalIssue } from '../api/extensionApiTypes';
import { RovodevStaticConfig } from '../api/rovodevStaticConfig';
import { RovoDevFeatures, RovoDevProviderMessage, RovoDevProviderMessageType } from '../rovoDevWebviewProviderMessages';
import { RovoDevErrorContext } from './common/common';
import { FeedbackConfirmationForm } from './feedback-form/FeedbackConfirmationForm';
import { FeedbackForm, FeedbackType } from './feedback-form/FeedbackForm';
import { CredentialHint } from './landing-page/disabled-messages/RovoDevLoginForm';
import { ChatStream } from './messaging/ChatStream';
import { useMessagingApi } from './messagingApi';
import { PromptInputBox } from './prompt-box/prompt-input/PromptInput';
import { PromptContextCollection } from './prompt-box/promptContext/promptContextCollection';
import { UpdatedFilesComponent } from './prompt-box/updated-files/UpdatedFilesComponent';
import { RovoDevErrorBoundary } from './RovoDevErrorBoundary';
import {
    FileOperationType,
    McpConsentChoice,
    ModifiedFile,
    RovoDevViewResponse,
    RovoDevViewResponseType,
} from './rovoDevViewMessages';
import { DebugPanel } from './tools/DebugPanel';
import { parseToolCallMessage } from './tools/ToolCallItem';
import {
    appendResponse,
    CODE_PLAN_EXECUTE_PROMPT,
    ConnectionTimeout,
    DialogMessage,
    extractLastNMessages,
    isCodeChangeTool,
    modifyFileTitleMap,
    parseToolReturnMessage,
    processDropDataTransferItems,
    PullRequestMessage,
    Response,
    ToolReturnParseResult,
} from './utils';

const DEFAULT_LOADING_MESSAGE: string = 'Rovo dev is working';

const RovoDevView: React.FC = () => {
    const [currentState, setCurrentState] = useState<State>({ state: 'WaitingForPrompt' });
    const [pendingToolCallMessage, setPendingToolCallMessage] = useState('');
    const [retryAfterErrorEnabled, setRetryAfterErrorEnabled] = useState('');
    const [totalModifiedFiles, setTotalModifiedFiles] = useState<ToolReturnParseResult[]>([]);
    const [isDeepPlanCreated, setIsDeepPlanCreated] = useState(false);
    const [isDeepPlanToggled, setIsDeepPlanToggled] = useState(false);
    const [isYoloModeToggled, setIsYoloModeToggled] = useState(RovodevStaticConfig.isBBY); // Yolo mode is default in Boysenberry
    const [isFullContextModeToggled, setIsFullContextModeToggled] = useState(false);
    const [features, setFeatures] = useState<RovoDevFeatures>({});
    const [workspacePath, setWorkspacePath] = useState<string>('');
    const [homeDir, setHomeDir] = useState<string>('');
    const [history, setHistory] = useState<Response[]>([]);
    const [modalDialogs, setModalDialogs] = useState<DialogMessage[]>([]);
    const [isFeedbackFormVisible, setIsFeedbackFormVisible] = React.useState(false);
    const [isFeedbackConfirmationFormVisible, setIsFeedbackConfirmationFormVisible] = React.useState(false);
    const [outgoingMessage, dispatch] = useState<RovoDevViewResponse | undefined>(undefined);
    const [promptContextCollection, setPromptContextCollection] = useState<RovoDevContextItem[]>([]);
    const [debugPanelEnabled, setDebugPanelEnabled] = useState(false);
    const [debugPanelContext, setDebugPanelContext] = useState<Record<string, string>>({});
    const [debugPanelMcpContext, setDebugPanelMcpContext] = useState<Record<string, string>>({});
    const [promptText, setPromptText] = useState<string | undefined>(undefined);
    const [fileExistenceMap, setFileExistenceMap] = useState<Map<string, boolean>>(new Map());
    const [jiraWorkItems, setJiraWorkItems] = useState<MinimalIssue<DetailedSiteInfo>[] | undefined>(undefined);
    const [credentialHints, setCredentialHints] = useState<CredentialHint[]>([]);
    const [pendingFilesForFiltering, setPendingFilesForFiltering] = useState<ModifiedFile[] | null>(null);
    const [thinkingBlockEnabled, setThinkingBlockEnabled] = useState(true);
    const [lastCompletedPromptId, setLastCompletedPromptId] = useState<string | undefined>(undefined);
    const [isAtlassianUser, setIsAtlassianUser] = useState(false);
    const [feedbackType, setFeedbackType] = React.useState<'like' | 'dislike' | undefined>(undefined);
    const [availableAgentModes, setAvailableAgentModes] = useState<RovoDevModeInfo[]>([]);
    const [currentAgentMode, setCurrentAgentMode] = useState<AgentMode | null>('default');
    const [canFetchSavedPrompts, setCanFetchSavedPrompts] = React.useState(false);

    // Initialize atlaskit theme for proper token support
    React.useEffect(() => {
        const initializeTheme = () => {
            const body = document.body;
            const isDark: boolean =
                body.classList.contains('vscode-dark') ||
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

    const removeModifiedFileToolReturns = useCallback((files: ToolReturnParseResult[]) => {
        setTotalModifiedFiles((prev) => prev.filter((x) => !files.includes(x)));
    }, []);

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

    const clearChatHistory = useCallback(() => {
        keepFiles(totalModifiedFiles);
        setHistory([]);
        setTotalModifiedFiles([]);
        setIsDeepPlanCreated(false);
        setIsFeedbackFormVisible(false);
        setPendingToolCallMessage('');
    }, [keepFiles, totalModifiedFiles]);

    const onError = useCallback(
        (error: Error, errorMessage?: string) => {
            const msg = errorMessage ? `${errorMessage}\n\n${error.message}` : error.message;
            dispatch({
                type: RovoDevViewResponseType.ReportRenderError,
                errorMessage: msg,
                errorType: error.name,
                errorStack: error.stack || undefined,
            });
        },
        [dispatch],
    );

    const reportError = useCallback(
        (error: Error, component: string) => {
            dispatch({
                type: RovoDevViewResponseType.ReportRenderError,
                errorMessage: error.message,
                errorType: error.name,
                errorStack: error.stack || undefined,
                componentStack: component,
            });
        },
        [dispatch],
    );

    const handleAppendModifiedFileToolReturns = useCallback(
        (toolReturn: RovoDevToolReturnResponse) => {
            if (isCodeChangeTool(toolReturn.tool_name)) {
                const msg = parseToolReturnMessage(toolReturn, onError).filter((msg) => msg.filePath !== undefined);

                setTotalModifiedFiles((currentFiles) => {
                    const filesMap = new Map([...currentFiles].map((item) => [item.filePath!, item]));

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

                    const allFiles = Array.from(filesMap.values());
                    const modifiedFiles = allFiles
                        .filter((file) =>
                            [
                                modifyFileTitleMap.updated.type,
                                modifyFileTitleMap.created.type,
                                modifyFileTitleMap.deleted.type,
                            ].includes(file.type!),
                        )
                        .map((file) => ({
                            filePath: file.filePath!,
                            type: file.type as FileOperationType,
                        }));

                    if (modifiedFiles.length > 0) {
                        setPendingFilesForFiltering(modifiedFiles);
                    }

                    return allFiles;
                });
            }
        },
        [onError],
    );

    const setSummaryMessageInHistory = useCallback(() => {
        setHistory((prev) => {
            const lastMessage = prev[prev.length - 1];

            if (lastMessage && !Array.isArray(lastMessage) && lastMessage.event_kind === 'text') {
                const summaryMessage = { ...lastMessage, isSummary: true };
                return [...prev.slice(0, -1), summaryMessage];
            }
            return prev;
        });
    }, []);

    const handleAppendResponse = useCallback(
        (response: Response | Response[]) => {
            setHistory((prev) => {
                prev = appendResponse(prev, response, handleAppendModifiedFileToolReturns, thinkingBlockEnabled);

                const last = prev.at(-1);
                if (
                    !Array.isArray(last) &&
                    last?.event_kind === 'tool-return' &&
                    last.tool_name === 'create_technical_plan'
                ) {
                    setIsDeepPlanCreated(true);
                }

                return prev;
            });
        },
        [handleAppendModifiedFileToolReturns, thinkingBlockEnabled],
    );

    const onMessageHandler = useCallback(
        (event: RovoDevProviderMessage): void => {
            switch (event.type) {
                case RovoDevProviderMessageType.SignalPromptSent:
                    setIsDeepPlanToggled(event.enable_deep_plan || false);
                    setPendingToolCallMessage(DEFAULT_LOADING_MESSAGE);
                    if (event.echoMessage) {
                        handleAppendResponse({
                            event_kind: '_RovoDevUserPrompt',
                            content: event.text,
                            context: event.context,
                        });
                    }
                    break;

                case RovoDevProviderMessageType.RovoDevResponseMessage:
                    setCurrentState((prev) =>
                        prev.state === 'WaitingForPrompt' ? { state: 'GeneratingResponse' } : prev,
                    );

                    const messages = Array.isArray(event.message) ? event.message : [event.message];

                    const last = messages.at(-1);
                    if (last?.event_kind === 'tool-call') {
                        setPendingToolCallMessage(parseToolCallMessage(last.tool_name));
                    } else if (last?.event_kind === 'tool-return') {
                        setPendingToolCallMessage(DEFAULT_LOADING_MESSAGE); // Clear pending tool call
                    }

                    // tool calls are used only to set the pending tool call message, so we don't need to append them
                    handleAppendResponse(messages.filter((x) => x.event_kind !== 'tool-call'));
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    if (
                        currentState.state === 'GeneratingResponse' ||
                        currentState.state === 'ExecutingPlan' ||
                        currentState.state === 'CancellingResponse'
                    ) {
                        setCurrentState({ state: 'WaitingForPrompt' });
                        // Signal that we need to send render acknowledgement after this render completes
                        setLastCompletedPromptId(event.promptId);
                    }
                    setSummaryMessageInHistory();
                    setPendingToolCallMessage('');
                    setModalDialogs([]);
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
                    break;

                case RovoDevProviderMessageType.ProviderReady:
                    setWorkspacePath(event.workspacePath || '');
                    setHomeDir(event.homeDir || '');
                    if (!RovodevStaticConfig.isBBY && event.yoloMode !== undefined) {
                        setIsYoloModeToggled(event.yoloMode);
                    }
                    setIsAtlassianUser(event.isAtlassianUser);
                    if (event.features) {
                        setFeatures(event.features);
                    }
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
                    setCanFetchSavedPrompts(true);
                    break;

                case RovoDevProviderMessageType.CancelFailed:
                    setCurrentState((prev) =>
                        prev.state === 'CancellingResponse' ? { state: 'GeneratingResponse' } : prev,
                    );
                    break;

                case RovoDevProviderMessageType.RovoDevDisabled:
                    clearChatHistory();

                    if (event.reason === 'EntitlementCheckFailed') {
                        setCurrentState({
                            state: 'Disabled',
                            subState: event.reason,
                            detail: event.detail!,
                        });
                    } else {
                        setCurrentState({
                            state: 'Disabled',
                            subState: event.reason,
                        });
                    }
                    break;

                case RovoDevProviderMessageType.SetChatContext:
                    setPromptContextCollection(event.context);
                    break;

                case RovoDevProviderMessageType.CreatePRComplete:
                case RovoDevProviderMessageType.GetCurrentBranchNameComplete:
                case RovoDevProviderMessageType.CheckGitChangesComplete:
                case RovoDevProviderMessageType.UpdateSavedPrompts:
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

                case RovoDevProviderMessageType.SetJiraWorkItems:
                    setJiraWorkItems(event.issues);
                    break;

                case RovoDevProviderMessageType.SetExistingJiraCredentials:
                    setCredentialHints(event.credentials);
                    break;

                case RovoDevProviderMessageType.FilterModifiedFilesByContentComplete: {
                    const convertedFiles: ToolReturnParseResult[] = event.filteredFiles.map((file) => {
                        const content = modifyFileTitleMap[file.type]?.title || modifyFileTitleMap.updated.title;

                        return {
                            content,
                            filePath: file.filePath,
                            title: file.filePath.split('/').pop() || file.filePath,
                            type: file.type,
                        };
                    });
                    setTotalModifiedFiles(convertedFiles);
                    break;
                }

                case RovoDevProviderMessageType.SetThinkingBlockEnabled:
                    setThinkingBlockEnabled(() => event.enabled);
                    break;

                case RovoDevProviderMessageType.RestoreState:
                    if (Array.isArray(event.state.history)) {
                        setHistory(event.state.history);
                    }
                    if (event.state.isDeepPlanCreated !== undefined) {
                        setIsDeepPlanCreated(event.state.isDeepPlanCreated);
                    }
                    if (event.state.isDeepPlanToggled !== undefined) {
                        setIsDeepPlanToggled(event.state.isDeepPlanToggled);
                    }
                    if (event.state.isYoloModeToggled !== undefined) {
                        setIsYoloModeToggled(event.state.isYoloModeToggled);
                    }
                    if (event.state.isFullContextModeToggled !== undefined) {
                        setIsFullContextModeToggled(event.state.isFullContextModeToggled);
                    }
                    if (event.state.isAtlassianUser !== undefined) {
                        setIsAtlassianUser(event.state.isAtlassianUser);
                    }
                    if (event.state.promptContextCollection) {
                        setPromptContextCollection(event.state.promptContextCollection);
                    }
                    break;

                case RovoDevProviderMessageType.RovoDevAuthValidating:
                case RovoDevProviderMessageType.RovoDevAuthValidationComplete:
                    // These messages are handled by the login form component directly
                    break;

                case RovoDevProviderMessageType.GetAvailableAgentModesComplete:
                    setAvailableAgentModes(
                        [...event.modes].sort((a, b) => (a.mode === 'default' ? -1 : b.mode === 'default' ? 1 : 0)),
                    );
                    break;

                case RovoDevProviderMessageType.GetCurrentAgentModeComplete:
                    setCurrentAgentMode(event.mode);
                    break;

                case RovoDevProviderMessageType.SetAgentModeComplete:
                    setCurrentAgentMode(event.mode);
                    break;

                default:
                    // this is never supposed to happen since there aren't other type of messages
                    handleAppendResponse({
                        event_kind: '_RovoDevDialog',
                        type: 'error',
                        // @ts-expect-error ts(2339) - event here should be 'never'
                        text: `Unknown message type: ${event.type}`,
                        isRetriable: false,
                        uid: v4(),
                    });
                    break;
            }
        },
        [handleAppendResponse, currentState.state, setSummaryMessageInHistory, clearChatHistory],
    );

    const { postMessage, postMessagePromise, setState } = useMessagingApi<
        RovoDevViewResponse,
        RovoDevProviderMessage,
        RovoDevProviderMessage
    >(onMessageHandler);

    // on new `outgoingMessage`, post it
    // this effectively implements the logic for `dispatch` to work as a `postMessage`
    React.useEffect(() => {
        if (outgoingMessage) {
            postMessage(outgoingMessage);
            dispatch(undefined);
        }
    }, [postMessage, dispatch, outgoingMessage]);

    // Effect to trigger content filtering when files are pending
    React.useEffect(() => {
        if (pendingFilesForFiltering !== null) {
            postMessage({
                type: RovoDevViewResponseType.FilterModifiedFilesByContent,
                files: pendingFilesForFiltering,
            });
            // Set to null to indicate filtering is in progress (prevents duplicate requests)
            setPendingFilesForFiltering(null);
        }
    }, [pendingFilesForFiltering, postMessage]);

    // Save webview state for drag-and-drop preservation
    React.useEffect(() => {
        setState({
            history,
            isDeepPlanCreated,
            isDeepPlanToggled,
            isYoloModeToggled,
            isFullContextModeToggled,
            isAtlassianUser,
            promptContextCollection,
        });
    }, [
        history,
        isDeepPlanCreated,
        isDeepPlanToggled,
        isYoloModeToggled,
        isFullContextModeToggled,
        isAtlassianUser,
        promptContextCollection,
        setState,
    ]);

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

            setIsDeepPlanCreated(false);

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
                context: promptContextCollection,
            });

            return true;
        },
        [currentState, isDeepPlanToggled, promptContextCollection, postMessage],
    );

    React.useEffect(() => {
        // Notify the backend that the webview is ready
        // This is used to initialize the process manager if needed
        // and to signal that the webview is ready to receive messages
        postMessage({
            type: RovoDevViewResponseType.WebviewReady,
        });

        // On the first render, get the context update
        postMessage({
            type: RovoDevViewResponseType.ForceUserFocusUpdate,
        });
    }, [postMessage]);

    // Send render acknowledgement after completing a prompt
    React.useEffect(() => {
        if (lastCompletedPromptId && currentState.state === 'WaitingForPrompt') {
            postMessage({
                type: RovoDevViewResponseType.MessageRendered,
                promptId: lastCompletedPromptId,
            });
            setLastCompletedPromptId(undefined);
        }
    }, [lastCompletedPromptId, currentState.state, postMessage]);

    const executeCodePlan = useCallback(() => {
        if (currentState.state !== 'WaitingForPrompt') {
            return;
        }
        if (sendPrompt(CODE_PLAN_EXECUTE_PROMPT)) {
            setCurrentState({ state: 'ExecutingPlan' });
        }
    }, [currentState, sendPrompt]);

    const retryPromptAfterError = useCallback((): void => {
        setCurrentState({ state: 'GeneratingResponse' });
        setRetryAfterErrorEnabled('');

        postMessage({
            type: RovoDevViewResponseType.RetryPromptAfterError,
        });
    }, [postMessage]);

    const cancelResponse = useCallback((): void => {
        if (currentState.state === 'CancellingResponse') {
            return;
        }

        setCurrentState({ state: 'CancellingResponse' });
        setIsDeepPlanCreated(false);

        // Send the signal to cancel the response
        postMessage({
            type: RovoDevViewResponseType.CancelResponse,
        });
    }, [postMessage, currentState]);

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

    const openJira = useCallback(
        (url: string) => {
            postMessage({
                type: RovoDevViewResponseType.OpenJira,
                url,
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

    const handleRestartProcess = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.RestartProcess,
        });
    }, [postMessage]);

    const onChangesGitPushed = useCallback(
        (msg: PullRequestMessage, pullRequestCreated: boolean) => {
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

        if (lastMessage.event_kind !== 'text' || !lastMessage.content) {
            return;
        }

        navigator.clipboard?.writeText(lastMessage.content);
    }, [currentState, history]);

    const executeGetAgentMemory = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.GetAgentMemory,
        });
    }, [postMessage]);

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

    const onLoginClick = useCallback(
        (openApiTokenLogin: boolean) => {
            postMessage({
                type: RovoDevViewResponseType.LaunchJiraAuth,
                openApiTokenLogin,
            });
        },
        [postMessage],
    );

    const onRovoDevAuthSubmit = useCallback(
        (host: string, email: string, apiToken: string) => {
            postMessage({
                type: RovoDevViewResponseType.SubmitRovoDevAuth,
                host,
                email,
                apiToken,
            });
        },
        [postMessage],
    );

    const onOpenFolder = useCallback(() => {
        postMessage({
            type: RovoDevViewResponseType.OpenFolder,
        });
    }, [postMessage]);

    const onAddContext = useCallback(
        (dragDropData?: string[]) => {
            postMessage({
                type: RovoDevViewResponseType.AddContext,
                dragDropData,
            });
        },
        [postMessage],
    );

    const onAddJiraContext = useCallback(
        (jiraIssueKey: string, jiraIssueUrl: string) => {
            postMessage({
                type: RovoDevViewResponseType.AddContext,
                contextItem: {
                    contextType: 'jiraWorkItem',
                    name: jiraIssueKey,
                    url: jiraIssueUrl,
                },
            });
        },
        [postMessage],
    );

    const onRemoveContext = useCallback(
        (item: RovoDevContextItem) => {
            postMessage({
                type: RovoDevViewResponseType.RemoveContext,
                item,
            });
        },
        [postMessage],
    );

    // this assumes that only a single item in "focus" status exists in the collection
    const onToggleContextFocus = useCallback(
        (enabled: boolean) => {
            postMessage({
                type: RovoDevViewResponseType.ToggleContextFocus,
                enabled,
            });
        },
        [postMessage],
    );

    const onMcpChoice = useCallback(
        (choice: McpConsentChoice, serverName?: string) => {
            // removes the server name dialog, in case Rovo Dev is too slow responding back
            setCurrentState((prev) => {
                if (prev.state !== 'Initializing' || prev.subState !== 'MCPAcceptance') {
                    return prev;
                }

                const otherIdsToAccept = prev.mcpIds.filter((x) => x !== serverName);
                return otherIdsToAccept.length > 0
                    ? {
                          state: 'Initializing',
                          subState: 'MCPAcceptance',
                          mcpIds: otherIdsToAccept,
                          isPromptPending: prev.isPromptPending,
                      }
                    : {
                          state: 'Initializing',
                          subState: 'Other',
                          isPromptPending: prev.isPromptPending,
                      };
            });

            postMessage({
                type: RovoDevViewResponseType.McpConsentChoiceSubmit,
                choice,
                serverName,
            });
        },
        [postMessage],
    );

    const onJiraItemClick = useCallback(
        (issue: MinimalIssue<DetailedSiteInfo>) => {
            const jiraIssueUrl = `${issue.siteDetails.baseLinkUrl}/browse/${issue.key}`;
            onAddJiraContext(issue.key, jiraIssueUrl);
            setPromptText('Work on the attached Jira work item');
        },
        [onAddJiraContext],
    );

    const setPromptTextFromAction = useCallback((context: string) => {
        setPromptText(context);
    }, []);

    const onToolPermissionChoice = useCallback(
        (toolCallId: string, choice: ToolPermissionDialogChoice | 'enableYolo') => {
            // remove the dialog after the choice is submitted
            if (choice === 'enableYolo') {
                setIsYoloModeToggled(true);
                setModalDialogs([]);
                postMessage({
                    type: RovoDevViewResponseType.YoloModeToggled,
                    value: true,
                });
                return;
            } else {
                setModalDialogs((prev) =>
                    choice === 'allowAll'
                        ? []
                        : prev.filter((x) => x.type !== 'toolPermissionRequest' || x.toolCallId !== toolCallId),
                );
            }

            postMessage({
                type: RovoDevViewResponseType.ToolPermissionChoiceSubmit,
                choice,
                toolCallId,
            });
        },
        [postMessage],
    );

    const onYoloModeToggled = useCallback(() => {
        const yoloModeNewValue = !isYoloModeToggled;
        setIsYoloModeToggled(yoloModeNewValue);

        // the event below (YoloModeToggled) with value true automatically approves any pending confirmation
        if (yoloModeNewValue) {
            setModalDialogs([]);
        }

        postMessage({
            type: RovoDevViewResponseType.YoloModeToggled,
            value: yoloModeNewValue,
        });
    }, [postMessage, isYoloModeToggled]);

    const onFullContextModeToggled = useCallback(
        () => setIsFullContextModeToggled((prev) => !prev),
        [setIsFullContextModeToggled],
    );

    const handleFeedbackTrigger = useCallback(
        (isPositive: boolean) => {
            setFeedbackType(isPositive ? 'like' : 'dislike');
            setIsFeedbackFormVisible(true);
        },
        [setIsFeedbackFormVisible],
    );

    const confirmFeedback = () => {
        setIsFeedbackConfirmationFormVisible(true);
        setTimeout(() => {
            setIsFeedbackConfirmationFormVisible(false);
        }, 2000);
    };
    const onLinkClick = React.useCallback(
        (href: string) => {
            postMessage({ type: RovoDevViewResponseType.OpenExternalLink, href });
        },
        [postMessage],
    );

    const onAgentModeChange = useCallback(
        (mode: AgentMode) => {
            postMessage({ type: RovoDevViewResponseType.SetAgentMode, mode });
        },
        [postMessage],
    );

    const handleShowSessionsCommand = React.useCallback(() => {
        postMessage({ type: RovoDevViewResponseType.ShowSessionHistory });
    }, [postMessage]);

    const handleFetchSavedPrompts = React.useCallback(async () => {
        const response = await postMessagePromise(
            {
                type: RovoDevViewResponseType.FetchSavedPrompts,
            },
            RovoDevProviderMessageType.UpdateSavedPrompts,
            ConnectionTimeout,
        );
        return response.savedPrompts || [];
    }, [postMessagePromise]);

    React.useEffect(() => {
        postMessage({
            type: RovoDevViewResponseType.FullContextModeToggled,
            value: isFullContextModeToggled,
        });
    }, [postMessage, isFullContextModeToggled]);

    const hidePromptBox =
        currentState.state === 'Disabled' ||
        (currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance');

    return (
        <RovoDevErrorContext.Provider value={{ reportError }}>
            <RovoDevErrorBoundary postMessage={postMessage}>
                <div
                    id="rovoDevDragDropOverlay"
                    onDragLeave={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        document.getElementById('rovoDevDragDropOverlay')!.style.display = 'none';
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        document.getElementById('rovoDevDragDropOverlay')!.style.display = 'none';

                        const items = event.dataTransfer?.items || [];
                        processDropDataTransferItems(items, onAddContext);
                    }}
                >
                    <div id="rovoDevDragDropOverlayMessage">
                        <span className="codicon codicon-attach"></span>
                        Drop files and Jira work items
                        <br />
                        to attach them as context
                    </div>
                </div>
                <div
                    className="rovoDevChat"
                    onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        document.getElementById('rovoDevDragDropOverlay')!.style.display = 'flex';
                    }}
                >
                    {debugPanelEnabled && (
                        <DebugPanel
                            currentState={currentState}
                            debugContext={debugPanelContext}
                            debugMcpContext={debugPanelMcpContext}
                            onLinkClick={onLinkClick}
                        />
                    )}
                    <ChatStream
                        chatHistory={history}
                        modalDialogs={modalDialogs}
                        renderProps={{
                            openFile,
                            openJira,
                            checkFileExists,
                            isRetryAfterErrorButtonEnabled,
                            retryPromptAfterError,
                            onRestartProcess: handleRestartProcess,
                            onOpenLogFile: () => postMessage({ type: RovoDevViewResponseType.OpenRovoDevLogFile }),
                            onError,
                        }}
                        messagingApi={{
                            postMessage,
                            postMessagePromise,
                            setState,
                        }}
                        pendingToolCall={pendingToolCallMessage}
                        deepPlanCreated={isDeepPlanCreated}
                        executeCodePlan={executeCodePlan}
                        currentState={currentState}
                        onChangesGitPushed={onChangesGitPushed}
                        onCollapsiblePanelExpanded={onCollapsiblePanelExpanded}
                        handleFeedbackTrigger={handleFeedbackTrigger}
                        onLoginClick={onLoginClick}
                        onRovoDevAuthSubmit={onRovoDevAuthSubmit}
                        onOpenFolder={onOpenFolder}
                        onMcpChoice={onMcpChoice}
                        setPromptText={setPromptTextFromAction}
                        jiraWorkItems={jiraWorkItems}
                        onJiraItemClick={onJiraItemClick}
                        onToolPermissionChoice={onToolPermissionChoice}
                        onLinkClick={onLinkClick}
                        credentialHints={credentialHints}
                        features={features}
                    />
                    {!hidePromptBox && (
                        <div className="input-section-container">
                            {isFeedbackFormVisible && (
                                <div
                                    style={{
                                        padding: '8px 16px',
                                    }}
                                >
                                    <FeedbackForm
                                        type={feedbackType}
                                        onSubmit={(feedbackType, feedback, canContact, includeTenMessages) => {
                                            setFeedbackType(undefined);
                                            executeSendFeedback(feedbackType, feedback, canContact, includeTenMessages);
                                            confirmFeedback();
                                        }}
                                        onCancel={() => {
                                            setFeedbackType(undefined);
                                            setIsFeedbackFormVisible(false);
                                        }}
                                    />
                                </div>
                            )}{' '}
                            <div
                                style={{
                                    padding: '8px 16px',
                                }}
                            >
                                {isFeedbackConfirmationFormVisible && (
                                    <FeedbackConfirmationForm
                                        onClose={() => setIsFeedbackConfirmationFormVisible(false)}
                                    />
                                )}
                            </div>
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
                                <div className="prompt-container-container">
                                    <div className="prompt-container">
                                        <PromptContextCollection
                                            content={promptContextCollection}
                                            readonly={false}
                                            onRemoveContext={onRemoveContext}
                                            onToggleActiveItem={onToggleContextFocus}
                                            openFile={openFile}
                                            openJira={openJira}
                                        />
                                        <PromptInputBox
                                            disabled={currentState.state === 'ProcessTerminated'}
                                            currentState={currentState}
                                            isDeepPlanEnabled={isDeepPlanToggled}
                                            isYoloModeEnabled={isYoloModeToggled}
                                            isFullContextEnabled={isFullContextModeToggled}
                                            availableAgentModes={availableAgentModes}
                                            currentAgentMode={currentAgentMode}
                                            onAgentModeChange={onAgentModeChange}
                                            onDeepPlanToggled={() => setIsDeepPlanToggled((prev) => !prev)}
                                            onYoloModeToggled={
                                                RovodevStaticConfig.isBBY ? undefined : () => onYoloModeToggled()
                                            }
                                            onFullContextToggled={
                                                isAtlassianUser && !RovodevStaticConfig.isBBY
                                                    ? () => onFullContextModeToggled()
                                                    : undefined
                                            }
                                            onSend={sendPrompt}
                                            onCancel={cancelResponse}
                                            onAddContext={onAddContext}
                                            onCopy={handleCopyResponse}
                                            handleMemoryCommand={executeGetAgentMemory}
                                            handleTriggerFeedbackCommand={handleShowFeedbackForm}
                                            promptText={promptText}
                                            onPromptTextSet={handlePromptTextSet}
                                            handleSessionCommand={handleShowSessionsCommand}
                                            handleFetchSavedPrompts={handleFetchSavedPrompts}
                                            canFetchSavedPrompts={canFetchSavedPrompts}
                                        />
                                    </div>
                                </div>
                                <div className="ai-disclaimer">
                                    <InformationCircleIcon label="Disclaimer logo" size="small" />
                                    Uses AI. Verify results.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </RovoDevErrorBoundary>
        </RovoDevErrorContext.Provider>
    );
};

export default RovoDevView;
