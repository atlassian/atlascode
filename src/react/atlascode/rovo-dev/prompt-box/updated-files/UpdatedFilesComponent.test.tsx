import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ToolReturnParseResult } from '../../utils';
import { UpdatedFilesComponent } from './UpdatedFilesComponent';

const mockOpenDiff = jest.fn();
const mockOnUndo = jest.fn();
const mockOnKeep = jest.fn();

const mockModifiedFiles: ToolReturnParseResult[] = [
    { filePath: 'src/file1.ts', content: 'content1' },
    { filePath: 'src/file2.ts', content: 'content2' },
    { filePath: 'src/file3.ts', content: 'content3' },
];

describe('UpdatedFilesComponent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders null when no modified files', () => {
        const { container } = render(
            <UpdatedFilesComponent
                modifiedFiles={[]}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders null when modifiedFiles is undefined', () => {
        const { container } = render(
            <UpdatedFilesComponent
                modifiedFiles={undefined as any}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders correct file count in header', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={mockModifiedFiles}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );
        expect(screen.getByText('3 Updated files')).toBeTruthy();
    });

    it('renders singular file text for single file', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={[mockModifiedFiles[0]]}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );
        expect(screen.getByText('1 Updated file')).toBeTruthy();
    });

    it('calls onUndo with all file paths when Undo All is clicked', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={mockModifiedFiles}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );

        fireEvent.click(screen.getByText('Undo'));
        expect(mockOnUndo).toHaveBeenCalledWith(['src/file1.ts', 'src/file2.ts', 'src/file3.ts']);
    });

    it('calls onKeep with all file paths when Keep All is clicked', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={mockModifiedFiles}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );

        fireEvent.click(screen.getByText('Keep'));
        expect(mockOnKeep).toHaveBeenCalledWith(['src/file1.ts', 'src/file2.ts', 'src/file3.ts']);
    });

    it('filters out undefined file paths', () => {
        const filesWithUndefined: ToolReturnParseResult[] = [
            { filePath: 'src/file1.ts', content: 'content1' },
            { filePath: undefined, content: 'content2' },
            { filePath: 'src/file3.ts', content: 'content3' },
        ];

        render(
            <UpdatedFilesComponent
                modifiedFiles={filesWithUndefined}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );

        fireEvent.click(screen.getByText('Keep'));
        expect(mockOnKeep).toHaveBeenCalledWith(['src/file1.ts', 'src/file3.ts']);
    });

    it('renders ModifiedFileItem for each file', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={mockModifiedFiles}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );

        const fileItems = screen.getAllByLabelText('modified-file-item');
        expect(fileItems).toHaveLength(3);
    });

    it('renders with correct CSS classes', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={mockModifiedFiles}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );

        expect(document.querySelector('.updated-files-container')).toBeTruthy();
        expect(document.querySelector('.updated-files-header')).toBeTruthy();
        expect(document.querySelector('.modified-files-list')).toBeTruthy();
    });

    it('renders source control icon', () => {
        render(
            <UpdatedFilesComponent
                modifiedFiles={mockModifiedFiles}
                onUndo={mockOnUndo}
                onKeep={mockOnKeep}
                openDiff={mockOpenDiff}
            />,
        );

        expect(document.querySelector('.codicon.codicon-source-control')).toBeTruthy();
    });
});
