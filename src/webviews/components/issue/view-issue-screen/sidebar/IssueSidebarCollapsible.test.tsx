import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueSidebarCollapsible, SidebarItem } from './IssueSidebarCollapsible';

describe('IssueSidebarCollapsible', () => {
    const mockItems: SidebarItem[] = [
        { itemLabel: 'Item 1', itemComponent: <div>Component 1</div> },
        { itemLabel: 'Item 2', itemComponent: <div>Component 2</div> },
    ];

    it('renders the collapsible with the provided label', () => {
        render(<IssueSidebarCollapsible label="Test Label" items={mockItems} />);
        expect(screen.getByText('Test Label')).toBeTruthy();
    });

    it('renders items when expanded', () => {
        render(<IssueSidebarCollapsible label="Test Label" items={mockItems} defaultOpen={true} />);
        expect(screen.getByText('Item 1')).toBeTruthy();
        expect(screen.getByText('Component 1')).toBeTruthy();
        expect(screen.getByText('Item 2')).toBeTruthy();
        expect(screen.getByText('Component 2')).toBeTruthy();
    });

    it('does not render items when collapsed', () => {
        render(<IssueSidebarCollapsible label="Test Label" items={mockItems} defaultOpen={false} />);
        expect(screen.queryByText('Item 1')).not.toBeTruthy();
        expect(screen.queryByText('Component 1')).not.toBeTruthy();
    });

    it('toggles open and close state when the button is clicked', () => {
        render(<IssueSidebarCollapsible label="Test Label" items={mockItems} defaultOpen={false} />);
        const toggleButton = screen.getByText('Test Label');
        fireEvent.click(toggleButton);
        expect(screen.getByText('Item 1')).toBeTruthy();
        fireEvent.click(toggleButton);
        expect(screen.queryByText('Item 1')).not.toBeTruthy();
    });
});
