import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RovoDevContext, RovoDevContextItem } from 'src/rovo-dev/rovoDevTypes';

const promptContextSlice = createSlice({
    name: 'promptContext',
    initialState: {
        context: {} as RovoDevContext,
        isDeepPlanToggled: false,
        isDeepPlanCreated: false,
    },
    reducers: {
        updateUserFocus(state, action: PayloadAction<RovoDevContextItem>) {
            const prev = { ...state.context };
            state.context = { ...prev, focusInfo: { ...action.payload, enabled: prev.focusInfo?.enabled ?? true } };
        },
        addContext(state, action: PayloadAction<RovoDevContextItem>) {
            const prev = { ...state.context };
            const newItem: RovoDevContextItem = action.payload;
            const match = (item: any) =>
                item.file.absolutePath === newItem.file.absolutePath &&
                item.selection?.start === newItem.selection?.start &&
                item.selection?.end === newItem.selection?.end;

            const contextItems = prev.contextItems || [];
            const idx = contextItems.findIndex(match);

            state.context = idx === -1 ? { ...prev, contextItems: [...contextItems, newItem] } : prev;
        },
        removeContext(state, action: PayloadAction<RovoDevContextItem>) {
            const prev = { ...state.context };
            const itemToRemove: RovoDevContextItem = action.payload;

            state.context = {
                ...prev,
                contextItems:
                    prev.contextItems?.filter(
                        (item) =>
                            item.file.absolutePath !== itemToRemove.file.absolutePath ||
                            item.selection?.start !== itemToRemove.selection?.start ||
                            item.selection?.end !== itemToRemove.selection?.end,
                    ) || [],
            };
        },
        toggleActiveItem(state, action: PayloadAction<boolean>) {
            const prev = { ...state.context };
            const enabled: boolean = action.payload;
            if (!prev.focusInfo) {
                return;
            }
            state.context = { ...prev, focusInfo: { ...prev.focusInfo, enabled } };
        },
        setIsDeepPlanToggled(state, action: PayloadAction<boolean>) {
            state.isDeepPlanToggled = action.payload;
        },
        setIsDeepPlanCreated(state, action: PayloadAction<boolean>) {
            state.isDeepPlanCreated = action.payload;
        },
    },
});

export const {
    updateUserFocus,
    addContext,
    removeContext,
    toggleActiveItem,
    setIsDeepPlanCreated,
    setIsDeepPlanToggled,
} = promptContextSlice.actions;
export default promptContextSlice.reducer;
