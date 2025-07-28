import CheckIcon from '@atlaskit/icon/glyph/check';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import React from 'react';

import { ToolReturnParseResult } from '../../utils';

export const ModifiedFileItem: React.FC<{
    msg: ToolReturnParseResult;
    onUndo: (filePath: string) => void;
    onKeep: (filePath: string) => void;
    onFileClick: (filePath: string) => void;
}> = ({ msg, onUndo, onKeep, onFileClick }) => {
    const isDeletion = msg.type === 'delete';
    const isCreation = msg.type === 'create';

    const getId = () => {
        if (isDeletion) {
            return 'deleted-file';
        }
        if (isCreation) {
            return 'created-file';
        }
        return undefined;
    };

    const filePath = msg.filePath;
    if (!filePath) {
        return null;
    }
    const handleUndo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUndo(filePath);
    };

    const handleKeep = (e: React.MouseEvent) => {
        e.stopPropagation();
        onKeep(filePath);
    };

    return (
        <div aria-label="modified-file-item" className="modified-file-item" onClick={() => onFileClick(filePath)}>
            <div id={getId()}>{filePath}</div>
            <div className="modified-file-actions">
                <button className="modified-file-action" onClick={handleUndo} aria-label="Undo changes to this file">
                    <CrossIcon size="small" label="Undo" />
                </button>
                <button className="modified-file-action" onClick={handleKeep} aria-label="Keep changes to this file">
                    <CheckIcon size="small" label="Keep" />
                </button>
            </div>
        </div>
    );
};
