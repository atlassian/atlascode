import { State } from './types';

type FlowAction<UIType, DataType> = {
    data: Partial<DataType>;
    state?: State<UIType, Partial<DataType>>;
};

export abstract class QuickFlow<UIType, DataType> {
    private evalData(stack: FlowAction<UIType, DataType>[]): Partial<DataType> {
        return stack.reduce((acc, curr) => {
            return { ...acc, ...curr.data };
        }, {});
    }

    public abstract initialState(): State<UIType, Partial<DataType>>;

    public abstract ui(): UIType;

    public async run(initialData?: Partial<DataType>) {
        let state = this.initialState();
        const ui = this.ui();

        const actionStack = [{ data: initialData || {}, state }];

        while (actionStack.length > 0 && !state.isTerminal) {
            const data = this.evalData(actionStack);
            const [newData, nextState] = await state.action(data, ui);

            if (nextState === undefined) {
                // go back
                const old = actionStack.pop();

                if (!old?.state) {
                    // nothing to go back to, exit
                    break;
                }

                state = old.state;
                continue;
            }

            if (newData) {
                actionStack.push({ data: newData, state: state });
            }

            state = nextState;
        }

        if (actionStack.length > 0 && state.isTerminal) {
            state.action(this.evalData(actionStack), ui);
        }

        // If the flow is cancelled, do nothing
    }
}
