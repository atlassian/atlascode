import React, { useCallback } from 'react';
import { RovoDevToolName } from 'src/rovo-dev/client';
import { InitializingDownladingState, InitializingState, State } from 'src/rovo-dev/rovoDevTypes';

export interface SubagentInfo {
    subagentName: string;
    taskName: string;
}

export const ToolCallItem: React.FC<{
    toolMessage: string;
    currentState: State;
    subagentTasks?: SubagentInfo[];
}> = ({ toolMessage, currentState, subagentTasks }) => {
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
            {subagentTasks && subagentTasks.length > 0 && (
                <div className="subagent-task-list">
                    {subagentTasks.map((task, index) => (
                        <div key={index} className="subagent-task-item">
                            <code>
                                Subagent: {task.subagentName} ({task.taskName})
                            </code>
                        </div>
                    ))}
                </div>
            )}
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

export function parseToolCallMessage(msgToolName: RovoDevToolName): string {
    if (!msgToolName) {
        return '';
    }

    switch (msgToolName) {
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
        case 'mcp_invoke_tool':
        case 'mcp__atlassian__invoke_tool':
        case 'mcp__atlassian__get_tool_schema':
        case 'mcp__scout__invoke_tool':
            return "Invoking MCP server's tool";
        case 'invoke_subagents':
            return 'Delegating tasks to subagents';
        case 'ask_user_questions':
            return 'Asking user questions';
        case 'exit_plan_mode':
            return 'Exiting plan mode';
        default:
            // @ts-expect-error ts(2339) - msgToolName here should be 'never'
            return msgToolName.toString();
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
