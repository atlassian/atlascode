import { AnalyticsApi } from 'src/lib/analyticsApi';

import { QuickFlowAnalyticsEvent, QuickFlowStatus, State } from './types';

type FlowAction<UIType, DataType> = {
    data: Partial<DataType>;
    state?: State<UIType, Partial<DataType>>;
};

export abstract class QuickFlow<UIType, DataType> {
    constructor(
        private readonly flowId: string,
        private readonly analyticsApi?: AnalyticsApi,
    ) {
        this.flowId = flowId;
    }

    private evalData(stack: FlowAction<UIType, DataType>[]): Partial<DataType> {
        return stack.reduce((acc, curr) => {
            return { ...acc, ...curr.data };
        }, {});
    }

    public abstract initialState(): State<UIType, Partial<DataType>>;

    public abstract ui(): UIType;

    public async run(initialData?: Partial<DataType>): Promise<QuickFlowStatus> {
        let state = this.initialState();
        const ui = this.ui();
        let stepCount = 0;

        this.track({
            status: QuickFlowStatus.Started,
            step: state.name,
            stepNumber: stepCount,
        });

        const actionStack = [{ data: initialData || {}, state }];

        while (actionStack.length > 0 && !state.isTerminal) {
            ++stepCount;
            const data = this.evalData(actionStack);
            const [newData, nextState] = await state.action(data, ui);

            if (nextState === undefined) {
                const old = actionStack.pop();

                if (!old?.state) {
                    // nothing to go back to, exit
                    break;
                }

                // go back
                this.track({
                    status: QuickFlowStatus.InProgress,
                    direction: 'back',
                    step: state.name,
                    nextStep: old.state.name,
                    stepNumber: stepCount,
                });

                state = old.state;
                continue;
            }

            if (newData) {
                actionStack.push({ data: newData, state: state });
            }

            this.track({
                status: QuickFlowStatus.InProgress,
                step: state.name,
                nextStep: nextState.name,
                stepNumber: stepCount,
                direction: 'forward',
            });

            state = nextState;
        }

        if (actionStack.length > 0 && state.isTerminal) {
            const finalStatus = state.isFailure ? QuickFlowStatus.Failed : QuickFlowStatus.Completed;
            this.track({
                status: finalStatus,
                step: state.name,
                stepNumber: stepCount,
            });
            state.action(this.evalData(actionStack), ui);
            return finalStatus;
        }

        // The flow is cancelled, report it
        this.track({
            status: QuickFlowStatus.Cancelled,
            step: state.name,
            stepNumber: stepCount,
        });

        return QuickFlowStatus.Cancelled;
    }

    abstract enrichEvent(event: Partial<QuickFlowAnalyticsEvent>): QuickFlowAnalyticsEvent;

    private track(event: Partial<QuickFlowAnalyticsEvent>) {
        // fill in transition information for consistency
        if (event.status === 'cancelled') {
            event.nextStep = '_CANCELLED';
            event.direction = 'back';
        } else if (event.status === 'completed') {
            event.nextStep = '_DONE';
            event.direction = 'forward';
        } else if (event.status === 'failed') {
            event.nextStep = '_FAILED';
            event.direction = 'forward';
        }

        this.analyticsApi?.fireQuickFlowEvent(
            this.enrichEvent({
                flowId: this.flowId,
                ...event,
            }),
        );
    }
}
