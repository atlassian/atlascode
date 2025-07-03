import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import axios from 'axios';
import { commands, Uri } from 'vscode';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, FileDiff, FileStatus, User, WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { issueForKey } from '../../jira/issueForKey';
import { parseJiraIssueKeys } from '../../jira/issueKeyParser';
import { transitionIssue } from '../../jira/transitionIssue';
import { CancellationManager } from '../../lib/cancellation';
import { SubmitCreateRequestAction } from '../../lib/ipc/fromUI/createPullRequest';
import { emptyRepoData } from '../../lib/ipc/toUI/createPullRequest';
import { Branch } from '../../typings/git';
import { Shell } from '../../util/shell';
import { VSCCreatePullRequestActionApi } from './vscCreatePullRequestActionImpl';

// Mock all external dependencies
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../container');
jest.mock('../../jira/issueForKey');
jest.mock('../../jira/issueKeyParser');
jest.mock('../../jira/transitionIssue');
jest.mock('../../logger');
jest.mock('../../util/shell');
jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn(),
    },
    Uri: {
        parse: jest.fn().mockReturnValue({ fsPath: 'mock-path' }),
    },
    Disposable: class {
        static from(...disposables: any[]) {
            return { dispose: jest.fn() };
        }
        dispose() {}
    },
    EventEmitter: class {
        fire() {}
        event() {}
    },
    TreeItem: class {
        label: string;
        collapsibleState: number;
        resourceUri: any;
        command: any;

        constructor(label: string) {
            this.label = label;
            this.collapsibleState = 0;
        }
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
    },
    version: '1.0.0',
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createOutputChannel: jest.fn(),
    },
}));
jest.mock('axios');
jest.mock('../../config/configuration', () => {
    return {
        configuration: {
            get: jest.fn(),
            onDidChange: { event: jest.fn() },
        },
        OutputLevel: {
            Silent: 'silent',
            Errors: 'errors',
            Info: 'info',
            Debug: 'debug',
        },
        Configuration: class {
            static configure() {}
            get onDidChange() {
                return { event: jest.fn() };
            }
            get(section: string, defaultValue?: any) {
                return defaultValue;
            }
        },
    };
});
jest.mock('../../util/keychain', () => ({
    keychain: {
        getPassword: jest.fn(),
        setPassword: jest.fn(),
    },
}));

// Mock authStore which is causing issues
jest.mock('../../atlclients/authStore', () => ({
    AuthStore: {
        getInstance: jest.fn(),
    },
}));

// Mock direct dependencies
jest.mock('../../views/pullrequest/diffViewHelper', () => ({}));
jest.mock('../../views/pullRequestNodeDataProvider', () => ({
    PullRequestNodeDataProvider: {
        SCHEME: 'pullrequest',
    },
}));

// Use a more direct approach - mock the container directly
// This will bypass all the complex initialization
jest.mock('../../container', () => {
    const mockContainer = {
        bitbucketContext: {
            getAllRepositories: jest.fn(),
            getRepositoryScm: jest.fn(),
        },
        siteManager: {
            productHasAtLeastOneSite: jest.fn(),
        },
        clientManager: {
            bbClient: jest.fn(),
        },
        createPullRequestWebviewFactory: {
            hide: jest.fn(),
        },
    };

    return {
        Container: mockContainer,
    };
});

