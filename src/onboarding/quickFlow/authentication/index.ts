import { Container } from 'src/container';
import { AnalyticsApi } from 'src/lib/analyticsApi';
import * as uuid from 'uuid';

import { QuickFlow } from '../quickFlow';
import { QuickFlowAnalyticsEvent } from '../types';
import { AuthFlowUI } from './authFlowUI';
import { CommonAuthStates } from './states/common';
import { AuthFlowData, AuthState } from './types';

export { AuthFlowData };

export class AuthFlow extends QuickFlow<AuthFlowUI, AuthFlowData> {
    static FlowDataType: AuthFlowData;
    static UIType: AuthFlowUI;

    private readonly origin?: string;
    private readonly _ui: AuthFlowUI;

    constructor({
        origin,
        flowId = uuid.v4(),
        analyticsApi = Container.analyticsApi,
        _ui = new AuthFlowUI(),
    }: {
        origin?: string;
        flowId?: string;
        analyticsApi?: AnalyticsApi;
        _ui?: AuthFlowUI;
    } = {}) {
        super(flowId, analyticsApi);
        this._ui = _ui;
        this.origin = origin;
    }

    initialState(): AuthState {
        return CommonAuthStates.initialState;
    }

    ui() {
        return this._ui;
    }

    override enrichEvent(event: Partial<QuickFlowAnalyticsEvent>): QuickFlowAnalyticsEvent {
        return {
            ...event,
            flowType: 'auth',
            origin: this.origin,
        } as QuickFlowAnalyticsEvent;
    }
}
