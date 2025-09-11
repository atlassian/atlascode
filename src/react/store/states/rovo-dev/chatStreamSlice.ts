import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LOADING_MESSAGE } from 'src/react/atlascode/rovo-dev/tools/ToolCallItem';
import {
    ChatMessage,
    ErrorMessage,
    isCodeChangeTool,
    parseToolReturnMessage,
    Response,
    ToolReturnGenericMessage,
    ToolReturnParseResult,
} from 'src/react/atlascode/rovo-dev/utils';
import { v4 } from 'uuid';

import { AppDispatch } from '../../store';
import { setIsDeepPlanCreated } from './promptContextSlice';

const chatStreamSlice = createSlice({
    name: 'chatStream',
    initialState: {
        history: [] as Response[],
        pendingToolCall: '' as string,
        totalModifiedFiles: [] as ToolReturnParseResult[],
        retryAfterErrorEnabled: '' as string,
        isFeedbackVisible: false,
    },
    reducers: {
        appendResponse(state, action: PayloadAction<Response>) {
            const response = action.payload;
            const prev = [...state.history];
            if (!response) {
                return;
            }

            const latest = prev.pop();

            if (!latest) {
                state.history = [...prev, response];
                return;
            }

            if (!Array.isArray(response)) {
                if (!Array.isArray(latest)) {
                    // Streaming text response, append to current message
                    if (latest && latest.source === 'RovoDev' && response.source === 'RovoDev') {
                        latest.text += response.text;
                        state.history = [...prev, latest];
                        return;
                    }

                    // Group tool return with previous message if applicable
                    if (response.source === 'ToolReturn') {
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
                            state.history = [...prev, thinkingGroup];
                            return;
                        }
                    }
                } else {
                    if (response.source === 'ToolReturn') {
                        if (response.tool_name !== 'create_technical_plan') {
                            latest.push(response);
                            state.history = [...prev, latest];
                            return;
                        }
                    }
                    state.history = [...prev, latest, response];
                    return;
                }
            }

            state.history = [...prev, latest, response];
        },
        clearChat(state) {
            state.history = [];
            state.pendingToolCall = '';
            state.totalModifiedFiles = [];
            state.retryAfterErrorEnabled = '';
            state.isFeedbackVisible = false;
        },
        appendModifiedFileToolReturn(state, action: PayloadAction<ToolReturnGenericMessage>) {
            const toolReturn = action.payload;
            if (isCodeChangeTool(toolReturn.tool_name)) {
                const msg = parseToolReturnMessage(toolReturn).filter((msg) => msg.filePath !== undefined);

                const filesMap = new Map([...state.totalModifiedFiles].map((item) => [item.filePath!, item]));

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

                state.totalModifiedFiles = Array.from(filesMap.values());
            }
        },
        removeModifiedFileToolReturns(state, action: PayloadAction<ToolReturnParseResult[]>) {
            const filesToRemove = action.payload;
            const prev = [...state.totalModifiedFiles];
            if (filesToRemove.length === 0) {
                return;
            }
            const filePathsToRemove = filesToRemove.map((file) => file.filePath);
            state.totalModifiedFiles = prev.filter((x) => !filePathsToRemove.includes(x.filePath));
        },
        setPendingToolCall(state, action: PayloadAction<string>) {
            if (!action.payload) {
                state.pendingToolCall = '';
                return;
            }
            state.pendingToolCall = action.payload;
        },
        validateResponseFinalized(state) {
            const prev = [...state.history];
            const last = prev[prev.length - 1];
            if (!Array.isArray(last) && last?.source === 'User') {
                const msg: ErrorMessage = {
                    source: 'RovoDevError',
                    type: 'error',
                    text: 'Error: something went wrong while processing the prompt',
                    isRetriable: true,
                    uid: v4(),
                };
                state.retryAfterErrorEnabled = msg.uid;
                prev.pop();
                state.history = [...prev, msg];
            } else {
                return;
            }
        },
        setRetryAfterErrorEnabled(state, action: PayloadAction<string>) {
            state.retryAfterErrorEnabled = action.payload;
        },
        setIsFeedbackFormVisible(state, action: PayloadAction<boolean>) {
            state.isFeedbackVisible = action.payload;
        },
    },
});

//Thunks
export const toolReturnReceived = (response: ToolReturnGenericMessage) => {
    return (dispatch: AppDispatch) => {
        dispatch(setPendingToolCall(DEFAULT_LOADING_MESSAGE));
        dispatch(appendResponse(response));
        dispatch(appendModifiedFileToolReturn(response));
        if (response.tool_name === 'create_technical_plan') {
            dispatch(setIsDeepPlanCreated(true));
        }
    };
};

export const {
    appendResponse,
    appendModifiedFileToolReturn,
    clearChat,
    setPendingToolCall,
    removeModifiedFileToolReturns,
    validateResponseFinalized,
    setRetryAfterErrorEnabled,
    setIsFeedbackFormVisible,
} = chatStreamSlice.actions;
export default chatStreamSlice.reducer;
