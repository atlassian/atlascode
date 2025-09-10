import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const deepPlanSlice = createSlice({
    name: 'deepPlan',
    initialState: {
        isDeepPlanToggled: false,
        isDeepPlanCreated: false,
    },
    reducers: {
        setIsDeepPlanToggled(state, action: PayloadAction<boolean>) {
            state.isDeepPlanToggled = action.payload;
        },
        setIsDeepPlanCreated(state, action: PayloadAction<boolean>) {
            state.isDeepPlanCreated = action.payload;
        },
    },
});

export const { setIsDeepPlanToggled, setIsDeepPlanCreated } = deepPlanSlice.actions;
export default deepPlanSlice.reducer;
