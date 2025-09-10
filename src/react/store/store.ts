import { configureStore } from '@reduxjs/toolkit';

import { ChatStreamReducer, PromptContextReducer, RovoDevStatesReducer } from './states/rovo-dev';

const store = configureStore({
    reducer: {
        // Rovo Dev
        promptContext: PromptContextReducer,
        rovoDevStates: RovoDevStatesReducer,
        chatStream: ChatStreamReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export default store;
