import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MissingScopesBanner } from './MissingScopesBanner';

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

describe('MissingScopesBanner', () => {
    const mockOnOpen = jest.fn();
    const mockOnDismiss = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the banner with correct title', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Jira editor functionality has been improved')).toBeTruthy();
    });

    it('should render the banner with correct description', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const descriptionText =
            'Jira editing functionality has been enhanced for a better experience. Please reauthenticate to access new features.';
        expect(screen.getByText(descriptionText)).toBeTruthy();
    });

    it('should render both Dismiss and Reauthenticate buttons', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Dismiss')).toBeTruthy();
        expect(screen.getByText('Reauthenticate')).toBeTruthy();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const dismissButton = screen.getByText('Dismiss');
        fireEvent.click(dismissButton);

        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        expect(mockOnOpen).not.toHaveBeenCalled();
    });

    it('should call onOpen when Reauthenticate button is clicked', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const reauthenticateButton = screen.getByText('Reauthenticate');
        fireEvent.click(reauthenticateButton);

        expect(mockOnOpen).toHaveBeenCalledTimes(1);
        expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should render dismiss button with correct test id', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const dismissButton = screen.getByTestId('missing-scopes-dismiss-button');
        expect(dismissButton).toBeTruthy();
    });

    it('should render reauthenticate button with correct test id', () => {
        render(<MissingScopesBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const openButton = screen.getByTestId('missing-scopes-open-button');
        expect(openButton).toBeTruthy();
    });
});
