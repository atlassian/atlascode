import React from 'react';
import { RovoDevContextItem, State } from 'src/rovo-dev/rovoDevTypes';

export const DebugPanel: React.FC<{
    currentState: State;
    context: RovoDevContextItem[];
}> = ({ currentState, context }) => {
    return (
        <div style={{ width: '100%', border: '1px solid var(--vscode-inputValidation-errorBorder)', padding: '4px' }}>
            <DebugStatePanel currentState={currentState} />
            <hr />
            <DebugContextPanel context={context} />
        </div>
    );
};

const DebugStatePanel: React.FC<{
    currentState: State;
}> = ({ currentState }) => {
    return (
        <table>
            <tr>
                <td>State:</td>
                <td>{currentState.state}</td>
            </tr>
            {(currentState.state === 'Disabled' || currentState.state === 'Initializing') && (
                <tr>
                    <td>Substate:</td>
                    <td>{currentState.subState}</td>
                </tr>
            )}
            {currentState.state === 'Initializing' && (
                <tr>
                    <td>Is prompt pending:</td>
                    <td>{String(currentState.isPromptPending)}</td>
                </tr>
            )}
        </table>
    );
};

const DebugContextPanel: React.FC<{
    context: RovoDevContextItem[];
}> = ({ context }) => {
    return (
        <div>
            <label>Enabled/Total context files:</label>
            <label>{` ${context.filter((x) => x.enabled).length}/${context.length}`}</label>
        </div>
    );
};
