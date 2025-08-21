import { QuickFlow } from '../baseFlow';
import { BaseUI } from '../baseUI';
import { AuthState, States } from './states';
import { AuthFlowData } from './types';
import { UI } from './ui';

export { AuthFlowData };

export class AuthFlow extends QuickFlow<UI, AuthFlowData> {
    static FlowDataType: AuthFlowData;
    static UIType: UI;

    constructor(
        private readonly _ui: UI = new UI(new BaseUI('Authenticate with Jira')),
        private readonly _states: States = new States(),
    ) {
        super();
    }

    initialState(): AuthState {
        return this._states.initial;
    }

    ui() {
        return this._ui;
    }
}
