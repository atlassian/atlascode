import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RovoDevToggle } from './RovoDevToggle';

describe('RovoDevToggle', () => {
    it('renders unchecked by default', () => {
        const mockOnChange = jest.fn();
        render(<RovoDevToggle checked={false} onChange={mockOnChange} />);

        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
        expect(screen.getByText('Start work with Rovo Dev')).toBeDefined();
    });

    it('renders checked when checked prop is true', () => {
        const mockOnChange = jest.fn();
        render(<RovoDevToggle checked={true} onChange={mockOnChange} />);

        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    it('calls onChange when clicked', () => {
        const mockOnChange = jest.fn();
        render(<RovoDevToggle checked={false} onChange={mockOnChange} />);

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when unchecking', () => {
        const mockOnChange = jest.fn();
        render(<RovoDevToggle checked={true} onChange={mockOnChange} />);

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        expect(mockOnChange).toHaveBeenCalledWith(false);
    });
});
