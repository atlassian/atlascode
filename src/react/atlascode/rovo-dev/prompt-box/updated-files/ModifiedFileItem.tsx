import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import UndoIcon from '@atlaskit/icon/core/undo';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

import { ToolReturnParseResult } from '../../utils';

export const ModifiedFileItem: React.FC<{
    msg: ToolReturnParseResult;
    onUndo: (file: ToolReturnParseResult) => void;
    onKeep: (file: ToolReturnParseResult) => void;
    onFileClick: (filePath: string) => void;
    actionsEnabled?: boolean;
}> = ({ msg, onUndo, onKeep, onFileClick, actionsEnabled = true }) => {
    const getClassName = (msg: ToolReturnParseResult) => {
        switch (msg.type) {
            case 'delete':
                return 'deleted-file';
            case 'create':
                return 'created-file';
            default:
                return undefined;
        }
    };

    const filePath = msg.filePath;
    if (!filePath) {
        return null;
    }

    const handleUndo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUndo(msg);
    };

    const handleKeep = (e: React.MouseEvent) => {
        e.stopPropagation();
        onKeep(msg);
    };

    return (
        <div aria-label="modified-file-item" className="modified-file-item" onClick={() => onFileClick(filePath)}>
            <div className={getClassName(msg)}>{filePath}</div>
            <div className="modified-file-actions">
                <button
                    disabled={!actionsEnabled}
                    className="modified-file-action"
                    onClick={handleUndo}
                    aria-label="Undo changes to this file"
                >
                    <Tooltip content="Undo" position="top">
                        <UndoIcon size="small" label="Undo" />
                    </Tooltip>
                </button>
                <button
                    disabled={!actionsEnabled}
                    className="modified-file-action"
                    onClick={handleKeep}
                    aria-label="Keep changes to this file"
                >
                    <Tooltip content="Keep" position="top">
                        <CheckMarkIcon size="small" label="Keep" />
                    </Tooltip>
                </button>
            </div>
        </div>
    );
};
