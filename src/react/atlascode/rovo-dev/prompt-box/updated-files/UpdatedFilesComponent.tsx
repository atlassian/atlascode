import React from 'react';

import { OpenFileFunc } from '../../common/common';
import { ToolReturnParseResult } from '../../utils';
import { ModifiedFileItem } from './ModifiedFileItem';

export const UpdatedFilesComponent: React.FC<{
    modifiedFiles: ToolReturnParseResult[];
    onUndo: (files: ToolReturnParseResult[]) => void;
    onKeep: (files: ToolReturnParseResult[]) => void;
    openDiff: OpenFileFunc;
}> = ({ modifiedFiles, onUndo, onKeep, openDiff }) => {
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
                    <button className="updated-files-action secondary" onClick={() => onUndo(modifiedFiles)}>
                        Undo
                    </button>
                    <button className="updated-files-action primary" onClick={() => onKeep(modifiedFiles)}>
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
                        />
                    );
                })}
            </div>
        </div>
    );
};
