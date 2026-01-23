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
});
