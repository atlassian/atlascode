import React from 'react';

import { FileLozenge, MarkedDown, OpenFileFunc } from '../common/common';

interface FileToChangeComponentProps {
    filePath: string;
    openFile: OpenFileFunc;
    descriptionOfChange?: string;
}

export const FileToChangeComponent: React.FC<FileToChangeComponentProps> = ({
    filePath,
    openFile,
    descriptionOfChange,
}) => {
    return (
        <div className="file-to-change">
            {descriptionOfChange && <MarkedDown value={descriptionOfChange} />}
            <div className="file-to-change-info">
                <div className="lozenge-container">
                    <p>File to modify: </p>
                    <FileLozenge filePath={filePath} openFile={openFile} />
                </div>
            </div>
        </div>
    );
};
