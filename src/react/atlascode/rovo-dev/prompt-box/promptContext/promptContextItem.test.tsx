import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AddContextButton, PromptContextItem } from './promptContextItem';

describe('PromptContextItem', () => {
    const mockOpenFile = jest.fn();
    const mockOnToggle = jest.fn();
    const mockOnRemove = jest.fn();

    const defaultProps = {
        file: {
            name: 'test-file.tsx',
            absolutePath: '/path/to/test-file.tsx',
            relativePath: 'test-file.tsx',
        },
        enabled: true,
        isFocus: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders file name and icon correctly', () => {
        render(<PromptContextItem {...defaultProps} />);

        expect(screen.getByText('test-file.tsx')).toBeTruthy();
        expect(screen.getByTitle('/path/to/test-file.tsx')).toBeTruthy();
    });

    it('shows line information when selection is provided', () => {
        const propsWithSelection = {
            ...defaultProps,
            selection: {
                start: 5,
                end: 10,
            },
        };

        render(<PromptContextItem {...propsWithSelection} />);

        expect(screen.getByText('test-file.tsx')).toBeTruthy();
        expect(screen.getByText(':6-11')).toBeTruthy(); // 1-based, inclusive
    });

    it('shows single line when start and end are the same', () => {
        const propsWithSingleLine = {
            ...defaultProps,
            selection: {
                start: 5,
                end: 5,
            },
        };

        render(<PromptContextItem {...propsWithSingleLine} />);

        expect(screen.getByText(':6')).toBeTruthy(); // 1-based
    });

    it('calls openFile with selection when both openFile and selection are provided', () => {
        const propsWithSelection = {
            ...defaultProps,
            selection: {
                start: 5,
                end: 10,
            },
            openFile: mockOpenFile,
        };

        render(<PromptContextItem {...propsWithSelection} />);

        const fileElement = screen.getByText('test-file.tsx');
        fireEvent.click(fileElement);

        expect(mockOpenFile).toHaveBeenCalledWith('/path/to/test-file.tsx', false, [6, 11]);
    });

    it('calls openFile without selection when only openFile is provided', () => {
        const propsWithoutSelection = {
            ...defaultProps,
            openFile: mockOpenFile,
        };

        render(<PromptContextItem {...propsWithoutSelection} />);

        const fileElement = screen.getByText('test-file.tsx');
        fireEvent.click(fileElement);

        expect(mockOpenFile).toHaveBeenCalledWith('/path/to/test-file.tsx');
    });

    it('does not call openFile when openFile is not provided', () => {
        render(<PromptContextItem {...defaultProps} />);

        const fileElement = screen.getByText('test-file.tsx');
        fireEvent.click(fileElement);

        expect(mockOpenFile).not.toHaveBeenCalled();
    });

    it('shows pointer cursor when openFile is provided', () => {
        const propsWithOpenFile = {
            ...defaultProps,
            openFile: mockOpenFile,
        };

        render(<PromptContextItem {...propsWithOpenFile} />);

        const fileElement = screen.getByText('test-file.tsx');
        expect(fileElement.style.cursor).toBe('pointer');
    });

    it('shows default cursor when openFile is not provided', () => {
        render(<PromptContextItem {...defaultProps} />);

        const fileElement = screen.getByText('test-file.tsx');
        expect(fileElement.style.cursor).toBe('default');
    });

    it('renders toggle button when onToggle is provided', () => {
        const propsWithToggle = {
            ...defaultProps,
            onToggle: mockOnToggle,
        };

        render(<PromptContextItem {...propsWithToggle} />);

        const toggleButton = screen.getByTitle('Disable context');
        expect(toggleButton).toBeTruthy();
    });

    it('calls onToggle when toggle button is clicked', () => {
        const propsWithToggle = {
            ...defaultProps,
            onToggle: mockOnToggle,
        };

        render(<PromptContextItem {...propsWithToggle} />);

        const toggleButton = screen.getByTitle('Disable context');
        fireEvent.click(toggleButton);

        expect(mockOnToggle).toHaveBeenCalledWith(false);
    });

    it('shows correct toggle button icon when enabled', () => {
        const propsWithToggle = {
            ...defaultProps,
            enabled: true,
            onToggle: mockOnToggle,
        };

        render(<PromptContextItem {...propsWithToggle} />);

        expect(screen.getByTitle('Disable context')).toBeTruthy();
    });

    it('shows correct toggle button icon when disabled', () => {
        const propsWithToggle = {
            ...defaultProps,
            enabled: false,
            onToggle: mockOnToggle,
        };

        render(<PromptContextItem {...propsWithToggle} />);

        expect(screen.getByTitle('Enable context')).toBeTruthy();
    });

    it('renders remove button when onRemove is provided', () => {
        const propsWithRemove = {
            ...defaultProps,
            onRemove: mockOnRemove,
        };

        render(<PromptContextItem {...propsWithRemove} />);

        const removeButton = screen.getByTitle('Remove context');
        expect(removeButton).toBeTruthy();
    });

    it('calls onRemove when remove button is clicked', () => {
        const propsWithRemove = {
            ...defaultProps,
            onRemove: mockOnRemove,
        };

        render(<PromptContextItem {...propsWithRemove} />);

        const removeButton = screen.getByTitle('Remove context');
        fireEvent.click(removeButton);

        expect(mockOnRemove).toHaveBeenCalled();
    });

    it('renders all buttons when all handlers are provided', () => {
        const propsWithAllHandlers = {
            ...defaultProps,
            onToggle: mockOnToggle,
            onRemove: mockOnRemove,
            openFile: mockOpenFile,
        };

        render(<PromptContextItem {...propsWithAllHandlers} />);

        expect(screen.getByTitle('Disable context')).toBeTruthy();
        expect(screen.getByTitle('Remove context')).toBeTruthy();
        expect(screen.getByText('test-file.tsx')).toBeTruthy();
    });

    it('handles click events without throwing errors', () => {
        const propsWithAllHandlers = {
            ...defaultProps,
            onToggle: mockOnToggle,
            onRemove: mockOnRemove,
            openFile: mockOpenFile,
            selection: {
                start: 0,
                end: 5,
            },
        };

        render(<PromptContextItem {...propsWithAllHandlers} />);

        const fileElement = screen.getByText('test-file.tsx');
        fireEvent.click(fileElement);

        const toggleButton = screen.getByTitle('Disable context');
        fireEvent.click(toggleButton);

        const removeButton = screen.getByTitle('Remove context');
        fireEvent.click(removeButton);

        expect(mockOpenFile).toHaveBeenCalled();
        expect(mockOnToggle).toHaveBeenCalled();
        expect(mockOnRemove).toHaveBeenCalled();
    });

    it('handles edge case with zero-based line numbers correctly', () => {
        const propsWithZeroBased = {
            ...defaultProps,
            selection: {
                start: 0,
                end: 0,
            },
            openFile: mockOpenFile,
        };

        render(<PromptContextItem {...propsWithZeroBased} />);

        const fileElement = screen.getByText('test-file.tsx');
        fireEvent.click(fileElement);

        expect(mockOpenFile).toHaveBeenCalledWith('/path/to/test-file.tsx', false, [1, 1]);
    });

    it('handles large line numbers correctly', () => {
        const propsWithLargeNumbers = {
            ...defaultProps,
            selection: {
                start: 999,
                end: 1000,
            },
            openFile: mockOpenFile,
        };

        render(<PromptContextItem {...propsWithLargeNumbers} />);

        const fileElement = screen.getByText('test-file.tsx');
        fireEvent.click(fileElement);

        expect(mockOpenFile).toHaveBeenCalledWith('/path/to/test-file.tsx', false, [1000, 1001]);
    });
});

describe('AddContextButton', () => {
    const mockOnClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders add button correctly', () => {
        render(<AddContextButton onClick={mockOnClick} />);

        const addButton = screen.getByTitle('Add context');
        expect(addButton).toBeTruthy();
    });

    it('calls onClick when clicked', () => {
        render(<AddContextButton onClick={mockOnClick} />);

        const addButton = screen.getByTitle('Add context');
        fireEvent.click(addButton);

        expect(mockOnClick).toHaveBeenCalled();
    });

    it('renders without onClick handler', () => {
        render(<AddContextButton />);

        const addButton = screen.getByTitle('Add context');
        expect(addButton).toBeTruthy();
    });

    it('handles click without onClick handler gracefully', () => {
        render(<AddContextButton />);

        const addButton = screen.getByTitle('Add context');

        expect(() => fireEvent.click(addButton)).not.toThrow();
    });
});
