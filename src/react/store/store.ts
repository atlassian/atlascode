import { configureStore } from '@reduxjs/toolkit';

import {
    ChatStreamReducer,
    DeepPlanReducer,
    PromptContextCollectionReducer,
    RovoDevStatesReducer,
} from './states/rovo-dev';

const store = configureStore({
    reducer: {
        // Rovo Dev
        promptContextCollection: PromptContextCollectionReducer,
        deepPlan: DeepPlanReducer,
        rovoDevStates: RovoDevStatesReducer,
        chatStream: ChatStreamReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export default store;
