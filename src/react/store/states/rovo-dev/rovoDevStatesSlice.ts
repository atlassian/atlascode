import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { State } from 'src/rovo-dev/rovoDevTypes';

const rovoDevStatesSlice = createSlice({
    name: 'rovoDevStates',
    initialState: {
        currentState: { state: 'WaitingForPrompt' } as State,
    },
    reducers: {
        setCurrentState(state, action: PayloadAction<State>) {
            state.currentState = action.payload;
        },

        responseRecieved(state) {
            if (state.currentState.state === 'WaitingForPrompt') {
                state.currentState.state = 'GeneratingResponse';
            }
        },
    },
});

export const { setCurrentState, responseRecieved } = rovoDevStatesSlice.actions;
export default rovoDevStatesSlice.reducer;
