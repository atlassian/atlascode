import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ToolReturnParseResult } from '../utils';
import { ToolReturnParsedItem } from './ToolReturnItem';

describe('ToolReturnParsedItem', () => {
    const mockOpenFile = jest.fn();
    const mockOnLinkClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders content correctly', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'modify',
            filePath: '/path/to/file.ts',
        };

        const { getByText } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        expect(getByText('Test content')).toBeTruthy();
    });

    test('renders title when provided', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            title: 'Test Title',
            type: 'create',
            filePath: '/path/to/file.ts',
        };

        const { getByText } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        expect(getByText('Test Title')).toBeTruthy();
    });

    test('calls openFile when clicked with filePath', () => {
        const filePath = '/path/to/file.ts';
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'open',
            filePath,
        };

        const { getByText } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        fireEvent.click(getByText('Test content'));
        expect(mockOpenFile).toHaveBeenCalledWith(filePath);
    });

    test('does not call openFile when clicked without filePath', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'delete',
        };

        const { getByText } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        fireEvent.click(getByText('Test content'));
        expect(mockOpenFile).not.toHaveBeenCalled();
    });

    test('renders icon for modify type', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            type: 'modify',
            filePath: '/path/to/file.ts',
        };

        const { container } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        // Check if the CodeIcon is rendered
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    test('does not render icon when type is not specified', () => {
        const msg: ToolReturnParseResult = {
            content: 'Test content',
            filePath: '/path/to/file.ts',
        };

        const { container } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        // No icon should be rendered
        expect(container.querySelector('svg')).toBeNull();
    });

    test('handles null content without crashing', () => {
        const msg: ToolReturnParseResult = {
            content: null as any,
            type: 'modify',
            filePath: '/path/to/file.ts',
        };

        expect(() => {
            render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />);
        }).not.toThrow();
    });

    test('handles undefined content without crashing', () => {
        const msg: ToolReturnParseResult = {
            content: undefined as any,
            type: 'open',
            filePath: '/path/to/file.ts',
        };

        expect(() => {
            render(<ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />);
        }).not.toThrow();
    });

    test('renders collapsed view with content and title', () => {
        const msg: ToolReturnParseResult = {
            content: 'Replaced code',
            title: 'myFile.ts',
            type: 'modify',
            filePath: '/path/to/myFile.ts',
        };

        const { getByText, container } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} collapsed={true} />,
        );

        expect(container.querySelector('.tool-return-collapsed')).toBeTruthy();
        expect(getByText('Replaced code — myFile.ts')).toBeTruthy();
    });

    test('renders collapsed view with content only (no title)', () => {
        const msg: ToolReturnParseResult = {
            content: 'Searched files',
            type: 'open',
        };

        const { getByText, container } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} collapsed={true} />,
        );

        expect(container.querySelector('.tool-return-collapsed')).toBeTruthy();
        expect(getByText('Searched files')).toBeTruthy();
    });

    test('collapsed view calls openFile when clicked with filePath', () => {
        const filePath = '/path/to/file.ts';
        const msg: ToolReturnParseResult = {
            content: 'Opened file',
            type: 'open',
            filePath,
        };

        const { getByText } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} collapsed={true} />,
        );

        fireEvent.click(getByText('Opened file'));
        expect(mockOpenFile).toHaveBeenCalledWith(filePath);
    });

    test('renders expanded view by default (collapsed=false)', () => {
        const msg: ToolReturnParseResult = {
            content: 'Replaced code',
            title: 'myFile.ts',
            type: 'modify',
            filePath: '/path/to/myFile.ts',
        };

        const { container } = render(
            <ToolReturnParsedItem msg={msg} openFile={mockOpenFile} onLinkClick={mockOnLinkClick} />,
        );

        expect(container.querySelector('.tool-return-collapsed')).toBeNull();
    });
});
