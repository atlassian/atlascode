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
});
