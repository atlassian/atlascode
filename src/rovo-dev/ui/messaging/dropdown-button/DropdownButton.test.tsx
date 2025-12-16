import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DropdownButton } from './DropdownButton';

describe('DropdownButton', () => {
    const mockButtonItem = {
        label: 'Main Action',
        onSelect: jest.fn(),
    };

    const mockItems = [
        { label: 'Item 1', onSelect: jest.fn() },
        { label: 'Item 2', onSelect: jest.fn() },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders button item label', () => {
        render(<DropdownButton buttonItem={mockButtonItem} />);
        expect(screen.getByText('Main Action')).toBeTruthy();
    });

    it('calls buttonItem onSelect when main button is clicked', () => {
        render(<DropdownButton buttonItem={mockButtonItem} />);
        fireEvent.click(screen.getByText('Main Action'));
        expect(mockButtonItem.onSelect).toHaveBeenCalledTimes(1);
    });

    it('does not render dropdown when items are not provided', () => {
        render(<DropdownButton buttonItem={mockButtonItem} />);
        expect(screen.queryByRole('button', { name: /chevron/i })).not.toBeTruthy();
    });

    it('renders dropdown when items are provided', () => {
        render(<DropdownButton buttonItem={mockButtonItem} items={mockItems} />);
        expect(screen.getByRole('button', { name: 'More actions' })).toBeTruthy();
    });

    it('renders dropdown items when dropdown is opened', () => {
        render(<DropdownButton buttonItem={mockButtonItem} items={mockItems} />);
        const dropdownTrigger = screen.getAllByRole('button')[1];
        fireEvent.click(dropdownTrigger);
        expect(screen.getByText('Item 1')).toBeTruthy();
        expect(screen.getByText('Item 2')).toBeTruthy();
    });

    it('calls item onSelect when dropdown item is clicked', () => {
        render(<DropdownButton buttonItem={mockButtonItem} items={mockItems} />);
        const dropdownTrigger = screen.getAllByRole('button')[1];
        fireEvent.click(dropdownTrigger);
        fireEvent.click(screen.getByText('Item 1'));
        expect(mockItems[0].onSelect).toHaveBeenCalledTimes(1);
    });

    it('renders with empty items array', () => {
        render(<DropdownButton buttonItem={mockButtonItem} items={[]} />);
        expect(screen.getByText('Main Action')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /chevron/i })).not.toBeTruthy();
    });
});
