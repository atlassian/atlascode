import { QuickFlow } from '../quickFlow';
import { AuthFlowUI } from './authFlowUI';
import { CommonAuthStates } from './states/common';
import { AuthFlowData, AuthState } from './types';

export { AuthFlowData };

export class AuthFlow extends QuickFlow<AuthFlowUI, AuthFlowData> {
    static FlowDataType: AuthFlowData;
    static UIType: AuthFlowUI;

    constructor(private readonly _ui: AuthFlowUI = new AuthFlowUI()) {
        super();
    }

    initialState(): AuthState {
        return CommonAuthStates.initialState;
    }

    ui() {
        return this._ui;
    }
}
