import * as path from 'path';

import { BitbucketContext } from '../../bitbucket/bbContext';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, PaginatedPullRequests, WorkspaceRepo } from '../../bitbucket/model';
import { Logger } from '../../logger';
import { categorizeNetworkError, retryWithBackoff } from '../../util/retry';
import { PullRequestCreatedMonitor } from './pullRequestCreatedMonitor';

jest.mock('../../bitbucket/bbUtils');
jest.mock('../../util/retry');
jest.mock('../../logger', () => ({
    Logger: class {
        static debug = jest.fn();
        static error = jest.fn();
        static info = jest.fn();
        static warn = jest.fn();
    },
}));
jest.mock('../../bitbucket/bbLogger');
jest.mock('path');

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('PullRequestCreatedMonitor', () => {
    let monitor: PullRequestCreatedMonitor;
    let mockBbContext: BitbucketContext;
    let mockRepo: WorkspaceRepo;
    let mockSite: BitbucketSite;
    let mockPullRequestApi: { getLatest: jest.Mock };
    let mockBbApi: { pullrequests: { getLatest: jest.Mock } };

    beforeEach(() => {
        jest.clearAllMocks();

        (path.basename as jest.Mock).mockImplementation((p: string) => p.split('/').pop() || p);

        mockSite = {
            details: { isCloud: true },
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
        } as BitbucketSite;

        mockRepo = {
            rootUri: '/path/to/repo',
            mainSiteRemote: {
                site: mockSite,
            },
        } as WorkspaceRepo;

        mockPullRequestApi = { getLatest: jest.fn() };
        mockBbApi = { pullrequests: mockPullRequestApi };
        (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

        mockBbContext = {
            getBitbucketRepositories: jest.fn().mockReturnValue([mockRepo]),
        } as unknown as BitbucketContext;

        (retryWithBackoff as jest.Mock).mockImplementation((operation) => operation());

        monitor = new PullRequestCreatedMonitor(mockBbContext);
    });

    describe('retry mechanism', () => {
        it('should use retryWithBackoff with correct configuration', async () => {
            const mockPRData: PaginatedPullRequests = {
                workspaceRepo: mockRepo,
                site: mockSite,
                data: [],
            };

            mockPullRequestApi.getLatest.mockResolvedValue(mockPRData);

            monitor.checkForNewActivity();
            await flushPromises();

            expect(retryWithBackoff).toHaveBeenCalledWith(expect.any(Function), {
                maxAttempts: 3,
                initialDelayMs: 1000,
                maxDelayMs: 5000,
            });
        });

        it('should reset consecutive failures on successful fetch', async () => {
            monitor['_consecutiveFailures'].set(mockRepo.rootUri, 3);

            const mockPRData: PaginatedPullRequests = {
                workspaceRepo: mockRepo,
                site: mockSite,
                data: [],
            };

            mockPullRequestApi.getLatest.mockResolvedValue(mockPRData);

            monitor.checkForNewActivity();
            await flushPromises();

            expect(monitor['_consecutiveFailures'].get(mockRepo.rootUri)).toBe(0);
        });
    });

    describe('error tracking', () => {
        it('should increment consecutive failures counter on error', async () => {
            const mockError = new Error('ETIMEDOUT');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'timeout',
                message: 'Request timeout',
            });

            monitor['_consecutiveFailures'].set(mockRepo.rootUri, 2);

            monitor.checkForNewActivity();
            await flushPromises();

            expect(monitor['_consecutiveFailures'].get(mockRepo.rootUri)).toBe(3);
            expect(categorizeNetworkError).toHaveBeenCalledWith(mockError);
        });

        it('should categorize errors for analytics', async () => {
            const mockError = new Error('ENOTFOUND api.bitbucket.org');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'dns',
                message: 'DNS resolution failed',
            });

            monitor.checkForNewActivity();
            await flushPromises();

            expect(categorizeNetworkError).toHaveBeenCalledWith(mockError);
        });

        it('should handle errors correctly when never had successful fetch', async () => {
            const mockError = new Error('Network error');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'network',
                message: 'Network error',
            });

            monitor.checkForNewActivity();
            await flushPromises();

            expect(monitor['_consecutiveFailures'].get(mockRepo.rootUri)).toBe(1);
            expect(monitor['_lastSuccessfulFetch'].get(mockRepo.rootUri)).toBeUndefined();
        });

        it('should track time since last successful fetch when success occurred', async () => {
            const pastTime = new Date(Date.now() - 60000);
            monitor['_lastSuccessfulFetch'].set(mockRepo.rootUri, pastTime);

            const mockError = new Error('Network error');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'network',
                message: 'Network error',
            });

            monitor.checkForNewActivity();
            await flushPromises();

            const timeSinceSuccess = Date.now() - pastTime.getTime();
            expect(timeSinceSuccess).toBeGreaterThan(59000);
        });

        it('should log warning after 5 consecutive failures', async () => {
            const mockError = new Error('ENOTFOUND api.bitbucket.org');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'dns',
                message: 'DNS resolution failed',
            });

            monitor['_consecutiveFailures'].set(mockRepo.rootUri, 4);

            monitor.checkForNewActivity();
            await flushPromises();

            expect(monitor['_consecutiveFailures'].get(mockRepo.rootUri)).toBe(5);
            expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Persistent PR fetch failures'));
        });

        it('should not log warning if failures below threshold', async () => {
            const mockError = new Error('Network error');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'network',
                message: 'Network error',
            });

            monitor['_consecutiveFailures'].set(mockRepo.rootUri, 3);

            monitor.checkForNewActivity();
            await flushPromises();

            expect(Logger.warn).not.toHaveBeenCalled();
        });
    });

    describe('credential skipping optimization', () => {
        let mockRepo2: WorkspaceRepo;
        let mockRepo3: WorkspaceRepo;
        let mockSite2: BitbucketSite;

        beforeEach(() => {
            // Repo 2 with same credential as repo 1
            mockSite2 = {
                details: { isCloud: true, credentialId: 'cred-1' },
                ownerSlug: 'test-owner2',
                repoSlug: 'test-repo2',
            } as BitbucketSite;

            mockRepo2 = {
                rootUri: '/path/to/repo2',
                mainSiteRemote: {
                    site: mockSite2,
                },
            } as WorkspaceRepo;

            // Repo 3 with different credential
            mockRepo3 = {
                rootUri: '/path/to/repo3',
                mainSiteRemote: {
                    site: {
                        details: { isCloud: true, credentialId: 'cred-2' },
                        ownerSlug: 'test-owner3',
                        repoSlug: 'test-repo3',
                    } as BitbucketSite,
                },
            } as WorkspaceRepo;

            // Update mockSite to have same credential as mockSite2
            mockSite.details = { isCloud: true, credentialId: 'cred-1' } as any;
        });

        it('should skip repos with same credential after first failure', async () => {
            mockBbContext.getBitbucketRepositories = jest.fn().mockReturnValue([mockRepo, mockRepo2, mockRepo3]);

            let callCount = 0;
            const mockError = new Error('Auth failed');
            (retryWithBackoff as jest.Mock).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // First call (repo1 with cred-1) fails
                    return Promise.reject(mockError);
                }
                // Second call (repo3 with cred-2) succeeds
                return Promise.resolve({
                    workspaceRepo: mockRepo3,
                    site: mockRepo3.mainSiteRemote.site!,
                    data: [],
                });
            });

            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'auth',
                message: 'Authentication failed',
            });

            monitor.checkForNewActivity();
            await flushPromises();

            // Should have been called only twice: once for repo1 (fails), once for repo3 (different credential)
            // repo2 should be skipped
            expect(retryWithBackoff).toHaveBeenCalledTimes(2);
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Skipping repo2 - credential cred-1 already failed this cycle'),
            );
        });

        it('should mark credential as failed for systemic errors', async () => {
            const systemicErrors = [
                { category: 'auth', message: 'Auth failed' },
                { category: 'network', message: 'Network error' },
                { category: 'dns', message: 'DNS failed' },
                { category: 'timeout', message: 'Timeout' },
            ];

            for (const errorInfo of systemicErrors) {
                jest.clearAllMocks();
                monitor = new PullRequestCreatedMonitor(mockBbContext);
                mockBbContext.getBitbucketRepositories = jest.fn().mockReturnValue([mockRepo, mockRepo2]);

                const mockError = new Error(errorInfo.message);
                let callCount = 0;
                (retryWithBackoff as jest.Mock).mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.reject(mockError);
                    }
                    throw new Error('Should not be called for second repo');
                });
                (categorizeNetworkError as jest.Mock).mockReturnValue(errorInfo);

                monitor.checkForNewActivity();
                await flushPromises();

                // Second repo should be skipped
                expect(Logger.debug).toHaveBeenCalledWith(
                    expect.stringContaining('credential cred-1 already failed this cycle'),
                );
                expect(retryWithBackoff).toHaveBeenCalledTimes(1);
            }
        });

        it('should not mark credential as failed for non-systemic errors', async () => {
            mockBbContext.getBitbucketRepositories = jest.fn().mockReturnValue([mockRepo, mockRepo2]);

            const mockError = new Error('Unknown error');
            (retryWithBackoff as jest.Mock).mockRejectedValue(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'unknown',
                message: 'Unknown error',
            });

            monitor.checkForNewActivity();
            await flushPromises();

            // Both repos should be tried since unknown error doesn't mark credential as failed
            expect(retryWithBackoff).toHaveBeenCalledTimes(2);
            expect(Logger.debug).not.toHaveBeenCalledWith(
                expect.stringContaining('credential cred-1 already failed this cycle'),
            );
        });

        it('should clear failed credentials on each new check cycle', async () => {
            mockBbContext.getBitbucketRepositories = jest.fn().mockReturnValue([mockRepo, mockRepo2]);

            // First cycle - auth failure
            const mockError = new Error('Auth failed');
            (retryWithBackoff as jest.Mock).mockImplementation(() => {
                return Promise.reject(mockError);
            });
            (categorizeNetworkError as jest.Mock).mockReturnValue({
                category: 'auth',
                message: 'Authentication failed',
            });

            monitor.checkForNewActivity();
            await flushPromises();

            expect(retryWithBackoff).toHaveBeenCalledTimes(1); // Only repo1 tried, repo2 skipped

            // Second cycle - should retry both repos
            jest.clearAllMocks();
            const mockPRData: PaginatedPullRequests = {
                workspaceRepo: mockRepo,
                site: mockSite,
                data: [],
            };
            (retryWithBackoff as jest.Mock).mockImplementation((operation) => operation());
            mockPullRequestApi.getLatest.mockResolvedValue(mockPRData);

            monitor.checkForNewActivity();
            await flushPromises();

            // Both repos should be tried since credentials were cleared
            expect(retryWithBackoff).toHaveBeenCalledTimes(2);
        });

        it('should process repos with different credentials independently', async () => {
            mockBbContext.getBitbucketRepositories = jest.fn().mockReturnValue([mockRepo, mockRepo3]);

            const mockError = new Error('Auth failed');
            (retryWithBackoff as jest.Mock).mockRejectedValueOnce(mockError);
            (categorizeNetworkError as jest.Mock).mockReturnValueOnce({
                category: 'auth',
                message: 'Authentication failed',
            });

            // Repo3 should succeed
            const mockPRData: PaginatedPullRequests = {
                workspaceRepo: mockRepo3,
                site: mockRepo3.mainSiteRemote.site!,
                data: [],
            };
            (retryWithBackoff as jest.Mock).mockResolvedValueOnce(mockPRData);

            monitor.checkForNewActivity();
            await flushPromises();

            // Both repos should be tried (different credentials)
            expect(retryWithBackoff).toHaveBeenCalledTimes(2);
            expect(monitor['_consecutiveFailures'].get(mockRepo.rootUri)).toBe(1);
            expect(monitor['_consecutiveFailures'].get(mockRepo3.rootUri)).toBe(0);
        });
    });
});
