import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import React from 'react';
import { TechnicalPlanFileToChange, TechnicalPlanLogicalChange } from 'src/rovo-dev/rovoDevTypes';

import { CheckFileExistsFunc, OpenFileFunc } from '../common/common';
import { FileToChangeComponent } from './FileToChangeComponent';

interface LogicalChangeProps {
    change: TechnicalPlanLogicalChange;
    openFile: OpenFileFunc;
    checkFileExists: CheckFileExistsFunc;
}

export const LogicalChange: React.FC<LogicalChangeProps> = (props) => {
    const { change, openFile, checkFileExists } = props;

    const [isOpen, setIsOpen] = React.useState(false);

    const changeSummary = change.summary;

    const renderFilesToChange = (files: TechnicalPlanFileToChange[]) => {
        if (files.length === 0) {
            return null;
        }
        if (files.length === 1) {
            return (
                <FileToChangeComponent
                    filePath={files[0].filePath}
                    openFile={openFile}
                    checkFileExists={checkFileExists}
                    descriptionOfChange={files[0].descriptionOfChange}
                />
            );
        }

        return (
            <ol className="file-to-change-container">
                {files.map((file, index) => {
                    return (
                        <li>
                            <FileToChangeComponent
                                key={index}
                                filePath={file.filePath}
                                openFile={openFile}
                                checkFileExists={checkFileExists}
                                descriptionOfChange={file.descriptionOfChange}
                            />
                        </li>
                    );
                })}
            </ol>
        );
    };

    return (
        <div className="logical-change-container">
            <div className="logical-change-header">
                <div className="title">{changeSummary}</div>
                <button className="chevron-button" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? (
                        <ChevronDownIcon
                            primaryColor="var(--vscode-editor-foreground)"
                            size="medium"
                            label="Collapse"
                        />
                    ) : (
                        <ChevronRightIcon primaryColor="var(--vscode-editor-foreground)" size="medium" label="Expand" />
                    )}
                </button>
            </div>
            {isOpen && renderFilesToChange(change.filesToChange)}
        </div>
    );
};
