import { render, screen } from '@testing-library/react';
import React from 'react';

import { AuthInfoState, Product, ProductJira } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { ConfigControllerContext } from '../configController';
import { SiteList } from './SiteList';

// Mock the deduplicateOAuthSites function
jest.mock('./siteDeduplication', () => ({
    deduplicateOAuthSites: jest.fn((sites) => sites),
}));

// Mock the useBorderBoxStyles hook
jest.mock('../../common/useBorderBoxStyles', () => ({
    useBorderBoxStyles: () => ({ box: 'mock-border-box-class' }),
}));

// Mock makeStyles to avoid theme issues
jest.mock('@mui/styles', () => ({
    makeStyles: () => () => ({
        root: 'mock-root-class',
        iconStyle: 'mock-icon-class',
    }),
}));

const mockController = {
    logout: jest.fn(),
    login: jest.fn(),
} as any;

const createMockSiteWithAuth = (siteName: string): SiteWithAuthInfo => ({
    site: {
        id: siteName,
        name: siteName,
        host: `${siteName}.com`,
        isCloud: true,
        product: ProductJira,
        avatarUrl: '',
        baseLinkUrl: '',
        baseApiUrl: '',
        userId: '',
        credentialId: '',
    },
    auth: {
        state: AuthInfoState.Valid,
        user: {
            id: `user-${siteName}`,
            email: `${siteName}@example.com`,
            displayName: siteName,
            avatarUrl: '',
        },
    },
});

const renderSiteList = (sites: SiteWithAuthInfo[], product: Product = ProductJira) => {
    return render(
        <ConfigControllerContext.Provider value={mockController}>
            <SiteList sites={sites} product={product} editServer={jest.fn()} />
        </ConfigControllerContext.Provider>,
    );
};

describe('SiteList', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should display sites in alphabetical order by site name', () => {
        const sites = [
            createMockSiteWithAuth('ZebraSite'),
            createMockSiteWithAuth('AlphaSite'),
            createMockSiteWithAuth('BetaSite'),
            createMockSiteWithAuth('GammaSite'),
        ];

        renderSiteList(sites);

        const siteElements = screen.getAllByText(/Site$/);
        const siteNames = siteElements.map((element) => element.textContent);

        expect(siteNames).toEqual(['AlphaSite', 'BetaSite', 'GammaSite', 'ZebraSite']);
    });

    it('should sort sites case-insensitively', () => {
        const sites = [
            createMockSiteWithAuth('zulu'),
            createMockSiteWithAuth('Alpha'),
            createMockSiteWithAuth('beta'),
            createMockSiteWithAuth('Charlie'),
        ];

        renderSiteList(sites);

        const siteElements = screen.getAllByText(/^(zulu|Alpha|beta|Charlie)$/);
        const siteNames = siteElements.map((element) => element.textContent);

        expect(siteNames).toEqual(['Alpha', 'beta', 'Charlie', 'zulu']);
    });
});
