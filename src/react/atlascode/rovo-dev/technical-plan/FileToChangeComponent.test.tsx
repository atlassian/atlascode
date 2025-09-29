import { render, screen } from '@testing-library/react';
import React from 'react';

import { FileToChangeComponent } from './FileToChangeComponent';

// Mock the common module
jest.mock('../common/common', () => ({
    FileLozenge: ({ filePath, openFile }: { filePath: string; openFile: () => void }) => (
        <button onClick={openFile} data-testid="file-lozenge">
            {filePath}
        </button>
    ),
    MarkedDown: ({ value }: { value: string }) => <span>{value}</span>,
}));

describe('FileToChangeComponent', () => {
    const mockOpenFile = jest.fn();
    const mockCheckFileExists = jest.fn().mockReturnValue(true);
    const defaultProps = {
        filePath: 'src/components/Example.tsx',
        openFile: mockOpenFile,
        checkFileExists: mockCheckFileExists,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders file path and FileLozenge', () => {
        render(<FileToChangeComponent {...defaultProps} />);

        expect(screen.getByText('File to modify:')).toBeTruthy();
        expect(screen.getByTestId('file-lozenge')).toBeTruthy();
        expect(screen.getByText('src/components/Example.tsx')).toBeTruthy();
    });

    it('renders description when provided', () => {
        const description = 'Add new feature to this component';
        render(<FileToChangeComponent {...defaultProps} descriptionOfChange={description} />);

        expect(screen.getByText(description)).toBeTruthy();
    });

    it('does not render description when not provided', () => {
        render(<FileToChangeComponent {...defaultProps} />);

        expect(screen.queryByText(/Add new feature/)).not.toBeTruthy();
    });

    it('calls openFile when FileLozenge is clicked', () => {
        render(<FileToChangeComponent {...defaultProps} />);

        const fileLozenge = screen.getByTestId('file-lozenge');
        fileLozenge.click();

        expect(mockOpenFile).toHaveBeenCalledTimes(1);
    });

    it('has correct CSS classes', () => {
        const { container } = render(<FileToChangeComponent {...defaultProps} />);

        expect(container.querySelector('.file-to-change')).toBeTruthy();
        expect(container.querySelector('.file-to-change-info')).toBeTruthy();
        expect(container.querySelector('.lozenge-container')).toBeTruthy();
    });
});
