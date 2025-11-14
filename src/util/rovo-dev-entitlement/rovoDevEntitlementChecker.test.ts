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

    beforeEach(() => {
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        } as any;

        mockClientManager = {
            getCloudPrimarySite: jest.fn(),
        };

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

            expect(result).toBe(false);
        });

        it('should return false when no valid credentials found', async () => {
            mockClientManager.getCloudPrimarySite.mockResolvedValue(undefined);

            const result = await checker.checkEntitlement();

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Unable to check Rovo Dev entitlement');
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

            expect(result).toBe(false);
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

            expect(result).toBe(false);
        });
    });
});
