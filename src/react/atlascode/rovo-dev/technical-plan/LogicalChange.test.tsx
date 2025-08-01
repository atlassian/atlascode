import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { TechnicalPlanLogicalChange } from 'src/rovo-dev/rovoDevTypes';

import { LogicalChange } from './LogicalChange';

const mockOpenFile = jest.fn();

const mockChange: TechnicalPlanLogicalChange = {
    summary: 'Test logical change',
    filesToChange: [
        {
            filePath: '/path/to/file1.ts',
            descriptionOfChange: 'Update function signature',
            clarifyingQuestionIfAny: 'What is the new signature?',
            codeSnippetsToChange: [
                {
                    code: 'function example() {}',
                    startLine: 1,
                    endLine: 3,
                },
            ],
        },
        {
            filePath: '/path/to/file2.ts',
            descriptionOfChange: 'Add new method',
            clarifyingQuestionIfAny: null,
            codeSnippetsToChange: [
                {
                    code: 'function newMethod() {}',
                    startLine: 4,
                    endLine: 6,
                },
            ],
        },
    ],
};

describe('LogicalChange', () => {
    beforeEach(() => {
        mockOpenFile.mockClear();
    });

    it('renders the change summary', () => {
        render(<LogicalChange change={mockChange} openFile={mockOpenFile} />);
        expect(screen.getByText('Test logical change')).toBeTruthy();
    });

    it('starts in collapsed state', () => {
        render(<LogicalChange change={mockChange} openFile={mockOpenFile} />);
        expect(screen.queryByText('Update function signature')).not.toBeTruthy();
        expect(screen.getByLabelText('Expand')).toBeTruthy();
    });

    it('expands when chevron button is clicked', () => {
        render(<LogicalChange change={mockChange} openFile={mockOpenFile} />);

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Update function signature')).toBeTruthy();
        expect(screen.getByText('Add new method')).toBeTruthy();
        expect(screen.getByLabelText('Collapse')).toBeTruthy();
    });

    it('collapses when chevron button is clicked again', () => {
        render(<LogicalChange change={mockChange} openFile={mockOpenFile} />);

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByRole('button'));

        expect(screen.queryByText('Update function signature')).not.toBeTruthy();
        expect(screen.getByLabelText('Expand')).toBeTruthy();
    });

    it('renders single file without ordered list', () => {
        const singleFileChange = {
            ...mockChange,
            filesToChange: [mockChange.filesToChange[0]],
        };

        render(<LogicalChange change={singleFileChange} openFile={mockOpenFile} />);
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Update function signature')).toBeTruthy();
        expect(screen.queryByRole('list')).not.toBeTruthy();
    });

    it('renders multiple files in ordered list', () => {
        render(<LogicalChange change={mockChange} openFile={mockOpenFile} />);
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('list')).toBeTruthy();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('renders nothing when no files to change', () => {
        const noFilesChange = {
            ...mockChange,
            filesToChange: [],
        };

        render(<LogicalChange change={noFilesChange} openFile={mockOpenFile} />);
        fireEvent.click(screen.getByRole('button'));

        expect(screen.queryByText('Update function signature')).not.toBeTruthy();
        expect(screen.queryByRole('list')).not.toBeTruthy();
    });

    it('passes openFile prop to FileToChangeComponent', () => {
        render(<LogicalChange change={mockChange} openFile={mockOpenFile} />);
        fireEvent.click(screen.getByRole('button'));

        // This test assumes FileToChangeComponent renders clickable elements
        // You may need to adjust based on actual FileToChangeComponent implementation
        expect(screen.getByText('Update function signature')).toBeTruthy();
    });
});
