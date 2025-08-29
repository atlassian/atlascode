import { window } from 'vscode';

import { QuickFlow } from './quickFlow';
import { QuickFlowAnalyticsEvent } from './types';

jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
    },
}));

type UIType = {};
type DataType = { foo?: string; bar?: number };

class TestQuickFlow extends QuickFlow<UIType, DataType> {
    private _ui: UIType = {};
    private _initialState: any;

    constructor(initialState: any) {
        super('test', undefined);
        this._initialState = initialState;
    }

    initialState() {
        return this._initialState;
    }

    ui() {
        return this._ui;
    }

    override enrichEvent(event: Partial<QuickFlowAnalyticsEvent>): QuickFlowAnalyticsEvent {
        return {
            ...event,
            flowType: 'test',
        } as any;
    }
}

function createState(isTerminal: boolean, actionImpl: any) {
    return {
        isTerminal,
        action: actionImpl,
    };
}

describe('QuickFlow.run', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should run through states and call terminal action', async () => {
        const terminalAction = jest.fn().mockResolvedValue([null, undefined]);
        const terminalState = createState(true, terminalAction);

        const nonTerminalAction = jest.fn().mockResolvedValue([{ foo: 'bar' }, terminalState]);
        const nonTerminalState = createState(false, nonTerminalAction);

        const flow = new TestQuickFlow(nonTerminalState);

        await flow.run({ foo: 'start' });

        expect(nonTerminalAction).toHaveBeenCalledWith({ foo: 'start' }, flow.ui());
        expect(terminalAction).toHaveBeenCalledWith({ foo: 'bar' }, flow.ui());
        expect(window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should accumulate data correctly', async () => {
        const terminalAction = jest.fn().mockResolvedValue([null, undefined]);
        const terminalState = createState(true, terminalAction);

        const nonTerminalAction = jest.fn().mockResolvedValue([{ foo: 'bar' }, terminalState]);
        const nonTerminalState = createState(false, nonTerminalAction);

        const flow = new TestQuickFlow(nonTerminalState);

        await flow.run({ bar: 42 });

        // Data should be merged: { bar: 42 } + { foo: 'bar' } = { bar: 42, foo: 'bar' }
        expect(nonTerminalAction).toHaveBeenCalledWith({ bar: 42 }, flow.ui());
        expect(terminalAction).toHaveBeenCalledWith({ bar: 42, foo: 'bar' }, flow.ui());
    });

    it('should call ui() method', async () => {
        const terminalAction = jest.fn().mockResolvedValue([null, undefined]);
        const terminalState = createState(true, terminalAction);

        const nonTerminalAction = jest.fn().mockResolvedValue([null, terminalState]);
        const nonTerminalState = createState(false, nonTerminalAction);

        const flow = new TestQuickFlow(nonTerminalState);

        const uiSpy = jest.spyOn(flow, 'ui');

        await flow.run();

        expect(uiSpy).toHaveBeenCalled();
    });
});
