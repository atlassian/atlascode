import { rovoDevEntitlementCheckEvent } from 'src/analytics';
import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { Logger } from 'src/logger';

import { RovoDevEntitlementChecker } from './rovoDevEntitlementChecker';

// Mock dependencies
jest.mock('src/analytics');
jest.mock('src/container');
jest.mock('src/logger');
jest.mock('src/atlclients/authInfo');

// Mock global fetch
global.fetch = jest.fn();

describe('RovoDevEntitlementChecker', () => {
    let checker: RovoDevEntitlementChecker;
    let mockAnalyticsClient: jest.Mocked<AnalyticsClient>;
    let mockSiteManager: any;
    let mockCredentialManager: any;
    let mockClientManager: any;

    beforeEach(() => {
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        } as any;

        mockSiteManager = {
            getSitesAvailable: jest.fn(),
        };

        mockCredentialManager = {
            getApiTokenIfExists: jest.fn(),
        };

        mockClientManager = {
            jiraClient: jest.fn(),
        };

        (Container as any).siteManager = mockSiteManager;
        (Container as any).credentialManager = mockCredentialManager;
        (Container as any).clientManager = mockClientManager;

        (Logger.debug as jest.Mock).mockImplementation(() => {});
        (Logger.error as jest.Mock).mockImplementation(() => {});
        (rovoDevEntitlementCheckEvent as jest.Mock).mockResolvedValue({});

        checker = new RovoDevEntitlementChecker(mockAnalyticsClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
        checker.dispose();
    });

    describe('checkEntitlement', () => {
        it('should return true for entitled response', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({
                username: 'user',
                password: 'pass',
            });
            mockClientManager.jiraClient.mockResolvedValue({});

            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('ROVO_DEV_EVERYWHERE'),
            });

            const result = await checker.checkEntitlement();

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'https://test.atlassian.net/gateway/api/rovodev/v3/sites/type',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: 'Basic dXNlcjpwYXNz',
                        'X-RovoDev-Billing-CloudId': 'site123',
                    }),
                }),
            );
        });

        it('should return false for non-entitled response', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockResolvedValue({});

            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('NO_ACTIVE_PRODUCT'),
            });

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
        });

        it('should check entitlement for specific site', async () => {
            const mockSites = [
                { host: 'site1.atlassian.net', id: 'site1', isCloud: true },
                { host: 'site2.atlassian.net', id: 'site2', isCloud: true },
            ];
            const targetSite = { host: 'site2.atlassian.net' } as DetailedSiteInfo;

            mockSiteManager.getSitesAvailable.mockReturnValue(mockSites);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockResolvedValue({});

            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('ROVO_DEV_STANDARD'),
            });

            const result = await checker.checkEntitlement(targetSite);

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'https://site2.atlassian.net/gateway/api/rovodev/v3/sites/type',
                expect.any(Object),
            );
        });

        it('should return false when no valid credentials found', async () => {
            mockSiteManager.getSitesAvailable.mockReturnValue([]);

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Unable to check Rovo Dev entitlement');
        });

        it('should return false when API call fails', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockResolvedValue({});

            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 403,
            });

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Unable to check Rovo Dev entitlement');
        });

        it('should handle network errors gracefully', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockResolvedValue({});

            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
        });

        it('should filter out non-cloud and non-staging sites', async () => {
            const mockSites = [
                { host: 'server.company.com', id: 'site1', isCloud: false },
                { host: 'test.jira-dev.com', id: 'site2', isCloud: false },
                { host: 'prod.atlassian.net', id: 'site3', isCloud: true },
            ];

            mockSiteManager.getSitesAvailable.mockReturnValue(mockSites);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockResolvedValue({});

            const validCredentialsSpy = jest.spyOn(checker as any, 'getValidCredentials');

            await checker.checkEntitlement();

            expect(validCredentialsSpy).toHaveBeenCalled();
            expect(mockCredentialManager.getApiTokenIfExists).toHaveBeenCalledTimes(2); // Only for staging and cloud sites
        });

        it('should handle invalid credentials gracefully', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue(null);

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
        });

        it('should mark credentials as invalid when jira client fails', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockRejectedValue(new Error('Auth failed'));

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
        });

        it('should throw error for unsupported auth type', async () => {
            const mockSite = { host: 'test.atlassian.net', id: 'site123', isCloud: true };
            mockSiteManager.getSitesAvailable.mockReturnValue([mockSite]);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ type: 'oauth' });
            mockClientManager.jiraClient.mockResolvedValue({});

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Unable to check Rovo Dev entitlement');
        });

        it('should return false when no valid credentials found for specific site', async () => {
            const mockSites = [{ host: 'site1.atlassian.net', id: 'site1', isCloud: true }];
            const targetSite = { host: 'site2.atlassian.net' } as DetailedSiteInfo;

            mockSiteManager.getSitesAvailable.mockReturnValue(mockSites);
            mockCredentialManager.getApiTokenIfExists.mockResolvedValue({ username: 'user', password: 'pass' });
            mockClientManager.jiraClient.mockResolvedValue({});

            const result = await checker.checkEntitlement(targetSite);

            expect(result).toBe(false);
        });
    });
});
