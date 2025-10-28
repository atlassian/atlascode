import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { disableConsole } from 'testsutil';

import { AttachmentForm } from './AttachmentForm';

describe('AttachmentForm - persisting files when reopening advanced options', () => {
    const mockOnFilesChanged = jest.fn();

    // Helper to create serialized file (as saved in state)
    const createSerializedFile = (name: string, type: string) => {
        const content = btoa('test content');
        return {
            name,
            size: 12,
            type,
            lastModified: Date.now(),
            fileContent: content,
            path: `/path/to/${name}`,
        };
    };

    beforeAll(() => {
        disableConsole('warn', 'error');
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('restores a single file from saved state', () => {
        const savedFiles = [createSerializedFile('document.pdf', 'application/pdf')];

        const { container } = render(
            <AttachmentForm onFilesChanged={mockOnFilesChanged} isInline={true} initialFiles={savedFiles} />,
        );

        expect(container.textContent).toContain('document.pdf');
    });

    it('restores multiple files from saved state', () => {
        const savedFiles = [
            createSerializedFile('file1.txt', 'text/plain'),
            createSerializedFile('file2.pdf', 'application/pdf'),
            createSerializedFile('image.png', 'image/png'),
        ];

        const { container } = render(
            <AttachmentForm onFilesChanged={mockOnFilesChanged} isInline={true} initialFiles={savedFiles} />,
        );

        expect(container.textContent).toContain('file1.txt');
        expect(container.textContent).toContain('file2.pdf');
        expect(container.textContent).toContain('image.png');
    });

    it('calls onFilesChanged with restored files', async () => {
        const savedFiles = [createSerializedFile('test.txt', 'text/plain')];

        render(<AttachmentForm onFilesChanged={mockOnFilesChanged} isInline={true} initialFiles={savedFiles} />);

        await waitFor(() => {
            expect(mockOnFilesChanged).toHaveBeenCalled();
            const calledFiles = mockOnFilesChanged.mock.calls[0][0];
            expect(calledFiles).toHaveLength(1);
            expect(calledFiles[0].name).toBe('test.txt');
        });
    });

    it('creates preview URL for images', () => {
        const savedFiles = [createSerializedFile('image.png', 'image/png')];

        render(<AttachmentForm onFilesChanged={mockOnFilesChanged} isInline={true} initialFiles={savedFiles} />);

        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('does not create preview URL for non-images', () => {
        const savedFiles = [createSerializedFile('document.pdf', 'application/pdf')];

        render(<AttachmentForm onFilesChanged={mockOnFilesChanged} isInline={true} initialFiles={savedFiles} />);

        expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('handles empty files array correctly', () => {
        const { getByText } = render(
            <AttachmentForm onFilesChanged={mockOnFilesChanged} isInline={true} initialFiles={[]} />,
        );

        expect(getByText('Drop files or click to browse')).toBeTruthy();
    });
});
