import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ToolReturnParseResult } from '../../utils';
import { ModifiedFileItem } from './ModifiedFileItem';

describe('ModifiedFileItem', () => {
    const mockOnUndo = jest.fn();
    const mockOnKeep = jest.fn();
    const mockOnFileClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockMsg = (type: string, filePath: string): ToolReturnParseResult =>
        ({
            type,
            filePath,
        }) as ToolReturnParseResult;

    it('renders file name, path and action buttons', () => {
        const msg = createMockMsg('modify', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        expect(screen.getByText('file.ts')).toBeTruthy();
        expect(screen.getByText('path/to')).toBeTruthy();
        expect(screen.getByLabelText('Undo changes to this file')).toBeTruthy();
        expect(screen.getByLabelText('Keep changes to this file')).toBeTruthy();
    });

    it('calls onFileClick when file item is clicked', () => {
        const msg = createMockMsg('modify', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        fireEvent.click(screen.getByLabelText('modified-file-item'));
        expect(mockOnFileClick).toHaveBeenCalledWith('path/to/file.ts');
    });

    it('calls onUndo when undo button is clicked', () => {
        const msg = createMockMsg('modify', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        fireEvent.click(screen.getByLabelText('Undo changes to this file'));
        expect(mockOnUndo).toHaveBeenCalledWith(msg);
        expect(mockOnFileClick).not.toHaveBeenCalled();
    });

    it('calls onKeep when keep button is clicked', () => {
        const msg = createMockMsg('modify', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        fireEvent.click(screen.getByLabelText('Keep changes to this file'));
        expect(mockOnKeep).toHaveBeenCalledWith(msg);
        expect(mockOnFileClick).not.toHaveBeenCalled();
    });

    it('renders with deleted-file class for deletion type', () => {
        const msg = createMockMsg('delete', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        const container = screen.getByLabelText('modified-file-item').firstElementChild;
        expect(container?.className).toContain('deleted-file');
    });

    it('renders with created-file class for creation type', () => {
        const msg = createMockMsg('create', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        const container = screen.getByLabelText('modified-file-item').firstElementChild;
        expect(container?.className).toContain('created-file');
    });

    it('renders without class for modify type', () => {
        const msg = createMockMsg('modify', 'path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        const container = screen.getByLabelText('modified-file-item').firstElementChild;
        expect(container?.className).not.toContain('deleted-file');
        expect(container?.className).not.toContain('created-file');
    });

    it('returns null when filePath is not provided', () => {
        const msg = createMockMsg('modify', '');
        const { container } = render(
            <ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders correctly for root level files', () => {
        const msg = createMockMsg('modify', 'package.json');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        const fileNameElement = screen.getByText('package.json', { selector: '.file-name' });
        expect(fileNameElement).toBeTruthy();

        const pathElement = document.querySelector('.file-path');
        // root level files have empty path (directory part)
        expect(pathElement?.textContent).toBe('');
    });

    it('prevents event propagation on button clicks', () => {
        const msg = createMockMsg('modify', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        const undoButton = screen.getByLabelText('Undo changes to this file');
        const keepButton = screen.getByLabelText('Keep changes to this file');

        fireEvent.click(undoButton);
        fireEvent.click(keepButton);

        expect(mockOnFileClick).not.toHaveBeenCalled();
    });
});
