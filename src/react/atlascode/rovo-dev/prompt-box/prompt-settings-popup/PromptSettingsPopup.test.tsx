import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import PromptSettingsPopup from './PromptSettingsPopup';

describe('PromptSettingsPopup', () => {
    const mockOnToggleDeepPlan = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the settings trigger button', () => {
        render(
            <PromptSettingsPopup
                onToggleDeepPlan={mockOnToggleDeepPlan}
                isDeepPlanEnabled={false}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        expect(settingsButton).toBeTruthy();
    });

    it('opens popup when trigger button is clicked', () => {
        render(
            <PromptSettingsPopup
                onToggleDeepPlan={mockOnToggleDeepPlan}
                isDeepPlanEnabled={false}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        fireEvent.click(settingsButton);

        expect(screen.getByText('Plan')).toBeTruthy();
        expect(
            screen.getByText('Tackle complex, multi-step code by first generating a plan before coding.'),
        ).toBeTruthy();
    });

    it('calls onToggleDeepPlan when toggle is clicked', () => {
        render(
            <PromptSettingsPopup
                onToggleDeepPlan={mockOnToggleDeepPlan}
                isDeepPlanEnabled={false}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        fireEvent.click(settingsButton);

        const toggle = screen.getByLabelText('Plan toggle');
        fireEvent.click(toggle);

        expect(mockOnToggleDeepPlan).toHaveBeenCalledTimes(1);
    });

    it('closes popup and calls onClose when clicking outside', () => {
        render(
            <PromptSettingsPopup
                onToggleDeepPlan={mockOnToggleDeepPlan}
                isDeepPlanEnabled={false}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        fireEvent.click(settingsButton);

        fireEvent.click(document.body);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
