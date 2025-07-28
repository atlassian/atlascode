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

    it('renders file path and action buttons', () => {
        const msg = createMockMsg('modify', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        expect(screen.getByText('/path/to/file.ts')).toBeTruthy();
        expect(screen.getByLabelText('Undo changes to this file')).toBeTruthy();
        expect(screen.getByLabelText('Keep changes to this file')).toBeTruthy();
    });

    it('calls onFileClick when file item is clicked', () => {
        const msg = createMockMsg('modify', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        fireEvent.click(screen.getByText('/path/to/file.ts'));
        expect(mockOnFileClick).toHaveBeenCalledWith('/path/to/file.ts');
    });

    it('calls onUndo when undo button is clicked', () => {
        const msg = createMockMsg('modify', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        fireEvent.click(screen.getByLabelText('Undo changes to this file'));
        expect(mockOnUndo).toHaveBeenCalledWith('/path/to/file.ts');
        expect(mockOnFileClick).not.toHaveBeenCalled();
    });

    it('calls onKeep when keep button is clicked', () => {
        const msg = createMockMsg('modify', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        fireEvent.click(screen.getByLabelText('Keep changes to this file'));
        expect(mockOnKeep).toHaveBeenCalledWith('/path/to/file.ts');
        expect(mockOnFileClick).not.toHaveBeenCalled();
    });

    it('renders with deleted-file id for deletion type', () => {
        const msg = createMockMsg('delete', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        expect(screen.getByText('/path/to/file.ts').id).toBe('deleted-file');
    });

    it('renders with created-file id for creation type', () => {
        const msg = createMockMsg('create', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        expect(screen.getByText('/path/to/file.ts').id).toBe('created-file');
    });

    it('renders without id for modify type', () => {
        const msg = createMockMsg('modify', '/path/to/file.ts');
        render(<ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />);

        expect(screen.getByText('/path/to/file.ts').id).toBe('');
    });

    it('returns null when filePath is not provided', () => {
        const msg = createMockMsg('modify', '');
        const { container } = render(
            <ModifiedFileItem msg={msg} onUndo={mockOnUndo} onKeep={mockOnKeep} onFileClick={mockOnFileClick} />,
        );

        expect(container.firstChild).toBeNull();
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
