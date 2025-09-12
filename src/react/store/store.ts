import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { ChatStreamReducer, PromptContextReducer, RovoDevStatesReducer } from './states/rovo-dev';

const rootReducer = combineReducers({
    // Rovo Dev
    promptContext: PromptContextReducer,
    rovoDevStates: RovoDevStatesReducer,
    chatStream: ChatStreamReducer,
});
const store = configureStore({
    reducer: rootReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
    return configureStore({
        reducer: rootReducer,
        preloadedState,
    });
};
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export default store;
