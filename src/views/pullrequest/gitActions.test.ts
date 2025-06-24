import { commands, window } from 'vscode';

import { parseGitUrl, urlForRemote } from '../../bitbucket/bbUtils';
import { PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { Repository } from '../../typings/git';
import { addSourceRemoteIfNeededForPR, checkout, checkoutPRBranch } from './gitActions';

jest.mock('../../bitbucket/bbUtils', () => ({
    parseGitUrl: jest.fn(),
    urlForRemote: jest.fn(),
}));

jest.mock('../../container', () => ({
    Container: {
        bitbucketContext: {
            getRepositoryScm: jest.fn(),
        },
    },
}));

jest.mock('../../logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));

// Mock implementations
const mockCommands = commands as jest.Mocked<typeof commands>;
const mockWindow = window as jest.Mocked<typeof window>;
const mockParseGitUrl = parseGitUrl as jest.MockedFunction<typeof parseGitUrl>;
const mockUrlForRemote = urlForRemote as jest.MockedFunction<typeof urlForRemote>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

// Create mock functions for Container
const mockGetRepositoryScm = jest.fn();
(Container.bitbucketContext as any) = {
    getRepositoryScm: mockGetRepositoryScm,
};

describe('gitActions', () => {
    let mockRepository: jest.Mocked<Repository>;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockPullRequest: PullRequest;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Repository
        mockRepository = {
            rootUri: { toString: () => '/mock/repo' } as any,
            inputBox: { value: '' },
            state: {
                HEAD: {
                    type: 0,
                    name: 'main',
                    commit: 'abc123',
                    behind: 0,
                    ahead: 0,
                },
                refs: [],
                remotes: [],
                submodules: [],
                rebaseCommit: undefined,
                mergeChanges: [],
                indexChanges: [],
                workingTreeChanges: [],
                onDidChange: jest.fn() as any,
            },
            ui: {
                selected: true,
                onDidChange: jest.fn() as any,
            },
            fetch: jest.fn().mockResolvedValue(undefined),
            checkout: jest.fn().mockResolvedValue(undefined),
            pull: jest.fn().mockResolvedValue(undefined),
            getConfig: jest.fn().mockResolvedValue(''),
            addRemote: jest.fn().mockResolvedValue(undefined),
        } as any;

        // Mock WorkspaceRepo
        mockWorkspaceRepo = {
            rootUri: '/mock/repo',
            mainSiteRemote: {
                site: {
                    details: {
                        id: 'site-id',
                        name: 'Test Site',
                        host: 'bitbucket.org',
                        protocol: 'https',
                        product: { name: 'Bitbucket', key: 'bitbucket' },
                        avatarUrl: 'avatar.png',
                        baseLinkUrl: 'https://bitbucket.org',
                        baseApiUrl: 'https://api.bitbucket.org',
                        isCloud: true,
                        userId: 'user123',
                        credentialId: 'cred123',
                    },
                    ownerSlug: 'owner',
                    repoSlug: 'repo',
                },
                remote: {
                    name: 'origin',
                    fetchUrl: 'git@bitbucket.org:owner/repo.git',
                    pushUrl: 'git@bitbucket.org:owner/repo.git',
                    isReadOnly: false,
                },
            },
            siteRemotes: [],
        };

        // Mock PullRequest
        mockPullRequest = {
            site: {
                details: {
                    id: 'site-id',
                    name: 'Test Site',
                    host: 'bitbucket.org',
                    protocol: 'https',
                    product: { name: 'Bitbucket', key: 'bitbucket' },
                    avatarUrl: 'avatar.png',
                    baseLinkUrl: 'https://bitbucket.org',
                    baseApiUrl: 'https://api.bitbucket.org',
                    isCloud: true,
                    userId: 'user123',
                    credentialId: 'cred123',
                },
                ownerSlug: 'owner',
                repoSlug: 'repo',
            },
            data: {
                siteDetails: {
                    id: 'site-id',
                    name: 'Test Site',
                    host: 'bitbucket.org',
                    protocol: 'https',
                    product: { name: 'Bitbucket', key: 'bitbucket' },
                    avatarUrl: 'avatar.png',
                    baseLinkUrl: 'https://bitbucket.org',
                    baseApiUrl: 'https://api.bitbucket.org',
                    isCloud: true,
                    userId: 'user123',
                    credentialId: 'cred123',
                },
                id: 'pr-123',
                version: 1,
                url: 'https://bitbucket.org/owner/repo/pull-requests/123',
                author: {
                    accountId: 'author123',
                    displayName: 'Author Name',
                    emailAddress: 'author@example.com',
                    url: 'https://bitbucket.org/author',
                    avatarUrl: 'author-avatar.png',
                    mention: '@author',
                },
                participants: [],
                source: {
                    repo: {
                        id: 'repo-id',
                        name: 'repo',
                        displayName: 'Repository',
                        fullName: 'fork-owner/repo',
                        url: 'https://bitbucket.org/fork-owner/repo',
                        avatarUrl: 'repo-avatar.png',
                        issueTrackerEnabled: true,
                    },
                    branchName: 'feature-branch',
                    commitHash: 'def456',
                },
                destination: {
                    repo: {
                        id: 'repo-id',
                        name: 'repo',
                        displayName: 'Repository',
                        fullName: 'owner/repo',
                        url: 'https://bitbucket.org/owner/repo',
                        avatarUrl: 'repo-avatar.png',
                        issueTrackerEnabled: true,
                    },
                    branchName: 'main',
                    commitHash: 'abc123',
                },
                title: 'Test PR',
                htmlSummary: '<p>Test description</p>',
                rawSummary: 'Test description',
                ts: '2023-01-01T00:00:00Z',
                updatedTs: '2023-01-01T00:00:00Z',
                state: 'OPEN',
                closeSourceBranch: false,
                taskCount: 0,
                draft: false,
            },
            workspaceRepo: mockWorkspaceRepo,
        };

        mockGetRepositoryScm.mockReturnValue(mockRepository);
    });

    describe('checkout', () => {
        beforeEach(() => {
            mockParseGitUrl.mockReturnValue({
                name: 'fork-repo',
                owner: 'fork-owner',
                full_name: 'fork-owner/fork-repo',
                toString: jest.fn().mockReturnValue('git@bitbucket.org:fork-owner/fork-repo.git'),
                protocol: 'ssh',
            } as any);
        });

        it('should successfully checkout a ref without fork URL', async () => {
            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockRepository.fetch).toHaveBeenCalled();
            expect(mockRepository.checkout).toHaveBeenCalledWith('feature-branch');
            expect(result).toBe(true);
        });

        it('should successfully checkout a ref with fork URL', async () => {
            const forkCloneUrl = 'git@bitbucket.org:fork-owner/fork-repo.git';
            mockRepository.getConfig.mockResolvedValueOnce(''); // First call returns empty (no existing remote)

            const result = await checkout(mockWorkspaceRepo, 'feature-branch', forkCloneUrl);

            expect(mockParseGitUrl).toHaveBeenCalledWith(forkCloneUrl);
            expect(mockRepository.addRemote).toHaveBeenCalledWith('fork-repo', forkCloneUrl);
            expect(mockRepository.fetch).toHaveBeenCalledWith('fork-repo', 'feature-branch');
            expect(mockRepository.checkout).toHaveBeenCalledWith('feature-branch');
            expect(result).toBe(true);
        });

        it('should pull if branch is behind', async () => {
            // Create a new mock state with behind property
            const newState = {
                ...mockRepository.state,
                HEAD: {
                    ...mockRepository.state.HEAD!,
                    behind: 2,
                },
            };

            // Replace the entire state object
            Object.defineProperty(mockRepository, 'state', {
                value: newState,
                writable: true,
            });

            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockRepository.fetch).toHaveBeenCalled();
            expect(mockRepository.checkout).toHaveBeenCalledWith('feature-branch');
            expect(mockRepository.pull).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should handle checkout error with uncommitted changes', async () => {
            const error = {
                stderr: 'Your local changes to the following files would be overwritten by checkout',
            };
            mockRepository.checkout.mockRejectedValueOnce(error);
            mockWindow.showInformationMessage.mockResolvedValueOnce('Stash changes and try again' as any);

            // Mock the second checkout attempt to succeed
            mockRepository.checkout.mockResolvedValueOnce(undefined);

            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Checkout Failed: You have uncommitted changes',
                'Stash changes and try again',
                'Dismiss',
            );
            expect(mockCommands.executeCommand).toHaveBeenCalledWith('git.stash');
            expect(mockRepository.checkout).toHaveBeenCalledTimes(2);
            expect(result).toBe(true);
        });

        it('should handle checkout error when user dismisses stash dialog', async () => {
            const error = {
                stderr: 'Your local changes to the following files would be overwritten by checkout',
            };
            mockRepository.checkout.mockRejectedValueOnce(error);
            mockWindow.showInformationMessage.mockResolvedValueOnce('Dismiss' as any);

            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Checkout Failed: You have uncommitted changes',
                'Stash changes and try again',
                'Dismiss',
            );
            expect(mockCommands.executeCommand).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should handle other checkout errors', async () => {
            const error = {
                stderr: 'Some other git error',
            };
            mockRepository.checkout.mockRejectedValueOnce(error);

            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Some other git error', 'Dismiss');
            expect(result).toBe(false);
        });

        it('should not add remote if fork URL is empty', async () => {
            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockParseGitUrl).not.toHaveBeenCalled();
            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });

    describe('checkoutPRBranch', () => {
        it('should successfully checkout PR branch', async () => {
            mockParseGitUrl.mockReturnValue({
                name: 'fork-repo',
                owner: 'fork-owner',
                full_name: 'fork-owner/fork-repo',
                toString: jest.fn().mockReturnValue('git@bitbucket.org:fork-owner/fork-repo.git'),
                protocol: 'ssh',
            } as any);
            mockUrlForRemote.mockReturnValue('git@bitbucket.org:owner/repo.git');

            const result = await checkoutPRBranch(mockPullRequest, 'feature-branch');

            expect(result).toBe(true);
            expect(mockRepository.checkout).toHaveBeenCalledWith('feature-branch');
        });

        it('should handle error when no workspace repo', async () => {
            const prWithoutWorkspace = {
                ...mockPullRequest,
                workspaceRepo: undefined,
            };

            const result = await checkoutPRBranch(prWithoutWorkspace, 'feature-branch');

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Error checking out the pull request branch: no workspace repo',
                'Dismiss',
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                new Error('Error checking out the pull request branch: no workspace repo'),
            );
            expect(result).toBe(false);
        });

        it('should not add source remote if source and destination repos are the same', async () => {
            const prSameRepo = {
                ...mockPullRequest,
                data: {
                    ...mockPullRequest.data,
                    source: {
                        ...mockPullRequest.data.source,
                        repo: {
                            ...mockPullRequest.data.source.repo,
                            url: 'https://bitbucket.org/owner/repo',
                        },
                    },
                },
            };

            const result = await checkoutPRBranch(prSameRepo, 'feature-branch');

            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should not add source remote if source repo URL is empty', async () => {
            const prEmptySourceUrl = {
                ...mockPullRequest,
                data: {
                    ...mockPullRequest.data,
                    source: {
                        ...mockPullRequest.data.source,
                        repo: {
                            ...mockPullRequest.data.source.repo,
                            url: '',
                        },
                    },
                },
            };

            const result = await checkoutPRBranch(prEmptySourceUrl, 'feature-branch');

            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });

    describe('addSourceRemoteIfNeededForPR', () => {
        beforeEach(() => {
            mockParseGitUrl.mockReturnValue({
                name: 'fork-repo',
                owner: 'fork-owner',
                full_name: 'fork-owner/fork-repo',
                toString: jest.fn().mockReturnValue('git@bitbucket.org:fork-owner/fork-repo.git'),
                protocol: 'ssh',
            } as any);
            mockUrlForRemote.mockReturnValue('git@bitbucket.org:owner/repo.git');
        });

        it('should add source remote for fork PR', async () => {
            await addSourceRemoteIfNeededForPR(mockPullRequest);

            expect(mockParseGitUrl).toHaveBeenCalledTimes(2); // Once for main remote, once for source
            expect(mockUrlForRemote).toHaveBeenCalledWith(mockWorkspaceRepo.mainSiteRemote.remote);
            expect(mockRepository.addRemote).toHaveBeenCalledWith(
                'fork-owner/repo',
                'git@bitbucket.org:fork-owner/fork-repo.git',
            );
            expect(mockRepository.fetch).toHaveBeenCalledWith('fork-owner/repo', 'feature-branch');
        });

        it('should handle Bitbucket Server personal repositories with ~ character', async () => {
            const prWithTildeRepo = {
                ...mockPullRequest,
                data: {
                    ...mockPullRequest.data,
                    source: {
                        ...mockPullRequest.data.source,
                        repo: {
                            ...mockPullRequest.data.source.repo,
                            fullName: '~username/repo',
                        },
                    },
                },
            };

            await addSourceRemoteIfNeededForPR(prWithTildeRepo);

            expect(mockRepository.addRemote).toHaveBeenCalledWith(
                '__username/repo',
                'git@bitbucket.org:fork-owner/fork-repo.git',
            );
        });

        it('should not add remote if PR has no workspace repo', async () => {
            const prWithoutWorkspace = {
                ...mockPullRequest,
                workspaceRepo: undefined,
            };

            await addSourceRemoteIfNeededForPR(prWithoutWorkspace);

            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(mockRepository.fetch).not.toHaveBeenCalled();
        });

        it('should not add remote if source and destination repos are the same', async () => {
            const prSameRepo = {
                ...mockPullRequest,
                data: {
                    ...mockPullRequest.data,
                    source: {
                        ...mockPullRequest.data.source,
                        repo: {
                            ...mockPullRequest.data.source.repo,
                            url: 'https://bitbucket.org/owner/repo',
                        },
                    },
                },
            };

            await addSourceRemoteIfNeededForPR(prSameRepo);

            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(mockRepository.fetch).not.toHaveBeenCalled();
        });

        it('should not add remote if source repo URL is empty', async () => {
            const prEmptySourceUrl = {
                ...mockPullRequest,
                data: {
                    ...mockPullRequest.data,
                    source: {
                        ...mockPullRequest.data.source,
                        repo: {
                            ...mockPullRequest.data.source.repo,
                            url: '',
                        },
                    },
                },
            };

            await addSourceRemoteIfNeededForPR(prEmptySourceUrl);

            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(mockRepository.fetch).not.toHaveBeenCalled();
        });

        it('should not add remote if existing remote already exists', async () => {
            mockRepository.getConfig.mockResolvedValueOnce('git@bitbucket.org:fork-owner/fork-repo.git');

            await addSourceRemoteIfNeededForPR(mockPullRequest);

            expect(mockRepository.addRemote).not.toHaveBeenCalled();
            expect(mockRepository.fetch).toHaveBeenCalledWith('fork-owner/repo', 'feature-branch');
        });

        it('should add remote if getConfig throws error', async () => {
            mockRepository.getConfig.mockRejectedValueOnce(new Error('Config not found'));

            await addSourceRemoteIfNeededForPR(mockPullRequest);

            expect(mockRepository.addRemote).toHaveBeenCalledWith(
                'fork-owner/repo',
                'git@bitbucket.org:fork-owner/fork-repo.git',
            );
            expect(mockRepository.fetch).toHaveBeenCalledWith('fork-owner/repo', 'feature-branch');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle missing repository SCM', async () => {
            mockGetRepositoryScm.mockReturnValue(undefined);

            await expect(checkout(mockWorkspaceRepo, 'feature-branch', '')).rejects.toThrow();
        });

        it('should handle fetch errors gracefully', async () => {
            const fetchError = { stderr: 'Fetch failed' };
            mockRepository.fetch.mockRejectedValueOnce(fetchError);

            const result = await checkout(mockWorkspaceRepo, 'feature-branch', '');

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Fetch failed', 'Dismiss');
            expect(result).toBe(false);
        });

        it('should preserve protocol when building source remote URL', async () => {
            // Mock the parsed object that gets modified in sourceRemoteForPullRequest
            const mockParsedUrl = {
                name: 'repo',
                owner: 'owner',
                full_name: 'owner/repo',
                toString: jest.fn().mockReturnValue('https://bitbucket.org/fork-owner/fork-repo.git'),
                protocol: 'https',
            };

            // Mock parseGitUrl for main remote
            mockParseGitUrl.mockReturnValueOnce(mockParsedUrl as any);

            // Mock parseGitUrl for source repo URL parsing
            mockParseGitUrl.mockReturnValueOnce({
                name: 'fork-repo',
                owner: 'fork-owner',
                full_name: 'fork-owner/fork-repo',
                toString: jest.fn(),
                protocol: 'https',
            } as any);

            mockUrlForRemote.mockReturnValue('https://bitbucket.org/owner/repo.git');

            await addSourceRemoteIfNeededForPR(mockPullRequest);

            expect(mockRepository.addRemote).toHaveBeenCalledWith(
                'fork-owner/repo',
                'https://bitbucket.org/fork-owner/fork-repo.git',
            );
        });
    });
});
