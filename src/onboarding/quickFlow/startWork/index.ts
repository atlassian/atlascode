import { QuickFlow } from '../quickFlow';
import { State, QuickFlowAnalyticsEvent } from '../types';
import { StartWorkFlowUI } from './startWorkFlowUI';
import { StartWorkData, StartWorkStates } from './startWorkStates';

export class StartWorkQuickFlow extends QuickFlow<StartWorkFlowUI, StartWorkData> {
    private readonly _ui: StartWorkFlowUI = new StartWorkFlowUI();
    private readonly _states: StartWorkStates = new StartWorkStates();

    constructor() {
        super('startWorkFlow');
    }

    public override initialState(): State<StartWorkFlowUI, Partial<StartWorkData>> {
        return this._states.initialState;
    }

    public override ui(): StartWorkFlowUI {
        return this._ui;
    }

    override enrichEvent(event: Partial<QuickFlowAnalyticsEvent>): QuickFlowAnalyticsEvent {
        return {
            ...event,
            flowType: 'startWork',
        } as QuickFlowAnalyticsEvent;
    }
}