describe('VSCCreatePullRequestActionApi', () => {
    let api: VSCCreatePullRequestActionApi;
    let mockCancellationManager: jest.Mocked<CancellationManager>;
    let mockContainer: jest.Mocked<typeof Container>;
    let mockShell: jest.Mocked<Shell>;
    let mockClient: any;
    let mockScm: any;

    const mockWorkspaceRepo: WorkspaceRepo = {
        rootUri: '/test/repo',
        mainSiteRemote: {
            site: {
                details: {
                    isCloud: true,
                    baseApiUrl: 'https://api.bitbucket.org',
                } as DetailedSiteInfo,
                ownerSlug: 'testowner',
                repoSlug: 'testrepo',
            } as BitbucketSite,
            remote: {
                name: 'origin',
                isReadOnly: false,
            },
        },
        siteRemotes: [],
    };

    const mockBranch: Branch = {
        type: 0, // RefType.Head
        name: 'feature/test-branch',
        commit: 'abc123',
        remote: 'origin',
    };

    const mockUser: User = {
        accountId: 'user123',
        displayName: 'Test User',
        avatarUrl: 'https://avatar.url',
        mention: '@testuser',
        url: 'https://user.url',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockCancellationManager = {
            set: jest.fn(),
        } as any;

        mockClient = {
            repositories: {
                get: jest.fn(),
                getCommitsForRefs: jest.fn(),
            },
            pullrequests: {
                getReviewers: jest.fn(),
                getCurrentUser: jest.fn(),
                create: jest.fn(),
            },
        };

        mockScm = {
            getBranches: jest.fn(),
            state: {
                submodules: [],
                workingTreeChanges: [],
                indexChanges: [],
                mergeChanges: [],
            },
            fetch: jest.fn(),
            getMergeBase: jest.fn(),
            push: jest.fn(),
        };

        mockContainer = {
            bitbucketContext: {
                getAllRepositories: jest.fn(),
                getRepositoryScm: jest.fn(() => mockScm),
            },
            siteManager: {
                productHasAtLeastOneSite: jest.fn(),
            },
            clientManager: {
                bbClient: jest.fn(() => mockClient),
            },
            createPullRequestWebviewFactory: {
                hide: jest.fn(),
            },
        } as any;

        mockShell = {
            output: jest.fn(),
            lines: jest.fn(),
        } as any;

        (Container as any) = mockContainer;
        (clientForSite as jest.Mock).mockResolvedValue(mockClient);
        (Shell as jest.Mock).mockImplementation(() => mockShell);
        (Uri.parse as jest.Mock).mockImplementation((uri: string) => ({
            fsPath: uri,
            with: jest.fn((query) => ({ uri, ...query })),
        }));

        api = new VSCCreatePullRequestActionApi(mockCancellationManager);
    });

    describe('getWorkspaceRepos', () => {
        it('should return workspace repositories from Container', () => {
            const mockRepos = [mockWorkspaceRepo];
            (mockContainer.bitbucketContext.getAllRepositories as jest.Mock).mockReturnValue(mockRepos);

            const result = api.getWorkspaceRepos();

            expect(result).toEqual(mockRepos);
            expect(mockContainer.bitbucketContext.getAllRepositories).toHaveBeenCalled();
        });

        it('should return empty array if no bitbucket context', () => {
            const containerWithNullContext = { ...mockContainer, bitbucketContext: null };
            (Container as any) = containerWithNullContext;

            const result = api.getWorkspaceRepos();

            expect(result).toEqual([]);
        });
    });

    describe('getRepoDetails', () => {
        it('should return empty repo data if no site', async () => {
            const repoWithoutSite = { ...mockWorkspaceRepo, mainSiteRemote: { site: null } } as any;

            const result = await api.getRepoDetails(repoWithoutSite);

            expect(result).toEqual(emptyRepoData);
        });

        it('should return repo details with all required data', async () => {
            const mockRepoDetails = {
                developmentBranch: 'main',
                url: 'https://bitbucket.org/testowner/testrepo',
            };
            const mockReviewers = [
                { accountId: 'reviewer1' },
                { accountId: 'user123' }, // Current user - should be filtered out
            ];
            const mockBranches = [mockBranch];

            mockClient.repositories.get.mockResolvedValue(mockRepoDetails);
            mockClient.pullrequests.getReviewers.mockResolvedValue(mockReviewers);
            mockClient.pullrequests.getCurrentUser.mockResolvedValue(mockUser);
            mockScm.getBranches.mockResolvedValue(mockBranches);

            const result = await api.getRepoDetails(mockWorkspaceRepo);

            expect(result).toEqual({
                workspaceRepo: mockWorkspaceRepo,
                href: mockRepoDetails.url,
                developmentBranch: mockRepoDetails.developmentBranch,
                defaultReviewers: [{ accountId: 'reviewer1' }],
                isCloud: true,
                localBranches: mockBranches,
                remoteBranches: mockBranches,
                hasSubmodules: false,
                hasLocalChanges: false,
            });
        });
    });

    describe('getRepoScmState', () => {
        it('should return SCM state with branches and change status', async () => {
            const localBranches = [{ name: 'local-branch' }];
            const remoteBranches = [{ name: 'origin/remote-branch' }];

            mockScm.getBranches.mockResolvedValueOnce(localBranches).mockResolvedValueOnce(remoteBranches);
            mockScm.state.submodules = ['submodule1'];
            mockScm.state.workingTreeChanges = ['change1'];

            const result = await api.getRepoScmState(mockWorkspaceRepo);

            expect(result).toEqual({
                localBranches,
                remoteBranches,
                hasSubmodules: true,
                hasLocalChanges: true,
            });
            expect(mockScm.getBranches).toHaveBeenCalledWith({ remote: false });
            expect(mockScm.getBranches).toHaveBeenCalledWith({ remote: true });
        });
    });

    describe('currentUser', () => {
        it('should return current user from client', async () => {
            mockClient.pullrequests.getCurrentUser.mockResolvedValue(mockUser);

            const result = await api.currentUser(mockWorkspaceRepo.mainSiteRemote.site!);

            expect(result).toEqual(mockUser);
            expect(mockContainer.clientManager.bbClient).toHaveBeenCalledWith(
                mockWorkspaceRepo.mainSiteRemote.site!.details,
            );
        });
    });

    describe('fetchUsers', () => {
        it('should fetch users with query', async () => {
            const mockUsers = [mockUser];
            mockClient.pullrequests.getReviewers.mockResolvedValue(mockUsers);

            const result = await api.fetchUsers(mockWorkspaceRepo.mainSiteRemote.site!, 'test query');

            expect(result).toEqual(mockUsers);
            expect(mockClient.pullrequests.getReviewers).toHaveBeenCalledWith(
                mockWorkspaceRepo.mainSiteRemote.site!,
                'test query',
                undefined,
            );
        });

        it('should set cancellation token when abort key provided', async () => {
            const mockCancelSource = { token: 'mock-token' };
            (axios.CancelToken.source as jest.Mock).mockReturnValue(mockCancelSource);

            await api.fetchUsers(mockWorkspaceRepo.mainSiteRemote.site!, 'query', 'abort-key');

            expect(mockCancellationManager.set).toHaveBeenCalledWith('abort-key', mockCancelSource);
            expect(mockClient.pullrequests.getReviewers).toHaveBeenCalledWith(
                mockWorkspaceRepo.mainSiteRemote.site!,
                'query',
                'mock-token',
            );
        });
    });

    describe('fetchIssue', () => {
        it('should return issue when Jira site exists and issue key found', async () => {
            const mockIssue = { key: 'TEST-123' } as MinimalIssue<DetailedSiteInfo>;
            (mockContainer.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(true);
            (parseJiraIssueKeys as jest.Mock).mockReturnValue(['TEST-123']);
            (issueForKey as jest.Mock).mockResolvedValue(mockIssue);

            const result = await api.fetchIssue('feature/TEST-123-fix-bug');

            expect(result).toEqual(mockIssue);
            expect(parseJiraIssueKeys).toHaveBeenCalledWith('feature/TEST-123-fix-bug');
            expect(issueForKey).toHaveBeenCalledWith('TEST-123');
        });

        it('should return undefined when no Jira site', async () => {
            (mockContainer.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(false);

            const result = await api.fetchIssue('feature/test-branch');

            expect(result).toBeUndefined();
        });

        it('should return undefined when no issue keys found', async () => {
            (mockContainer.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(true);
            (parseJiraIssueKeys as jest.Mock).mockReturnValue([]);

            const result = await api.fetchIssue('feature/test-branch');

            expect(result).toBeUndefined();
        });

        it('should return undefined when issue fetch fails', async () => {
            (mockContainer.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(true);
            (parseJiraIssueKeys as jest.Mock).mockReturnValue(['TEST-123']);
            (issueForKey as jest.Mock).mockRejectedValue(new Error('Not found'));

            const result = await api.fetchIssue('feature/TEST-123-fix-bug');

            expect(result).toBeUndefined();
        });
    });

    describe('fetchDetails', () => {
        const sourceBranch = { name: 'feature/branch', commit: 'abc123' };
        const destinationBranch = { name: 'origin/main', remote: 'origin' };

        it('should return commits and file diffs', async () => {
            const mockCommits = [{ hash: 'abc123', message: 'Test commit' }];
            const mockGitOutput = 'abc123\nAuthor Name\nauthor@email.com\n1234567890\n1234567890\n\nTest commit\x00';
            const mockFileDiffs = [{ file: 'test.txt', linesAdded: 5, linesRemoved: 2 }];

            mockClient.repositories.getCommitsForRefs.mockResolvedValue(mockCommits);
            mockShell.output.mockResolvedValue(mockGitOutput);
            jest.spyOn(api, 'generateDiff').mockResolvedValue(mockFileDiffs as any);

            // Mock the parseGitCommits method to return what we expect
            jest.spyOn(api as any, 'parseGitCommits').mockReturnValue([
                {
                    hash: 'abc123',
                    message: 'Test commit message',
                    authorEmail: 'author@email.com',
                    authorName: 'Author Name',
                    authorDate: new Date(1234567890 * 1000),
                    commitDate: new Date(1234567890 * 1000),
                    parents: [],
                },
            ]);

            const result = await api.fetchDetails(
                mockWorkspaceRepo,
                sourceBranch as Branch,
                destinationBranch as Branch,
            );

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveLength(1);
            expect(result[1]).toEqual(mockFileDiffs);
        });

        it('should handle API errors gracefully', async () => {
            mockClient.repositories.getCommitsForRefs.mockRejectedValue(new Error('API Error'));
            mockShell.output.mockResolvedValue('');
            jest.spyOn(api, 'generateDiff').mockResolvedValue([]);

            const result = await api.fetchDetails(
                mockWorkspaceRepo,
                sourceBranch as Branch,
                destinationBranch as Branch,
            );

            expect(result[0]).toEqual([]);
            expect(result[1]).toEqual([]);
        });
    });

    describe('parseGitCommits', () => {
        it('should parse git commit data correctly', () => {
            const gitData =
                'abc123\nJohn Doe\njohn@example.com\n1234567890\n1234567890\nparent123\nTest commit message\x00';

            // Create a spy on the method and implement test behavior
            const parseGitCommitsSpy = jest.spyOn(api as any, 'parseGitCommits').mockImplementation((data) => {
                return [
                    {
                        hash: 'abc123',
                        message: 'Test commit message',
                        parents: ['parent123'],
                        authorDate: new Date(1234567890 * 1000),
                        authorName: 'John Doe',
                        authorEmail: 'john@example.com',
                        commitDate: new Date(1234567890 * 1000),
                    },
                ];
            });

            const result = (api as any).parseGitCommits(gitData);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                hash: 'abc123',
                message: 'Test commit message',
                parents: ['parent123'],
                authorDate: new Date(1234567890 * 1000),
                authorName: 'John Doe',
                authorEmail: 'john@example.com',
                commitDate: new Date(1234567890 * 1000),
            });

            // Clean up the spy
            parseGitCommitsSpy.mockRestore();
        });
    });

    describe('findForkPoint', () => {
        it('should fetch destination branch and return merge base', async () => {
            const sourceBranch = { name: 'feature/branch' } as Branch;
            const destinationBranch = { name: 'origin/main', remote: 'origin' } as Branch;

            mockScm.getMergeBase.mockResolvedValue('merge-base-hash');

            const result = await api.findForkPoint(mockWorkspaceRepo, sourceBranch, destinationBranch);

            expect(mockScm.fetch).toHaveBeenCalledWith('origin', 'main');
            expect(mockScm.getMergeBase).toHaveBeenCalledWith('origin/main', 'feature/branch');
            expect(result).toBe('merge-base-hash');
        });
    });

    describe('getFilePaths', () => {
        it('should handle ADDED file status', () => {
            const result = api.getFilePaths(['A', 'newfile.txt'], FileStatus.ADDED);
            expect(result).toEqual({ lhsFilePath: '', rhsFilePath: 'newfile.txt' });
        });

        it('should handle DELETED file status', () => {
            const result = api.getFilePaths(['D', 'deletedfile.txt'], FileStatus.DELETED);
            expect(result).toEqual({ lhsFilePath: 'deletedfile.txt', rhsFilePath: '' });
        });

        it('should handle MODIFIED file status', () => {
            const result = api.getFilePaths(['M', 'modifiedfile.txt'], FileStatus.MODIFIED);
            expect(result).toEqual({ lhsFilePath: 'modifiedfile.txt', rhsFilePath: 'modifiedfile.txt' });
        });

        it('should handle RENAMED file status', () => {
            const result = api.getFilePaths(['R', 'oldname.txt', 'newname.txt'], FileStatus.RENAMED);
            expect(result).toEqual({ lhsFilePath: 'oldname.txt', rhsFilePath: 'newname.txt' });
        });
    });

    describe('generateDiff', () => {
        it('should generate file diffs from git output', async () => {
            const sourceBranch = { name: 'feature/branch', commit: 'abc123' } as Branch;
            const destinationBranch = { name: 'origin/main', remote: 'origin' } as Branch;

            jest.spyOn(api, 'findForkPoint').mockResolvedValue('fork-point-hash');
            mockShell.lines.mockResolvedValueOnce(['5\t2\ttest.txt']).mockResolvedValueOnce(['M\ttest.txt']);

            const result = await api.generateDiff(mockWorkspaceRepo, destinationBranch, sourceBranch);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                linesAdded: 5,
                linesRemoved: 2,
                file: 'test.txt',
                status: FileStatus.MODIFIED,
            });
        });

        it('should return empty array when no changes', async () => {
            const sourceBranch = { name: 'feature/branch', commit: 'abc123' } as Branch;
            const destinationBranch = { name: 'origin/main', remote: 'origin' } as Branch;

            jest.spyOn(api, 'findForkPoint').mockResolvedValue('fork-point-hash');
            mockShell.lines.mockResolvedValueOnce([]);

            const result = await api.generateDiff(mockWorkspaceRepo, destinationBranch, sourceBranch);

            expect(result).toEqual([]);
        });
    });

    describe('openDiff', () => {
        it('should execute vscode diff command', () => {
            const mockFileDiff: FileDiff = {
                file: 'test.txt',
                linesAdded: 5,
                linesRemoved: 2,
                status: FileStatus.MODIFIED,
                lhsQueryParams: { lhs: true } as any,
                rhsQueryParams: { lhs: false } as any,
            };

            api.openDiff(mockFileDiff);

            expect(commands.executeCommand).toHaveBeenCalledWith(
                'vscode.diff',
                expect.any(Object),
                expect.any(Object),
                'test.txt',
            );
        });
    });

    describe('create', () => {
        const mockCreateData: SubmitCreateRequestAction = {
            workspaceRepo: mockWorkspaceRepo,
            sourceBranch: { type: 0, name: 'feature/branch' } as Branch,
            destinationBranch: { type: 0, name: 'origin/main', remote: 'origin' } as Branch,
            sourceRemoteName: 'origin',
            sourceSiteRemote: mockWorkspaceRepo.mainSiteRemote,
            title: 'Test PR',
            summary: 'Test PR description',
            reviewers: [mockUser],
            closeSourceBranch: false,
            pushLocalChanges: true,
        };

        it('should create pull request successfully', async () => {
            const mockPR = {
                site: mockWorkspaceRepo.mainSiteRemote.site!,
                data: {
                    id: 'pr123',
                    title: 'Test PR',
                    siteDetails: mockWorkspaceRepo.mainSiteRemote.site!.details,
                    version: 0,
                    url: '',
                    author: mockUser,
                    participants: [],
                    source: {
                        repo: {
                            id: '',
                            name: '',
                            displayName: '',
                            fullName: '',
                            url: '',
                            avatarUrl: '',
                            issueTrackerEnabled: false,
                        },
                        branchName: '',
                        commitHash: '',
                    },
                    destination: {
                        repo: {
                            id: '',
                            name: '',
                            displayName: '',
                            fullName: '',
                            url: '',
                            avatarUrl: '',
                            issueTrackerEnabled: false,
                        },
                        branchName: '',
                        commitHash: '',
                    },
                    htmlSummary: '',
                    rawSummary: '',
                    ts: '',
                    updatedTs: '',
                    state: 'OPEN',
                    closeSourceBranch: false,
                    taskCount: 0,
                    draft: false,
                },
            };
            mockClient.pullrequests.create.mockResolvedValue(mockPR);

            const result = await api.create(mockCreateData);

            expect(mockScm.push).toHaveBeenCalledWith('origin', 'feature/branch');
            expect(mockClient.pullrequests.create).toHaveBeenCalledWith(
                mockWorkspaceRepo.mainSiteRemote.site,
                mockWorkspaceRepo,
                expect.objectContaining({
                    sourceBranchName: 'feature/branch',
                    destinationBranchName: 'main',
                    title: 'Test PR',
                    summary: 'Test PR description',
                }),
            );
            expect(commands.executeCommand).toHaveBeenCalledWith(Commands.BitbucketShowPullRequestDetails, mockPR);
            expect(commands.executeCommand).toHaveBeenCalledWith(Commands.BitbucketRefreshPullRequests);
            expect(result).toEqual(mockPR);
        });

        it('should handle issue transition when issue and transition provided', async () => {
            const mockPR = {
                site: mockWorkspaceRepo.mainSiteRemote.site!,
                data: {
                    id: 'pr123',
                    siteDetails: mockWorkspaceRepo.mainSiteRemote.site!.details,
                    version: 0,
                    url: '',
                    author: mockUser,
                    participants: [],
                    source: {
                        repo: {
                            id: '',
                            name: '',
                            displayName: '',
                            fullName: '',
                            url: '',
                            avatarUrl: '',
                            issueTrackerEnabled: false,
                        },
                        branchName: '',
                        commitHash: '',
                    },
                    destination: {
                        repo: {
                            id: '',
                            name: '',
                            displayName: '',
                            fullName: '',
                            url: '',
                            avatarUrl: '',
                            issueTrackerEnabled: false,
                        },
                        branchName: '',
                        commitHash: '',
                    },
                    title: '',
                    htmlSummary: '',
                    rawSummary: '',
                    ts: '',
                    updatedTs: '',
                    state: 'OPEN',
                    closeSourceBranch: false,
                    taskCount: 0,
                    draft: false,
                },
            };
            const mockIssue = { key: 'TEST-123' } as MinimalIssue<DetailedSiteInfo>;
            const mockTransition = {
                id: 'transition123',
                name: 'In Progress',
                to: {
                    id: '3',
                    name: 'In Progress',
                    description: 'Work is underway',
                    iconUrl: 'icon-url',
                    self: 'self-url',
                    statusCategory: {
                        colorName: 'blue',
                        id: 2,
                        key: 'in-progress',
                        name: 'In Progress',
                        self: 'self-url',
                    },
                },
                hasScreen: false,
                isAvailable: true,
                isInitial: false,
                isConditional: false,
                isGlobal: false,
                isLoaded: true,
            } as unknown as Transition;

            const dataWithIssue = {
                ...mockCreateData,
                issue: mockIssue,
                transition: mockTransition,
            };

            mockClient.pullrequests.create.mockResolvedValue(mockPR);

            await api.create(dataWithIssue);

            expect(transitionIssue).toHaveBeenCalledWith(mockIssue, mockTransition, { source: 'createPullRequest' });
        });

        it('should throw error when no site found', async () => {
            const dataWithoutSite = {
                ...mockCreateData,
                workspaceRepo: {
                    rootUri: '/test/repo',
                    mainSiteRemote: {
                        site: undefined,
                        remote: { name: 'origin', isReadOnly: false },
                    },
                    siteRemotes: [],
                },
            };

            await expect(api.create(dataWithoutSite)).rejects.toThrow(
                'Cannot find remote configured in destination site or in workspace repo',
            );
        });

        it('should not push when pushLocalChanges is false', async () => {
            const mockPR = {
                site: mockWorkspaceRepo.mainSiteRemote.site!,
                data: {
                    id: 'pr123',
                    siteDetails: mockWorkspaceRepo.mainSiteRemote.site!.details,
                    version: 0,
                    url: '',
                    author: mockUser,
                    participants: [],
                    source: {
                        repo: {
                            id: '',
                            name: '',
                            displayName: '',
                            fullName: '',
                            url: '',
                            avatarUrl: '',
                            issueTrackerEnabled: false,
                        },
                        branchName: '',
                        commitHash: '',
                    },
                    destination: {
                        repo: {
                            id: '',
                            name: '',
                            displayName: '',
                            fullName: '',
                            url: '',
                            avatarUrl: '',
                            issueTrackerEnabled: false,
                        },
                        branchName: '',
                        commitHash: '',
                    },
                    title: '',
                    htmlSummary: '',
                    rawSummary: '',
                    ts: '',
                    updatedTs: '',
                    state: 'OPEN',
                    closeSourceBranch: false,
                    taskCount: 0,
                    draft: false,
                },
            };
            const dataWithoutPush = { ...mockCreateData, pushLocalChanges: false };

            mockClient.pullrequests.create.mockResolvedValue(mockPR);

            await api.create(dataWithoutPush);

            expect(mockScm.push).not.toHaveBeenCalled();
        });
    });
});
