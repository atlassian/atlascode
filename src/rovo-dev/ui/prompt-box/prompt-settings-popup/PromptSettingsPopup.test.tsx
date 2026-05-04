import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('@atlaskit/css', () => ({
    cssMap: (styles: any) => {
        const result: any = {};
        for (const key in styles) {
            result[key] = styles[key];
        }
        return result;
    },
}));

import PromptSettingsPopup from './PromptSettingsPopup';

describe('PromptSettingsPopup', () => {
    const mockOnDeepPlanToggled = jest.fn();
    const mockOnYoloModeToggled = jest.fn();
    const mockOnFullContextToggled = jest.fn();
    const mockOnAgentModeChange = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the settings trigger button', () => {
        render(
            <PromptSettingsPopup
                onDeepPlanToggled={mockOnDeepPlanToggled}
                onYoloModeToggled={mockOnYoloModeToggled}
                onFullContextToggled={mockOnFullContextToggled}
                isYoloModeEnabled={false}
                isFullContextEnabled={false}
                availableAgentModes={[]}
                currentAgentMode={null}
                onAgentModeChange={mockOnAgentModeChange}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        expect(settingsButton).toBeTruthy();
    });

    it('opens popup when trigger button is clicked', () => {
        render(
            <PromptSettingsPopup
                onDeepPlanToggled={mockOnDeepPlanToggled}
                onYoloModeToggled={mockOnYoloModeToggled}
                onFullContextToggled={mockOnFullContextToggled}
                isYoloModeEnabled={false}
                isFullContextEnabled={false}
                availableAgentModes={[]}
                currentAgentMode={null}
                onAgentModeChange={mockOnAgentModeChange}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        fireEvent.click(settingsButton);

        expect(screen.getByText('Plan')).toBeTruthy();
    });

    it('closes popup and calls onClose when clicking outside', () => {
        render(
            <PromptSettingsPopup
                onDeepPlanToggled={mockOnDeepPlanToggled}
                onYoloModeToggled={mockOnYoloModeToggled}
                onFullContextToggled={mockOnFullContextToggled}
                isYoloModeEnabled={false}
                isFullContextEnabled={false}
                availableAgentModes={[]}
                currentAgentMode={null}
                onAgentModeChange={mockOnAgentModeChange}
                onClose={mockOnClose}
            />,
        );

        const settingsButton = screen.getByRole('button', { name: 'Prompt settings' });
        fireEvent.click(settingsButton);

        fireEvent.click(document.body);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
