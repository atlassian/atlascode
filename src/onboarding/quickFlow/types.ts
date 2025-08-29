export type State<UIType, DataType> = {
    /** Name of the state - for debug only */
    name: string;

    /**
     * Action handler of the state.
     *
     * @param data The current data for the flow.
     * @param ui The UI instance for showing input boxes.
     * @returns The new data and the next state. To go back, return `undefined` as the next state
     */
    action: (data: Partial<DataType>, ui: UIType) => Promise<TransitionInfo<UIType, DataType>>;

    /** Is this state terminal? */
    isTerminal?: boolean;

    /** Is this terminal state a failure? */
    isFailure?: boolean;
};

type TransitionInfo<UIType, DataType> = [DataType | undefined, State<UIType, DataType> | undefined];

export class Transition {
    static forward<UIType, DataType>(
        state: State<UIType, DataType>,
        data?: DataType,
    ): TransitionInfo<UIType, DataType> {
        return [data, state];
    }

    static back<UIType, DataType>(): TransitionInfo<UIType, DataType> {
        return [undefined, undefined];
    }

    static done<UIType, DataType>(): TransitionInfo<UIType, DataType> {
        return [undefined, undefined];
    }
}

export enum QuickFlowStatus {
    Started = 'started',
    InProgress = 'in_progress',
    Completed = 'completed',
    Cancelled = 'cancelled',
    Failed = 'failed',
}

export type QuickFlowAnalyticsEvent = {
    flowType: string;
    flowId: string;
    status: QuickFlowStatus;

    origin?: string;
    direction?: 'forward' | 'back';
    stepNumber?: number;
    step?: string;
    nextStep?: string;
};
