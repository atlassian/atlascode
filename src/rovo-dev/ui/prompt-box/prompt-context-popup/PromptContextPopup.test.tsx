import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import PromptContextPopup, { PromptContextPopupItem } from './PromptContextPopup';

const mockItems: PromptContextPopupItem[] = [
    {
        label: 'Test Item 1',
        description: 'Test description 1',
        icon: <span>📄</span>,
        action: jest.fn(),
    },
    {
        label: 'Test Item 2',
        icon: <span>🔧</span>,
        action: jest.fn(),
    },
    {
        label: 'Test Item 3',
        description: 'Test description 3',
        icon: <span>⚙️</span>,
    },
];

describe('PromptContextPopup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders closed state initially', () => {
        render(<PromptContextPopup items={mockItems} />);
        expect(screen.getByLabelText('Prompt context')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context (open)')).not.toBeTruthy();
    });

    it('toggles open state when trigger button is clicked', () => {
        render(<PromptContextPopup items={mockItems} />);

        const triggerButton = screen.getByLabelText('Prompt context');
        fireEvent.click(triggerButton);

        expect(screen.getByLabelText('Prompt context (open)')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context')).not.toBeTruthy();
    });

    it('closes popup when close button is clicked', () => {
        render(<PromptContextPopup items={mockItems} />);

        // Open popup
        fireEvent.click(screen.getByLabelText('Prompt context'));

        // Close popup
        fireEvent.click(screen.getByLabelText('Prompt context (open)'));

        expect(screen.getByLabelText('Prompt context')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context (open)')).not.toBeTruthy();
    });

    it('renders all items when open', () => {
        render(<PromptContextPopup items={mockItems} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));

        expect(screen.getByText('Test Item 1')).toBeTruthy();
        expect(screen.getByText('Test Item 2')).toBeTruthy();
        expect(screen.getByText('Test Item 3')).toBeTruthy();
    });

    it('renders item descriptions when provided', () => {
        render(<PromptContextPopup items={mockItems} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));

        expect(screen.getByText('Test description 1')).toBeTruthy();
        expect(screen.getByText('Test description 3')).toBeTruthy();
        expect(screen.queryByText('Test description 2')).not.toBeTruthy();
    });

    it('calls item action when item is clicked', () => {
        render(<PromptContextPopup items={mockItems} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));
        fireEvent.click(screen.getByText('Test Item 1'));

        expect(mockItems[0].action).toHaveBeenCalledTimes(1);
    });

    it('closes popup after item is clicked', () => {
        render(<PromptContextPopup items={mockItems} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));
        fireEvent.click(screen.getByText('Test Item 1'));

        expect(screen.getByLabelText('Prompt context')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context (open)')).not.toBeTruthy();
    });

    it('handles items without action gracefully', () => {
        render(<PromptContextPopup items={mockItems} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));
        fireEvent.click(screen.getByText('Test Item 3'));

        // Should not throw error and should still close popup
        expect(screen.getByLabelText('Prompt context')).toBeTruthy();
    });

    it('renders empty state when no items provided', () => {
        render(<PromptContextPopup items={[]} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));

        expect(screen.queryByText('Test Item 1')).not.toBeTruthy();
    });

    it('renders item icons correctly', () => {
        render(<PromptContextPopup items={mockItems} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));

        expect(screen.getByText('📄')).toBeTruthy();
        expect(screen.getByText('🔧')).toBeTruthy();
        expect(screen.getByText('⚙️')).toBeTruthy();
    });
});
