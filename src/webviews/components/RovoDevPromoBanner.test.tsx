import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import RovoDevPromoBanner from './RovoDevPromoBanner';

jest.mock('@atlaskit/css', () => ({
    cssMap: (styles: any) => {
        const result: any = {};
        for (const key in styles) {
            result[key] = styles[key];
        }
        return result;
    },
}));

jest.mock('@atlaskit/feature-gate-js-client', () => ({
    Client: jest.fn().mockImplementation(() => ({
        checkGate: jest.fn().mockReturnValue(false),
        assertInitialized: jest.fn(),
    })),
    FeatureGates: {
        checkGate: jest.fn().mockReturnValue(false),
    },
}));

jest.mock('@atlaskit/platform-feature-flags', () => ({
    fg: jest.fn().mockReturnValue(false),
}));

describe('RovoDevPromoBanner', () => {
    const mockOnOpen = jest.fn();
    const mockOnDismiss = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the banner with correct entitlement type', () => {
        render(<RovoDevPromoBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const fullText = `Atlassian's AI agent for software teams that uses your team's knowledge to streamline development from idea to deployment.`;
        expect(screen.getByText(fullText)).toBeTruthy();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
        render(<RovoDevPromoBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const dismissButton = screen.getByText('Dismiss');
        fireEvent.click(dismissButton);

        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        expect(mockOnOpen).not.toHaveBeenCalled();
    });

    it('should call onOpen when Open Rovo Dev button is clicked', () => {
        render(<RovoDevPromoBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const openButton = screen.getByText('Open Rovo Dev');
        fireEvent.click(openButton);

        expect(mockOnOpen).toHaveBeenCalledTimes(1);
        expect(mockOnDismiss).not.toHaveBeenCalled();
    });
});
