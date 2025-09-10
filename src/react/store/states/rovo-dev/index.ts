import ChatStreamReducer, {
    appendModifiedFileToolReturn,
    appendResponse,
    clearChat,
    removeModifiedFileToolReturns,
    setPendingToolCall,
    setRetryAfterErrorEnabled,
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
import RovoDevStatesReducer, {
    initStateRecieced,
    responseRecieved,
    setCurrentState,
    setCurrentSubState,
    setInitState,
} from './rovoDevStatesSlice';
const actions = {
    setCurrentState,
    setCurrentSubState,
    setInitState,
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
    initStateRecieced,
    responseRecieved,
    validateResponseFinalized,
    setRetryAfterErrorEnabled,
};
export { PromptContextReducer, RovoDevStatesReducer, ChatStreamReducer, actions };
