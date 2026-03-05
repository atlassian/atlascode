import { render } from '@testing-library/react';
import React from 'react';

import { MarkedDown } from './common';

describe('MarkedDown', () => {
    const mockOnLinkClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders markdown content correctly', () => {
        const { getByText } = render(<MarkedDown value="**Bold text**" onLinkClick={mockOnLinkClick} />);
        expect(getByText('Bold text')).toBeTruthy();
    });

    it('renders plain text correctly', () => {
        const { getByText } = render(<MarkedDown value="Plain text" onLinkClick={mockOnLinkClick} />);
        expect(getByText('Plain text')).toBeTruthy();
    });

    it('handles null value without crashing', () => {
        expect(() => {
            render(<MarkedDown value={null as any} onLinkClick={mockOnLinkClick} />);
        }).not.toThrow();
    });

    it('handles undefined value without crashing', () => {
        expect(() => {
            render(<MarkedDown value={undefined as any} onLinkClick={mockOnLinkClick} />);
        }).not.toThrow();
    });

    it('handles empty string correctly', () => {
        const { container } = render(<MarkedDown value="" onLinkClick={mockOnLinkClick} />);
        expect(container.querySelector('span')).toBeTruthy();
    });

    it('handles malformed markdown gracefully', () => {
        // Mock console.error to verify it's called
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Extremely malformed markdown that might cause parser errors
        const malformedMarkdown = '```\n\n```\n**unclosed bold\n[invalid link](';

        const { container } = render(<MarkedDown value={malformedMarkdown} onLinkClick={mockOnLinkClick} />);

        // Should render something (either parsed or fallback to plain text)
        expect(container.querySelector('span')).toBeTruthy();

        consoleErrorSpy.mockRestore();
    });
});
