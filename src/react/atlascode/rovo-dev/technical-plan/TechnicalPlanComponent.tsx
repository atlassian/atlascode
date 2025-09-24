import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';
import React from 'react';
import { TechnicalPlan } from 'src/rovo-dev/rovoDevTypes';

import { CheckFileExistsFunc, MarkedDown, OpenFileFunc } from '../common/common';
import { LogicalChange } from './LogicalChange';

interface TechnicalPlanProps {
    content: TechnicalPlan;
    openFile: OpenFileFunc;
    checkFileExists: CheckFileExistsFunc;
    onMount?: () => void;
}

export const TechnicalPlanComponent: React.FC<TechnicalPlanProps> = ({ content, openFile, checkFileExists }) => {
    const clarifyingQuestions = content.logicalChanges.flatMap((change) => {
        return change.filesToChange
            .map((file) => {
                if (file.clarifyingQuestionIfAny) {
                    return file.clarifyingQuestionIfAny;
                }
                return null;
            })
            .filter((q) => q !== null);
    });

    return (
        <div>
            <div className="chat-message agent-message">
                <div className="technical-plan-container">
                    <span style={{ fontSize: '14px' }}>Deep plan</span>
                    {content.logicalChanges.map((change, index) => {
                        return (
                            <div className="logical-change-wrapper" key={index}>
                                <div className="logical-change-counter">
                                    <p>{index + 1}</p>
                                </div>
                                <LogicalChange
                                    key={index}
                                    change={change}
                                    openFile={openFile}
                                    checkFileExists={checkFileExists}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            {clarifyingQuestions &&
                clarifyingQuestions.length > 0 &&
                clarifyingQuestions.map((question, idx) => {
                    return (
                        <div
                            key={idx}
                            className="chat-message agent-message"
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '8px',
                            }}
                        >
                            <QuestionCircleIcon
                                primaryColor="var(--vscode-charts-green)"
                                secondaryColor="var(--vscode-editor-background)"
                                size="small"
                                label="Clarifying Question"
                            />
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                                <div>{idx + 1}. </div>
                                <MarkedDown value={question} />
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};
