import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ToolReturnParseResult } from '../utils';
import { ToolReturnParsedItem } from './ToolReturnItem';

describe('ToolReturnParsedItem', () => {
    const mockOpenFile = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders content correctly', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'modify',
            filePath: '/path/to/file.ts',
        };

        const { getByText } = render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} />);

        expect(getByText('Test content')).toBeTruthy();
    });

    test('renders title when provided', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            title: 'Test Title',
            type: 'create',
            filePath: '/path/to/file.ts',
        };

        const { getByText } = render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} />);

        expect(getByText('Test Title')).toBeTruthy();
    });

    test('calls openFile when clicked with filePath', () => {
        const filePath = '/path/to/file.ts';
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'open',
            filePath,
        };

        const { getByText } = render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} />);

        fireEvent.click(getByText('Test content'));
        expect(mockOpenFile).toHaveBeenCalledWith(filePath);
    });

    test('does not call openFile when clicked without filePath', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'delete',
        };

        const { getByText } = render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} />);

        fireEvent.click(getByText('Test content'));
        expect(mockOpenFile).not.toHaveBeenCalled();
    });

    test('renders icon for modify type', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'modify',
            filePath: '/path/to/file.ts',
        };

        const { container } = render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} />);

        // Check if the CodeIcon is rendered
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    test('does not render icon when type is not specified', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            filePath: '/path/to/file.ts',
        };

        const { container } = render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} />);

        // No icon should be rendered
        expect(container.querySelector('svg')).toBeNull();
    });
});
