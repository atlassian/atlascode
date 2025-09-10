import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RovoDevInitState, State, SubState } from 'src/rovo-dev/rovoDevTypes';

const rovoDevStatesSlice = createSlice({
    name: 'rovoDevStates',
    initialState: {
        currentState: State.WaitingForPrompt,
        currentSubState: SubState.None,
        initState: process.env.ROVODEV_BBY ? RovoDevInitState.Initialized : RovoDevInitState.NotInitialized,
    },
    reducers: {
        setCurrentState(state, action: PayloadAction<State>) {
            state.currentState = action.payload;
        },
        setCurrentSubState(state, action: PayloadAction<SubState>) {
            state.currentSubState = action.payload;
        },
        setInitState(state, action: PayloadAction<RovoDevInitState>) {
            state.initState = action.payload;
        },
        initStateRecieced(state, action: PayloadAction<RovoDevInitState>) {
            state.initState = action.payload;
            state.currentState = State.WaitingForPrompt;
            state.currentSubState = SubState.None;
        },
        responseRecieved(state) {
            if (state.currentState === State.WaitingForPrompt) {
                state.currentState = State.GeneratingResponse;
            }
        },
    },
});

export const { setCurrentState, setCurrentSubState, setInitState, initStateRecieced, responseRecieved } =
    rovoDevStatesSlice.actions;
export default rovoDevStatesSlice.reducer;
