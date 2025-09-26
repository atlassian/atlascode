import React, { useCallback } from 'react';
import { InitializingDownladingState, InitializingState, State } from 'src/rovo-dev/rovoDevTypes';

export const ToolCallItem: React.FC<{
    toolMessage: string;
    currentState: State;
}> = ({ toolMessage, currentState }) => {
    const getMessage = useCallback(
        () => (currentState.state === 'Initializing' ? getInitStatusMessage(currentState) : toolMessage),
        [toolMessage, currentState],
    );

    return (
        <div className="tool-call-item-base tool-call-item" style={{ flexWrap: 'wrap' }}>
            <div className="tool-call-item-base">
                <i className="codicon codicon-loading codicon-modifier-spin" />
                <span>{getMessage()}</span>
            </div>
            {currentState.state === 'Initializing' &&
                currentState.subState === 'UpdatingBinaries' &&
                currentState.totalBytes > 0 && (
                    <progress
                        max={currentState.totalBytes}
                        value={currentState.downloadedBytes}
                        style={{ alignSelf: 'center', width: '100px', marginLeft: '4px' }}
                    />
                )}
        </div>
    );
};

export function parseToolCallMessage(msgToolName: string): string {
    switch (msgToolName) {
        case '':
        case null:
        case undefined:
            return '';
        case 'create_file':
            return 'Creating file';
        case 'delete_file':
            return 'Deleting file';
        case 'move_file':
            return 'Moving file';
        case 'find_and_replace_code':
            return 'Finding and replacing code';
        case 'open_files':
            return 'Opening files';
        case 'expand_code_chunks':
            return 'Expanding code';
        case 'expand_folder':
            return 'Expanding folder';
        case 'grep':
            return `Searching for patterns`;
        case 'bash':
            return `Executing bash command`;
        case 'create_technical_plan':
            return 'Creating technical plan';
        default:
            return msgToolName;
    }
}

function getInitStatusMessage(state: InitializingState | InitializingDownladingState): string {
    switch (state.subState) {
        case 'Other':
            return 'Rovo Dev is initializing';
        case 'UpdatingBinaries':
            return 'Rovo Dev is updating';
        case 'MCPAcceptance':
            return 'MCPAcceptance'; // this substate is not displayed in the loading spinner
        default:
            // @ts-expect-error ts(2339) - state here should be 'never'
            return state.toString();
    }
}
