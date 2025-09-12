import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { renderWithStore } from 'src/react/store/test-utils';

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
        const { container } = renderWithStore(
            <UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />,
            { preloadedState: { chatStream: { totalModifiedFiles: [] } } },
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders null when modifiedFiles is undefined', () => {
        const { container } = renderWithStore(
            <UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />,
            { preloadedState: { chatStream: { totalModifiedFiles: undefined } } },
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders correct file count in header', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: mockModifiedFiles } },
        });
        expect(screen.getByText('3 Updated files')).toBeTruthy();
    });

    it('renders singular file text for single file', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: [mockModifiedFiles[0]] } },
        });
        expect(screen.getByText('1 Updated file')).toBeTruthy();
    });

    it('calls onUndo with all file paths when Undo All is clicked', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: mockModifiedFiles } },
        });

        fireEvent.click(screen.getByText('Undo'));
        expect(mockOnUndo).toHaveBeenCalledWith(mockModifiedFiles);
    });

    it('calls onKeep with all file paths when Keep All is clicked', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: mockModifiedFiles } },
        });

        fireEvent.click(screen.getByText('Keep'));
        expect(mockOnKeep).toHaveBeenCalledWith(mockModifiedFiles);
    });

    it('renders ModifiedFileItem for each file', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: mockModifiedFiles } },
        });

        const fileItems = screen.getAllByLabelText('modified-file-item');
        expect(fileItems).toHaveLength(3);
    });

    it('renders with correct CSS classes', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: mockModifiedFiles } },
        });

        expect(document.querySelector('.updated-files-container')).toBeTruthy();
        expect(document.querySelector('.updated-files-header')).toBeTruthy();
        expect(document.querySelector('.modified-files-list')).toBeTruthy();
    });

    it('renders source control icon', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: { chatStream: { totalModifiedFiles: mockModifiedFiles } },
        });

        expect(document.querySelector('.codicon.codicon-source-control')).toBeTruthy();
    });

    it('disables buttons when actionsEnabled is false', () => {
        renderWithStore(<UpdatedFilesComponent onUndo={mockOnUndo} onKeep={mockOnKeep} openDiff={mockOpenDiff} />, {
            preloadedState: {
                chatStream: { totalModifiedFiles: mockModifiedFiles },
                rovoDevStates: { currentState: { state: 'GeneratingResponse' } },
            },
        });

        expect(screen.getByText('Undo').closest('button')?.disabled).toBe(true);
        expect(screen.getByText('Keep').closest('button')?.disabled).toBe(true);

        fireEvent.click(screen.getByText('Undo'));
        expect(mockOnUndo).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('Keep'));
        expect(mockOnKeep).not.toHaveBeenCalled();
    });
});
