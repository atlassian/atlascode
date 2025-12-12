import { rovoDevEntitlementCheckEvent } from 'src/analytics';
import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
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
    let mockClientManager: any;
    let mockConfig: any;
    let mockFeatureGateClient: any;
    let mockSiteManager: any;
    beforeEach(() => {
        mockSiteManager = {
            onDidSitesAvailableChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        };
        (Container as any).siteManager = mockSiteManager;
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        } as any;

        mockClientManager = {
            getCloudPrimarySite: jest.fn(),
        };

        mockConfig = {
            rovodev: {
                showEntitlementNotifications: true,
            },
        };

        mockFeatureGateClient = {
            checkGate: jest.fn().mockResolvedValue(true),
        };

        (Container as any).clientManager = mockClientManager;
        (Container as any).config = mockConfig;
        (Container as any).featureFlagClient = mockFeatureGateClient;
        (Container as any).siteManager = mockSiteManager;
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
            mockClientManager.getCloudPrimarySite.mockResolvedValue({
                host: 'test.atlassian.net',
                siteCloudId: 'site123',
                isValid: true,
                authInfo: { username: 'user', password: 'pass' },
            });

            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('ROVO_DEV_EVERYWHERE'),
            });

            const result = await checker.checkEntitlement();

            expect(result).toStrictEqual({ isEntitled: true, type: 'ROVO_DEV_EVERYWHERE' });
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
            mockClientManager.getCloudPrimarySite.mockResolvedValue({
                host: 'test.atlassian.net',
                siteCloudId: 'site123',
                isValid: true,
                authInfo: { username: 'user', password: 'pass' },
            });

            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('NO_ACTIVE_PRODUCT'),
            });

            const result = await checker.checkEntitlement();

            expect(result).toStrictEqual({ isEntitled: false, type: 'NO_ACTIVE_PRODUCT' });
        });

        it('should check FG trait if no valid API token credentials', async () => {
            mockClientManager.getCloudPrimarySite.mockResolvedValue(undefined);

            const result = await checker.checkEntitlement();

            expect(mockFeatureGateClient.checkGate).toHaveBeenCalledWith('atlascode-rovodev-entitled');
            expect(result).toStrictEqual({ isEntitled: true, type: 'UNKNOWN' });
        });

        it('should thow RovoDevEntitlementError for no active product FG trait', async () => {
            mockClientManager.getCloudPrimarySite.mockResolvedValue(undefined);
            mockFeatureGateClient.checkGate.mockReturnValue(false);

            const result = await checker.checkEntitlement();

            expect(mockFeatureGateClient.checkGate).toHaveBeenCalledWith('atlascode-rovodev-entitled');
            expect(result).toStrictEqual({ isEntitled: false, type: 'NO_ACTIVE_PRODUCT' });
        });

        it('should return false when API call fails', async () => {
            mockClientManager.getCloudPrimarySite.mockResolvedValue({
                host: 'test.atlassian.net',
                siteCloudId: 'site123',
                isValid: true,
                authInfo: { username: 'user', password: 'pass' },
            });

            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 403,
            });

            const result = await checker.checkEntitlement();

            expect(result).toStrictEqual({ isEntitled: false, type: 'FETCH_FAILED' });
            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Unable to check Rovo Dev entitlement');
        });

        it('should handle network errors gracefully', async () => {
            mockClientManager.getCloudPrimarySite.mockResolvedValue({
                host: 'test.atlassian.net',
                siteCloudId: 'site123',
                isValid: true,
                authInfo: { username: 'user', password: 'pass' },
            });

            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await checker.checkEntitlement();

            expect(result).toStrictEqual({ isEntitled: false, type: 'FETCH_FAILED' });
        });
    });
});
