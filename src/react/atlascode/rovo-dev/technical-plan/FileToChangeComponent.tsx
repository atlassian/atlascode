import React from 'react';

import { CheckFileExistsFunc, FileLozenge, MarkedDown, OpenFileFunc } from '../common/common';

interface FileToChangeComponentProps {
    filePath: string;
    openFile: OpenFileFunc;
    checkFileExists: CheckFileExistsFunc;
    descriptionOfChange?: string;
}

export const FileToChangeComponent: React.FC<FileToChangeComponentProps> = ({
    filePath,
    openFile,
    checkFileExists,
    descriptionOfChange,
}) => {
    const fileExists = checkFileExists(filePath);
    return (
        <div className="file-to-change">
            {descriptionOfChange && <MarkedDown value={descriptionOfChange} />}
            <div className="file-to-change-info">
                <div className="lozenge-container">
                    <p>File to {fileExists === false ? 'create' : 'modify'}: </p>
                    <FileLozenge filePath={filePath} openFile={openFile} isDisabled={fileExists === false} />
                </div>
            </div>
        </div>
    );
};
