import React, { useCallback } from 'react';
import { RovoDevInitState } from 'src/rovo-dev/rovoDevTypes';

import { ToolCallMessage } from '../utils';

export const DEFAULT_LOADING_MESSAGE: string = 'Rovo dev is working';

export const ToolCallItem: React.FC<{
    toolMessage: string;
    state: RovoDevInitState;
    downloadProgress?: [number, number];
}> = ({ toolMessage, state, downloadProgress }) => {
    const getMessage = useCallback(
        () => (state === RovoDevInitState.Initialized ? toolMessage : getInitStatusMessage(state)),
        [toolMessage, state],
    );

    return (
        <div className="tool-call-item-base tool-call-item" style={{ flexWrap: 'wrap' }}>
            <div className="tool-call-item-base">
                <i className="codicon codicon-loading codicon-modifier-spin" />
                <span>{getMessage()}</span>
            </div>
            {state === RovoDevInitState.UpdatingBinaries && !!downloadProgress && downloadProgress[1] > 0 && (
                <progress
                    max={downloadProgress[1]}
                    value={downloadProgress[0]}
                    style={{ alignSelf: 'center', width: '100px', marginLeft: '4px' }}
                />
            )}
        </div>
    );
};

export function parseToolCallMessage(msg: ToolCallMessage): string {
    switch (msg.tool_name) {
        case '':
        case null:
        case undefined:
            return '';
        case 'expand_code_chunks':
            return 'Expanding code';
        case 'find_and_replace_code':
            return 'Finding and replacing code';
        case 'open_files':
            return 'Opening files';
        case 'create_file':
            return 'Creating file';
        case 'delete_file':
            return 'Deleting file';
        case 'bash':
            return `Executing bash command`;
        case 'create_technical_plan':
            return 'Creating technical plan';
        case 'grep_file_content':
            return `Grep file content with pattern`;
        case 'grep_file_path':
            return 'Grep file path';
        default:
            return msg.tool_name;
    }
}

function getInitStatusMessage(state: RovoDevInitState): string {
    switch (state) {
        case RovoDevInitState.NotInitialized:
            return 'Rovo Dev is initializing';
        case RovoDevInitState.UpdatingBinaries:
            return 'Rovo Dev is updating';
        case RovoDevInitState.Initialized:
            return DEFAULT_LOADING_MESSAGE;
        default:
            // @ts-expect-error ts(2339) - state here should be 'never'
            return state.toString();
    }
}
