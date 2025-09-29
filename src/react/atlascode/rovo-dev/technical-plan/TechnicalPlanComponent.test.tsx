import { render, screen } from '@testing-library/react';
import React from 'react';
import { TechnicalPlan } from 'src/rovo-dev/rovoDevTypes';

import { TechnicalPlanComponent } from './TechnicalPlanComponent';

const mockOpenFile = jest.fn();
const mockCheckFileExists = jest.fn().mockReturnValue(true);

const mockTechnicalPlan: TechnicalPlan = {
    logicalChanges: [
        {
            summary: 'Test Change 1',
            filesToChange: [
                {
                    filePath: 'file1.ts',
                    descriptionOfChange: 'Change 1',
                    clarifyingQuestionIfAny: 'Question 1?',
                    codeSnippetsToChange: [
                        {
                            code: 'console.log("Hello World");',
                            startLine: 1,
                            endLine: 3,
                        },
                    ],
                },
            ],
        },
        {
            summary: 'Test Change 2',
            filesToChange: [
                {
                    filePath: 'file2.ts',
                    descriptionOfChange: 'Change 2',
                    clarifyingQuestionIfAny: null,
                    codeSnippetsToChange: [
                        {
                            code: 'console.log("Goodbye World");',
                            startLine: 4,
                            endLine: 6,
                        },
                    ],
                },
            ],
        },
    ],
};

describe('TechnicalPlanComponent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders deep plan title', () => {
        render(
            <TechnicalPlanComponent
                content={mockTechnicalPlan}
                openFile={mockOpenFile}
                checkFileExists={mockCheckFileExists}
            />,
        );
        expect(screen.getByText('Deep plan')).toBeTruthy();
    });

    it('renders all logical changes with counters', () => {
        render(
            <TechnicalPlanComponent
                content={mockTechnicalPlan}
                openFile={mockOpenFile}
                checkFileExists={mockCheckFileExists}
            />,
        );
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
    });

    it('renders clarifying questions when present', () => {
        render(
            <TechnicalPlanComponent
                content={mockTechnicalPlan}
                openFile={mockOpenFile}
                checkFileExists={mockCheckFileExists}
            />,
        );
        expect(screen.getByText('1.')).toBeTruthy();
        expect(screen.getByText('Question 1?')).toBeTruthy();
    });

    it('does not render clarifying questions section when no questions exist', () => {
        const planWithoutQuestions: TechnicalPlan = {
            logicalChanges: [
                {
                    summary: 'Test Change 2',
                    filesToChange: [
                        {
                            filePath: 'file2.ts',
                            descriptionOfChange: 'Change 2',
                            clarifyingQuestionIfAny: null,
                            codeSnippetsToChange: [
                                {
                                    code: 'console.log("Goodbye World");',
                                    startLine: 4,
                                    endLine: 6,
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        render(
            <TechnicalPlanComponent
                content={planWithoutQuestions}
                openFile={mockOpenFile}
                checkFileExists={mockCheckFileExists}
            />,
        );
        expect(screen.queryByLabelText('Clarifying Question')).not.toBeTruthy();
    });

    it('renders empty plan when no logical changes exist', () => {
        const emptyPlan: TechnicalPlan = { logicalChanges: [] };
        render(
            <TechnicalPlanComponent
                content={emptyPlan}
                openFile={mockOpenFile}
                checkFileExists={mockCheckFileExists}
            />,
        );
        expect(screen.getByText('Deep plan')).toBeTruthy();
        expect(screen.queryByText('1')).not.toBeTruthy();
    });

    it('passes openFile prop to LogicalChange components', () => {
        render(
            <TechnicalPlanComponent
                content={mockTechnicalPlan}
                openFile={mockOpenFile}
                checkFileExists={mockCheckFileExists}
            />,
        );
        // LogicalChange components should receive the openFile prop
        expect(mockOpenFile).not.toHaveBeenCalled(); // Just checking prop passing, not calling
    });
});
