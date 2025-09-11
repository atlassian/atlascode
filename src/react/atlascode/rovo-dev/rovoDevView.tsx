import './RovoDev.css';
import './RovoDevCodeHighlighting.css';

import CloseIcon from '@atlaskit/icon/core/close';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { useCallback, useState } from 'react';
import * as React from 'react';
import { actions } from 'src/react/store/states/rovo-dev';
import { RovoDevContextItem } from 'src/rovo-dev/rovoDevTypes';
import { v4 } from 'uuid';

import { RovoDevResponse } from '../../../rovo-dev/responseParser';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from '../../../rovo-dev/rovoDevWebviewProviderMessages';
import { useAppDispatch, useAppSelector, useAppStore } from '../../store/hooks';
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
    const [workspaceCount, setWorkspaceCount] = useState(process.env.ROVODEV_BBY ? 1 : 0);

    const [outgoingMessage, dispatch] = useState<RovoDevViewResponse | undefined>(undefined);

    const currentState = useAppSelector((state) => state.rovoDevStates.currentState);

    const history = useAppSelector((state) => state.chatStream.history);
    const pendingToolCallMessage = useAppSelector((state) => state.chatStream.pendingToolCall);
    const totalModifiedFiles = useAppSelector((state) => state.chatStream.totalModifiedFiles);

    const promptContextCollection = useAppSelector((state) => state.promptContext.context);
    const isDeepPlanCreated = useAppSelector((state) => state.promptContext.isDeepPlanCreated);

    const dispatchRedux = useAppDispatch();
    const store = useAppStore();

    React.useEffect(() => {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [history, currentState, pendingToolCallMessage]);

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
            dispatchRedux(actions.removeModifiedFileToolReturns(files));
        },
        [dispatchRedux],
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
            dispatchRedux(actions.removeModifiedFileToolReturns(files));
        },
        [dispatchRedux],
    );

    const finalizeResponse = useCallback(() => {
        dispatchRedux(actions.setPendingToolCall(''));
        dispatchRedux(actions.setCurrentState({ state: 'WaitingForPrompt' }));
    }, [dispatchRedux]);

    const clearChatHistory = useCallback(() => {
        keepFiles(totalModifiedFiles);
        dispatchRedux(actions.clearChat());
    }, [keepFiles, totalModifiedFiles, dispatchRedux]);

    const onMessageHandler = useCallback(
        (event: RovoDevProviderMessage): void => {
            let object: RovoDevResponse;
            switch (event.type) {
                case RovoDevProviderMessageType.PromptSent:
                    // Disable the send button, and enable the pause button
                    dispatchRedux(actions.setIsDeepPlanToggled(event.enable_deep_plan || false));
                    dispatchRedux(actions.setPendingToolCall(DEFAULT_LOADING_MESSAGE));
                    break;

                case RovoDevProviderMessageType.Response:
                    dispatchRedux(actions.responseRecieved());
                    object = event.dataObject;
                    if (object.event_kind === 'text' && object.content) {
                        const msg: ChatMessage = {
                            text: object.content || '',
                            source: 'RovoDev',
                        };
                        dispatchRedux(actions.appendResponse(msg));
                    }
                    break;

                case RovoDevProviderMessageType.UserChatMessage:
                    dispatchRedux(actions.appendResponse(event.message));
                    break;

                case RovoDevProviderMessageType.CompleteMessage:
                    if (
                        currentState.state === 'GeneratingResponse' ||
                        currentState.state === 'ExecutingPlan' ||
                        currentState.state === 'CancellingResponse'
                    ) {
                        finalizeResponse();
                        if (!event.isReplay) {
                            dispatchRedux(actions.validateResponseFinalized());
                        }
                    }
                    break;

                case RovoDevProviderMessageType.ToolCall:
                    dispatchRedux(actions.responseRecieved());
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
                    dispatchRedux(actions.setPendingToolCall(toolCallMessage));
                    break;

                case RovoDevProviderMessageType.ToolReturn:
                    dispatchRedux(actions.responseRecieved());
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

                    dispatchRedux(actions.toolReturnReceived(returnMessage));
                    break;

                case RovoDevProviderMessageType.ErrorMessage:
                    if (event.message.type === 'error') {
                        if (event.message.isProcessTerminated) {
                            dispatchRedux(actions.setCurrentState({ state: 'ProcessTerminated' }));
                        }
                        finalizeResponse();
                    }
                    const msg = event.message;
                    dispatchRedux(actions.setRetryAfterErrorEnabled(msg.isRetriable ? msg.uid : ''));
                    dispatchRedux(actions.appendResponse(msg));
                    break;

                case RovoDevProviderMessageType.ClearChat:
                    clearChatHistory();
                    break;

                case RovoDevProviderMessageType.ProviderReady:
                    setWorkspaceCount(event.workspaceCount);
                    dispatchRedux(
                        actions.setCurrentState(
                            event.workspaceCount
                                ? { state: 'WaitingForPrompt' }
                                : { state: 'Disabled', subState: 'NoWorkspaceOpen' },
                        ),
                    );
                    break;

                case RovoDevProviderMessageType.SetInitializing:
                    dispatchRedux(
                        actions.setCurrentState({
                            state: 'Initializing',
                            subState: 'Other',
                            isPromptPending: event.isPromptPending,
                        }),
                    );
                    break;

                case RovoDevProviderMessageType.SetDownloadProgress:
                    dispatchRedux(
                        actions.setCurrentState({
                            state: 'Initializing',
                            subState: 'UpdatingBinaries',
                            isPromptPending: event.isPromptPending,
                            totalBytes: event.totalBytes,
                            downloadedBytes: event.downloadedBytes,
                        }),
                    );
                    break;

                case RovoDevProviderMessageType.RovoDevReady:
                    dispatchRedux(
                        actions.setCurrentState({
                            state: event.isPromptPending ? 'GeneratingResponse' : 'WaitingForPrompt',
                        }),
                    );
                    break;

                case RovoDevProviderMessageType.CancelFailed:
                    if (currentState.state === 'CancellingResponse') {
                        dispatchRedux(actions.setCurrentState({ state: 'GeneratingResponse' }));
                    }
                    break;

                case RovoDevProviderMessageType.RovoDevDisabled:
                    clearChatHistory();
                    dispatchRedux(
                        actions.setCurrentState({
                            state: 'Disabled',
                            subState: event.reason === 'needAuth' ? 'NeedAuth' : 'Other',
                        }),
                    );

                    break;

                case RovoDevProviderMessageType.UserFocusUpdated:
                    dispatchRedux(actions.updateUserFocus(event.userFocus));
                    break;

                case RovoDevProviderMessageType.ContextAdded:
                    dispatchRedux(actions.addContext(event.context));
                    break;

                case RovoDevProviderMessageType.CreatePRComplete:
                case RovoDevProviderMessageType.GetCurrentBranchNameComplete:
                case RovoDevProviderMessageType.CheckGitChangesComplete:
                    break; // This is handled elsewhere

                case RovoDevProviderMessageType.ForceStop:
                    // Signal user that Rovo Dev is stopping
                    if (currentState.state === 'GeneratingResponse' || currentState.state === 'ExecutingPlan') {
                        dispatchRedux(actions.setCurrentState({ state: 'CancellingResponse' }));
                    }
                    break;

                case RovoDevProviderMessageType.ShowFeedbackForm:
                    dispatchRedux(actions.setIsFeedbackFormVisible(true));
                    break;
                default:
                    // this is never supposed to happen since there aren't other type of messages
                    dispatchRedux(
                        actions.appendResponse({
                            source: 'RovoDevError',
                            type: 'error',
                            // @ts-expect-error ts(2339) - event here should be 'never'
                            text: `Unknown message type: ${event.type}`,
                            isRetriable: false,
                            uid: v4(),
                        }),
                    );
                    break;
            }
        },
        [currentState, clearChatHistory, dispatchRedux, finalizeResponse],
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
        (text: string): void => {
            if (
                text.trim() === '' ||
                (currentState.state !== 'WaitingForPrompt' && currentState.state !== 'Initializing')
            ) {
                return;
            }
            const currentContext = store.getState().promptContext;

            if (currentContext.isDeepPlanCreated) {
                dispatchRedux(actions.setIsDeepPlanCreated(false));
            }

            // Disable the send button, and enable the pause button
            dispatchRedux(actions.setCurrentState({ state: 'GeneratingResponse' }));

            // Send the prompt to backend

            dispatch({
                type: RovoDevViewResponseType.Prompt,
                text,
                enable_deep_plan: currentContext.isDeepPlanToggled,
                context: { ...currentContext.context },
            });
        },
        [currentState, dispatchRedux, store],
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
        dispatchRedux(actions.setCurrentState({ state: 'ExecutingPlan' }));
        sendPrompt(CODE_PLAN_EXECUTE_PROMPT);
    }, [currentState, dispatchRedux, sendPrompt]);

    const cancelResponse = useCallback((): void => {
        if (currentState.state === 'CancellingResponse') {
            return;
        }

        dispatchRedux(actions.setCurrentState({ state: 'CancellingResponse' }));
        if (isDeepPlanCreated) {
            dispatchRedux(actions.setIsDeepPlanCreated(false));
        }

        // Send the signal to cancel the response
        postMessage({
            type: RovoDevViewResponseType.CancelResponse,
        });
    }, [currentState, dispatchRedux, isDeepPlanCreated, postMessage]);

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

    const onChangesGitPushed = useCallback(
        (msg: DefaultMessage, pullRequestCreated: boolean) => {
            const totalModifiedFiles = store.getState().chatStream.totalModifiedFiles;

            if (totalModifiedFiles.length > 0) {
                keepFiles(totalModifiedFiles);
            }

            dispatchRedux(actions.appendResponse(msg));

            postMessage({
                type: RovoDevViewResponseType.ReportChangesGitPushed,
                pullRequestCreated,
            });
        },
        [store, dispatchRedux, postMessage, keepFiles],
    );

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

    return (
        <div className="rovoDevChat">
            <ChatStream
                openFile={openFile}
                messagingApi={{
                    postMessage,
                    postMessagePromise,
                }}
                executeCodePlan={executeCodePlan}
                onChangesGitPushed={onChangesGitPushed}
            />
            {currentState.state !== 'Disabled' && (
                <div className="input-section-container">
                    <UpdatedFilesComponent onUndo={undoFiles} onKeep={keepFiles} openDiff={openFile} />
                    <div className="prompt-container">
                        <PromptContextCollection
                            content={promptContextCollection}
                            readonly={false}
                            onRemoveContext={(item: RovoDevContextItem) => {
                                dispatchRedux(actions.removeContext(item));
                            }}
                            onToggleActiveItem={(enabled) => {
                                dispatchRedux(actions.toggleActiveItem(enabled));
                            }}
                        />
                        <PromptInputBox
                            disabled={workspaceCount === 0 || currentState.state === 'ProcessTerminated'}
                            hideButtons={workspaceCount === 0}
                            onSend={sendPrompt}
                            onCancel={cancelResponse}
                            onAddContext={() => {
                                postMessage({
                                    type: RovoDevViewResponseType.AddContext,
                                    currentContext: promptContextCollection,
                                });
                            }}
                            onCopy={handleCopyResponse}
                            handleMemoryCommand={executeGetAgentMemory}
                        />
                    </div>
                    <div className="ai-disclaimer">Uses AI. Verify results.</div>
                </div>
            )}
        </div>
    );
};

export default RovoDevView;
