import React from 'react';

import { FileLozenge, mdParser, OpenFileFunc } from '../common/common';

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
    const renderDescription = (description: string) => {
        return <span dangerouslySetInnerHTML={{ __html: mdParser.render(description) }} />;
    };
    return (
        <div className="file-to-change">
            {descriptionOfChange && renderDescription(descriptionOfChange)}
            <div className="file-to-change-info">
                <div className="lozenge-container">
                    <p>File to modify: </p>
                    <FileLozenge filePath={filePath} openFile={openFile} />
                </div>
            </div>
        </div>
    );
};
