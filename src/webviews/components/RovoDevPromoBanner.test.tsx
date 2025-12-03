import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RovoDevEntitlementType } from '../../util/rovo-dev-entitlement/rovoDevEntitlementChecker';
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

// Mock the entitlement checker
jest.mock('../../util/rovo-dev-entitlement/rovoDevEntitlementChecker', () => ({
    RovoDevEntitlementType: {
        ROVO_DEV_EVERYWHERE: 'ROVO_DEV_EVERYWHERE',
        ROVO_DEV_STANDARD: 'ROVO_DEV_STANDARD',
        ROVO_DEV_STANDARD_TRIAL: 'ROVO_DEV_STANDARD_TRIAL',
        ROVO_DEV_BETA: 'ROVO_DEV_BETA',
    },
}));

describe('RovoDevPromoBanner', () => {
    const mockOnOpen = jest.fn();
    const mockOnDismiss = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the banner with correct entitlement type', () => {
        const entitlementType = RovoDevEntitlementType.ROVO_DEV_STANDARD;
        render(<RovoDevPromoBanner onOpen={mockOnOpen} onDismiss={mockOnDismiss} />);

        const fullText = `Your Jira site now has access to ${entitlementType}, Atlassian's AI agent for software teams that uses your team's knowledge to streamline development from idea to deployment.`;
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
