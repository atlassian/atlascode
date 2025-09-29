import React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { MarkedDown } from '../common/common';

export const DebugPanel: React.FC<{
    currentState: State;
    debugContext: Record<string, string>;
    debugMcpContext: Record<string, string>;
}> = ({ currentState, debugContext, debugMcpContext }) => {
    return (
        <div style={{ width: '100%', border: '1px solid var(--vscode-inputValidation-errorBorder)', padding: '4px' }}>
            <DebugStatePanel currentState={currentState} />
            {Object.keys(debugContext).length > 0 && (
                <>
                    <hr />
                    <DebugContextPanel title="Provider's state" debugContext={debugContext} />
                </>
            )}
            {Object.keys(debugMcpContext).length > 0 && (
                <>
                    <hr />
                    <DebugContextPanel title="MCP servers" debugContext={debugMcpContext} />
                </>
            )}
        </div>
    );
};

const DebugStatePanel: React.FC<{
    currentState: State;
}> = ({ currentState }) => {
    return (
        <table>
            <tr>
                <td>View's state:</td>
                <td>{currentState.state}</td>
            </tr>
            {(currentState.state === 'Disabled' || currentState.state === 'Initializing') && (
                <tr>
                    <td>Substate:</td>
                    <td>{currentState.subState}</td>
                </tr>
            )}
            {currentState.state === 'Initializing' && currentState.subState === 'UpdatingBinaries' && (
                <tr>
                    <td>Downloaded:</td>
                    <td>
                        {currentState.downloadedBytes} / {currentState.totalBytes}
                    </td>
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
    title: string;
    debugContext: Record<string, string>;
}> = ({ title, debugContext }) => {
    const props = React.useMemo(() => {
        const p: [string, string][] = [];
        for (const key in debugContext) {
            p.push([key, debugContext[key]]);
        }
        return p;
    }, [debugContext]);

    return (
        <details open>
            <summary>{title}</summary>
            <table>
                {props.map(([key, value]) => (
                    <tr>
                        <td>{key}</td>
                        {key === 'RovoDevAddress' && (
                            <td>
                                <MarkedDown value={value + '/docs'} />
                            </td>
                        )}
                        {key !== 'RovoDevAddress' && <td>{value}</td>}
                    </tr>
                ))}
            </table>
        </details>
    );
};
