import React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

export const DebugPanel: React.FC<{
    currentState: State;
    debugContext: Record<string, string>;
}> = ({ currentState, debugContext }) => {
    return (
        <div style={{ width: '100%', border: '1px solid var(--vscode-inputValidation-errorBorder)', padding: '4px' }}>
            <DebugStatePanel currentState={currentState} />
            <hr />
            <DebugContextPanel debugContext={debugContext} />
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
    debugContext: Record<string, string>;
}> = ({ debugContext }) => {
    const props = React.useMemo(() => {
        const p: [string, string][] = [];
        for (const key in debugContext) {
            p.push([key, debugContext[key]]);
        }
        return p;
    }, [debugContext]);

    return (
        <table>
            {props.map(([key, value]) => (
                <tr>
                    <td>{key}</td>
                    <td>{value}</td>
                </tr>
            ))}
        </table>
    );
};
