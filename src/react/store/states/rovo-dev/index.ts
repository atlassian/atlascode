import ChatStreamReducer, {
    appendModifiedFileToolReturn,
    appendResponse,
    clearChat,
    removeModifiedFileToolReturns,
    setIsFeedbackFormVisible,
    setPendingToolCall,
    setRetryAfterErrorEnabled,
    toolReturnReceived,
    validateResponseFinalized,
} from './chatStreamSlice';
import PromptContextReducer, {
    addContext,
    removeContext,
    setIsDeepPlanCreated,
    setIsDeepPlanToggled,
    toggleActiveItem,
    updateUserFocus,
} from './promptContextSlice';
import RovoDevStatesReducer, { responseRecieved, setCurrentState } from './rovoDevStatesSlice';
const actions = {
    setCurrentState,
    updateUserFocus,
    addContext,
    removeContext,
    toggleActiveItem,
    setIsDeepPlanToggled,
    setIsDeepPlanCreated,
    appendResponse,
    appendModifiedFileToolReturn,
    clearChat,
    setPendingToolCall,
    removeModifiedFileToolReturns,
    responseRecieved,
    validateResponseFinalized,
    setRetryAfterErrorEnabled,
    toolReturnReceived,
    setIsFeedbackFormVisible,
};
export { PromptContextReducer, RovoDevStatesReducer, ChatStreamReducer, actions };
