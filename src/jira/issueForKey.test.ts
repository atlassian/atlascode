import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import pTimeout from 'p-timeout';
import { expansionCastTo } from 'testsutil';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { Time } from '../util/time';
import * as fetchIssueModule from './fetchIssue';
import { issueForKey } from './issueForKey';

// Mock dependencies
jest.mock('p-timeout');
jest.mock('./fetchIssue');
jest.mock('../container', () => ({
    Container: {
        siteManager: {
            getSitesAvailable: jest.fn(),
        },
    },
}));

describe('issueForKey', () => {
    let pTimeoutMock: jest.Mock;

    // Mock data
    const mockIssueKey = 'TEST-123';

    const mockSiteDetails1 = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site 1',
    });

    const mockSiteDetails2 = expansionCastTo<DetailedSiteInfo>({
        id: 'site-2',
        name: 'Test Site 2',
    });

    const mockMinimalIssue1 = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key: mockIssueKey,
        summary: 'Test issue',
        siteDetails: mockSiteDetails1,
    });

    const mockMinimalIssue2 = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key: mockIssueKey,
        summary: 'Test issue from site 2',
        siteDetails: mockSiteDetails2,
    });

    // Setup mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Container mock
        (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([mockSiteDetails1, mockSiteDetails2]);

        // Setup fetchMinimalIssue mock
        (fetchIssueModule.fetchMinimalIssue as jest.Mock).mockImplementation(
            (issueKey: string, site: DetailedSiteInfo) => {
                if (site.id === 'site-1') {
                    return Promise.resolve(mockMinimalIssue1);
                } else {
                    return Promise.resolve(mockMinimalIssue2);
                }
            },
        );

        // Setup p-timeout mock
        pTimeoutMock = jest
            .spyOn(pTimeout, 'default')
            .mockImplementation((promise: Promise<unknown>) => promise) as jest.Mock;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should fetch issue from multiple sites', async () => {
        // Execute function
        const result = await issueForKey(mockIssueKey);

        // Verify Container.siteManager.getSitesAvailable was called with ProductJira
        expect(Container.siteManager.getSitesAvailable).toHaveBeenCalledWith(ProductJira);

        // Verify fetchMinimalIssue was called for each site
        expect(fetchIssueModule.fetchMinimalIssue).toHaveBeenCalledTimes(2);
        expect(fetchIssueModule.fetchMinimalIssue).toHaveBeenCalledWith(mockIssueKey, mockSiteDetails1);
        expect(fetchIssueModule.fetchMinimalIssue).toHaveBeenCalledWith(mockIssueKey, mockSiteDetails2);

        // Verify pTimeout was called with correct timeout
        expect(pTimeout).toHaveBeenCalledWith(expect.any(Promise), 1 * Time.MINUTES);

        // Verify the result is the issue from the first site that resolves
        expect(result).toBe(mockMinimalIssue1);
    });

    it('should return first successfully found issue', async () => {
        // Setup fetchMinimalIssue to fail for the first site
        (fetchIssueModule.fetchMinimalIssue as jest.Mock).mockImplementation(
            (issueKey: string, site: DetailedSiteInfo) => {
                if (site.id === 'site-1') {
                    return Promise.reject(new Error('Issue not found in site 1'));
                } else {
                    return Promise.resolve(mockMinimalIssue2);
                }
            },
        );

        // Execute function
        const result = await issueForKey(mockIssueKey);

        // The function should resolve with the second site's issue
        expect(result).toBe(mockMinimalIssue2);
    });

    it('should reject if no sites have the issue', async () => {
        // Setup fetchMinimalIssue to fail for all sites
        (fetchIssueModule.fetchMinimalIssue as jest.Mock).mockImplementation(() => {
            return Promise.reject(new Error('Issue not found'));
        });

        // Execute function and expect rejection
        await expect(issueForKey(mockIssueKey)).rejects.toEqual(`no issue found with key ${mockIssueKey}`);
    });

    it('should reject if pTimeout times out', async () => {
        // Setup pTimeout to simulate a timeout
        pTimeoutMock.mockImplementation(() => {
            return Promise.reject(new Error('Timeout'));
        });

        // Execute function and expect rejection
        await expect(issueForKey(mockIssueKey)).rejects.toEqual(`no issue found with key ${mockIssueKey}`);

        // Verify pTimeout was called with correct timeout
        expect(pTimeout).toHaveBeenCalledWith(expect.any(Promise), 1 * Time.MINUTES);
    });

    it('should handle no available sites', async () => {
        // Setup Container mock to return empty sites
        (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([]);

        // Execute function and expect rejection (Promise.any with empty array rejects)
        await expect(issueForKey(mockIssueKey)).rejects.toEqual(`no issue found with key ${mockIssueKey}`);

        // Verify fetchMinimalIssue was not called
        expect(fetchIssueModule.fetchMinimalIssue).not.toHaveBeenCalled();
    });

    it('should use Promise.any to race between sites', async () => {
        // Create spy on Promise.any
        const promiseAnySpy = jest.spyOn(Promise, 'any');

        // Execute function
        await issueForKey(mockIssueKey);

        // Verify Promise.any was called
        expect(promiseAnySpy).toHaveBeenCalledWith(expect.any(Array));

        // Restore original implementation
        promiseAnySpy.mockRestore();
    });
});
