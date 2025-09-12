import React from 'react';
import { useAppSelector } from 'src/react/store/hooks';

import { OpenFileFunc } from '../../common/common';
import { ToolReturnParseResult } from '../../utils';
import { ModifiedFileItem } from './ModifiedFileItem';

export const UpdatedFilesComponent: React.FC<{
    onUndo: (files: ToolReturnParseResult[]) => void;
    onKeep: (files: ToolReturnParseResult[]) => void;
    openDiff: OpenFileFunc;
    workspacePath?: string;
    homeDir?: string;
}> = ({ onUndo, onKeep, openDiff, workspacePath, homeDir }) => {
    const modifiedFiles = useAppSelector((state) => state.chatStream.totalModifiedFiles);
    const currentState = useAppSelector((state) => state.rovoDevStates.currentState);
    const actionsEnabled = currentState.state === 'WaitingForPrompt';
    if (!modifiedFiles || modifiedFiles.length === 0) {
        return null;
    }

    return (
        <div className="updated-files-container">
            <div className="updated-files-header">
                <div>
                    <i className="codicon codicon-source-control" />
                    <span>
                        {modifiedFiles.length} Updated file{modifiedFiles.length > 1 ? 's' : ''}
                    </span>
                </div>
                <div>
                    <button
                        disabled={!actionsEnabled}
                        className="updated-files-action secondary"
                        onClick={() => onUndo(modifiedFiles)}
                    >
                        Undo
                    </button>
                    <button
                        disabled={!actionsEnabled}
                        className="updated-files-action primary"
                        onClick={() => onKeep(modifiedFiles)}
                    >
                        Keep
                    </button>
                </div>
            </div>
            <div className="modified-files-list">
                {modifiedFiles.map((msg, index) => {
                    return (
                        <ModifiedFileItem
                            key={index}
                            msg={msg}
                            onFileClick={(path: string) => openDiff(path, true)}
                            onUndo={(file: ToolReturnParseResult) => onUndo([file])}
                            onKeep={(file: ToolReturnParseResult) => onKeep([file])}
                            actionsEnabled={actionsEnabled}
                            workspacePath={workspacePath}
                            homeDir={homeDir}
                        />
                    );
                })}
            </div>
        </div>
    );
};
