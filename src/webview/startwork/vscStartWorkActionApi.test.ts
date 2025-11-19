import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, emptyRepo, Repo, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { ConfigSection, ConfigSubSection, ConfigV3Section, ConfigV3SubSection } from '../../lib/ipc/models/config';
import { Logger } from '../../logger';
import { Branch, RefType } from '../../typings/git';
import { Experiments } from '../../util/featureFlags';
import { VSCStartWorkActionApi } from './vscStartWorkActionApi';

// Mock external dependencies
jest.mock('../../logger');
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../container');
jest.mock('../../util/featureFlags', () => ({
    FeatureFlagClient: {
        checkGate: jest.fn(),
        checkExperimentValue: jest.fn(),
    },
    Features: {
        StartWorkV3: 'startWorkV3',
    },
    Experiments: {
        AtlascodeNewSettingsExperiment: 'atlascode_new_settings_experiment',
    },
}));

describe('VSCStartWorkActionApi', () => {
    let api: VSCStartWorkActionApi;
    let mockBitbucketContext: any;
    let mockClientManager: any;
    let mockSettingsWebviewFactory: any;
    let mockStartWorkWebviewFactory: any;
    let mockConfig: any;
    let mockScm: any;
    let mockJiraClient: any;
    let mockBbClient: any;

    const mockSiteInfo: DetailedSiteInfo = {
        id: 'test-site-id',
        host: 'test.atlassian.net',
        userId: 'test-user-id',
        name: 'Test Site',
        avatarUrl: 'https://test.atlassian.net/avatar',
        product: ProductJira,
        isCloud: true,
        credentialId: 'test-credential-id',
        baseLinkUrl: 'https://test.atlassian.net',
        baseApiUrl: 'https://test.atlassian.net/rest/api/2',
    };

    const mockBitbucketSite: BitbucketSite = {
        details: mockSiteInfo,
        ownerSlug: 'test-owner',
        repoSlug: 'test-repo',
    };

    const mockWorkspaceRepo: WorkspaceRepo = {
        rootUri: '/test/repo',
        mainSiteRemote: {
            site: mockBitbucketSite,
            remote: {
                name: 'origin',
                fetchUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                pushUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                isReadOnly: false,
            },
        },
        siteRemotes: [],
    };

    const mockRepo: Repo = {
        id: 'test-repo-id',
        scm: undefined,
        name: 'test-repo',
        displayName: 'Test Repo',
        fullName: 'test-owner/test-repo',
        parentFullName: undefined,
        url: 'https://bitbucket.org/test-owner/test-repo',
        avatarUrl: 'https://bitbucket.org/test-owner/test-repo/avatar',
        mainbranch: 'main',
        developmentBranch: undefined,
        branchingModel: undefined,
        issueTrackerEnabled: false,
    };

    const mockBranch: Branch = {
        name: 'feature/test-branch',
        commit: 'abc123',
        ahead: 0,
        behind: 0,
        remote: 'origin',
        type: RefType.Head,
        upstream: undefined,
    };

    // Use partial types to avoid complex mock setup
    const mockMinimalIssue = {
        id: 'test-issue-id',
        key: 'TEST-123',
        summary: 'Test Issue',
        siteDetails: mockSiteInfo,
        status: {
            id: 'in-progress',
            name: 'In Progress',
        },
    } as MinimalIssue<DetailedSiteInfo>;

    const mockTransition = {
        id: 'transition-id',
        name: 'Start Progress',
        to: {
            id: 'in-progress',
            name: 'In Progress',
        },
    } as Transition;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock SCM methods
        mockScm = {
            getConfig: jest.fn(),
            getGlobalConfig: jest.fn(),
            getBranches: jest.fn(),
            state: { submodules: [], HEAD: { name: 'main' } },
            fetch: jest.fn(),
            getBranch: jest.fn(),
            checkout: jest.fn(),
            createBranch: jest.fn(),
            push: jest.fn(),
        };

        // Mock Jira client
        mockJiraClient = {
            assignIssue: jest.fn(),
            transitionIssue: jest.fn(),
        };

        // Mock Bitbucket client
        mockBbClient = {
            repositories: {
                get: jest.fn(),
            },
        };

        // Mock client manager
        mockClientManager = {
            jiraClient: jest.fn().mockResolvedValue(mockJiraClient),
        };

        // Mock bitbucket context
        mockBitbucketContext = {
            getAllRepositories: jest.fn(),
            getRepositoryScm: jest.fn().mockReturnValue(mockScm),
        };

        // Mock settings webview factory
        mockSettingsWebviewFactory = {
            createOrShow: jest.fn(),
        };

        // Mock start work webview factory
        mockStartWorkWebviewFactory = {
            hide: jest.fn(),
        };

        // Mock config
        mockConfig = {
            jira: {
                startWorkBranchTemplate: {
                    customTemplate: 'feature/{issueKey}-{summary}',
                    customPrefixes: ['feature/', 'bugfix/', 'hotfix/'],
                },
            },
        };

        // Mock Container
        (Container as any).bitbucketContext = mockBitbucketContext;
        (Container as any).clientManager = mockClientManager;
        (Container as any).settingsWebviewFactory = mockSettingsWebviewFactory;
        (Container as any).startWorkWebviewFactory = mockStartWorkWebviewFactory;
        (Container as any).config = mockConfig;

        // Mock clientForSite
        (clientForSite as jest.Mock).mockResolvedValue(mockBbClient);

        (Container.featureFlagClient as any) = {
            checkGate: jest.fn().mockReturnValue(false),
            checkExperimentValue: jest.fn().mockImplementation((experiment) => {
                if (experiment === Experiments.AtlascodeNewSettingsExperiment) {
                    return true;
                }
                return false;
            }),
        };

        api = new VSCStartWorkActionApi();
    });

    describe('getWorkspaceRepos', () => {
        it('should return workspace repositories from bitbucket context', () => {
            const mockRepos = [mockWorkspaceRepo];
            mockBitbucketContext.getAllRepositories.mockReturnValue(mockRepos);

            const result = api.getWorkspaceRepos();

            expect(result).toEqual(mockRepos);
            expect(mockBitbucketContext.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when bitbucket context is undefined', () => {
            (Container as any).bitbucketContext = undefined;

            const result = api.getWorkspaceRepos();

            expect(result).toEqual([]);
        });

        it('should return empty array when getAllRepositories returns undefined', () => {
            mockBitbucketContext.getAllRepositories.mockReturnValue(undefined);

            const result = api.getWorkspaceRepos();

            expect(result).toEqual([]);
        });
    });

    describe('getRepoDetails', () => {
        it('should return repo details from bitbucket client', async () => {
            mockBbClient.repositories.get.mockResolvedValue(mockRepo);

            const result = await api.getRepoDetails(mockWorkspaceRepo);

            expect(result).toEqual(mockRepo);
            expect(clientForSite).toHaveBeenCalledWith(mockBitbucketSite);
            expect(mockBbClient.repositories.get).toHaveBeenCalledWith(mockBitbucketSite);
        });

        it('should return empty repo when site is not found', async () => {
            const wsRepoWithoutSite = {
                ...mockWorkspaceRepo,
                mainSiteRemote: {
                    ...mockWorkspaceRepo.mainSiteRemote,
                    site: undefined,
                },
            };

            const result = await api.getRepoDetails(wsRepoWithoutSite);

            expect(result).toEqual(emptyRepo);
            expect(Logger.debug).toHaveBeenCalledWith("JS-1324 No site found for repo with URI '/test/repo'");
        });
    });

    describe('getRepoScmState', () => {
        beforeEach(() => {
            mockScm.getConfig.mockImplementation((key: string) => {
                if (key === 'user.name') {
                    return Promise.resolve('Test User');
                }
                if (key === 'user.email') {
                    return Promise.resolve('test@example.com');
                }
                return Promise.resolve(undefined);
            });

            mockScm.getGlobalConfig.mockImplementation((key: string) => {
                if (key === 'user.name') {
                    return Promise.resolve('Global User');
                }
                if (key === 'user.email') {
                    return Promise.resolve('global@example.com');
                }
                return Promise.resolve(undefined);
            });

            mockScm.getBranches.mockImplementation(({ remote }: { remote: boolean }) => {
                if (remote) {
                    return Promise.resolve([{ ...mockBranch, name: 'origin/main', type: RefType.RemoteHead }]);
                }
                return Promise.resolve([mockBranch]);
            });
        });

        it('should return SCM state with local user config', async () => {
            const result = await api.getRepoScmState(mockWorkspaceRepo);

            expect(result).toEqual({
                userName: 'Test User',
                userEmail: 'test@example.com',
                localBranches: [mockBranch],
                remoteBranches: [{ ...mockBranch, name: 'origin/main', type: RefType.RemoteHead }],
                hasSubmodules: false,
                currentBranch: 'main',
            });
        });

        it('should fallback to global config when local config is not available', async () => {
            mockScm.getConfig.mockResolvedValue(undefined);

            const result = await api.getRepoScmState(mockWorkspaceRepo);

            expect(result).toEqual({
                userName: 'Global User',
                userEmail: 'global@example.com',
                localBranches: [mockBranch],
                remoteBranches: [{ ...mockBranch, name: 'origin/main', type: RefType.RemoteHead }],
                hasSubmodules: false,
                currentBranch: 'main',
            });
        });

        it('should detect submodules when present', async () => {
            mockScm.state.submodules = [{ name: 'submodule1' }];

            const result = await api.getRepoScmState(mockWorkspaceRepo);

            expect(result.hasSubmodules).toBe(true);
        });
    });

    describe('assignAndTransitionIssue', () => {
        it('should assign issue to user', async () => {
            await api.assignAndTransitionIssue(mockMinimalIssue);

            expect(mockClientManager.jiraClient).toHaveBeenCalledWith(mockSiteInfo);
            expect(mockJiraClient.assignIssue).toHaveBeenCalledWith('TEST-123', 'test-user-id');
        });

        it('should transition issue when transition is provided and status is different', async () => {
            const issueWithDifferentStatus = {
                ...mockMinimalIssue,
                status: {
                    id: 'to-do',
                    name: 'To Do',
                },
            } as MinimalIssue<DetailedSiteInfo>;

            await api.assignAndTransitionIssue(issueWithDifferentStatus, mockTransition);

            expect(mockJiraClient.assignIssue).toHaveBeenCalledWith('TEST-123', 'test-user-id');
            expect(mockJiraClient.transitionIssue).toHaveBeenCalledWith('TEST-123', 'transition-id');
        });

        it('should not transition issue when status is already the target status', async () => {
            const issueWithSameStatus = {
                ...mockMinimalIssue,
                status: {
                    id: 'in-progress',
                    name: 'In Progress',
                },
            } as MinimalIssue<DetailedSiteInfo>;

            await api.assignAndTransitionIssue(issueWithSameStatus, mockTransition);

            expect(mockJiraClient.assignIssue).toHaveBeenCalledWith('TEST-123', 'test-user-id');
            expect(mockJiraClient.transitionIssue).not.toHaveBeenCalled();
        });
    });

    describe('createOrCheckoutBranch', () => {
        const destinationBranch = 'feature/TEST-123';
        const sourceBranch = { ...mockBranch, name: 'main' };
        const remote = 'origin';

        it('should checkout existing local branch', async () => {
            mockScm.getBranch.mockResolvedValueOnce(mockBranch);

            await api.createOrCheckoutBranch(mockWorkspaceRepo, destinationBranch, sourceBranch, remote, false);

            expect(mockScm.fetch).toHaveBeenCalledWith(remote, sourceBranch.name);
            expect(mockScm.getBranch).toHaveBeenCalledWith(destinationBranch);
            expect(mockScm.checkout).toHaveBeenCalledWith(destinationBranch);
            expect(mockScm.createBranch).not.toHaveBeenCalled();
        });

        it('should checkout existing remote branch', async () => {
            mockScm.getBranch.mockRejectedValueOnce(new Error('Branch not found')).mockResolvedValueOnce(mockBranch);

            await api.createOrCheckoutBranch(mockWorkspaceRepo, destinationBranch, sourceBranch, remote, false);

            expect(mockScm.getBranch).toHaveBeenCalledWith(destinationBranch);
            expect(mockScm.getBranch).toHaveBeenCalledWith(`remotes/${remote}/${destinationBranch}`);
            expect(mockScm.checkout).toHaveBeenCalledWith(destinationBranch);
            expect(mockScm.createBranch).not.toHaveBeenCalled();
        });

        it('should create new branch when no existing branch exists', async () => {
            mockScm.getBranch.mockRejectedValue(new Error('Branch not found'));

            await api.createOrCheckoutBranch(mockWorkspaceRepo, destinationBranch, sourceBranch, remote, false);

            expect(mockScm.createBranch).toHaveBeenCalledWith(destinationBranch, true, sourceBranch.name);
            expect(mockScm.push).not.toHaveBeenCalled();
        });

        it('should create new branch and push to remote when requested', async () => {
            mockScm.getBranch.mockRejectedValue(new Error('Branch not found'));

            await api.createOrCheckoutBranch(mockWorkspaceRepo, destinationBranch, sourceBranch, remote, true);

            expect(mockScm.createBranch).toHaveBeenCalledWith(destinationBranch, true, sourceBranch.name);
            expect(mockScm.push).toHaveBeenCalledWith(remote, destinationBranch, true);
        });

        it('should handle remote branch as source', async () => {
            const remoteBranch = { ...sourceBranch, type: RefType.RemoteHead };
            mockScm.getBranch.mockRejectedValue(new Error('Branch not found'));

            await api.createOrCheckoutBranch(mockWorkspaceRepo, destinationBranch, remoteBranch, remote, false);

            expect(mockScm.createBranch).toHaveBeenCalledWith(destinationBranch, true, `remotes/${remoteBranch.name}`);
        });
    });

    describe('getStartWorkConfig', () => {
        it('should return start work branch template config', () => {
            const result = api.getStartWorkConfig();

            expect(result).toEqual({
                customTemplate: 'feature/{issueKey}-{summary}',
                customPrefixes: ['feature/', 'bugfix/', 'hotfix/'],
            });
        });
    });

    describe('openSettings', () => {
        it('should open settings webview with section and subsection when experiment is enabled', () => {
            // Mock experiment to return true
            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            api.openSettings(ConfigV3Section.AdvancedConfig, ConfigV3SubSection.StartWork);

            expect(Container.featureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodeNewSettingsExperiment,
            );
            expect(mockSettingsWebviewFactory.createOrShow).toHaveBeenCalledWith({
                section: ConfigV3Section.AdvancedConfig,
                subSection: ConfigV3SubSection.StartWork,
            });
        });

        it('should open settings webview with section and subsection when experiment is disabled', () => {
            // Mock experiment to return false
            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(false);

            api.openSettings(ConfigSection.Jira, ConfigSubSection.StartWork);

            expect(Container.featureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodeNewSettingsExperiment,
            );
            expect(mockSettingsWebviewFactory.createOrShow).toHaveBeenCalledWith({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.StartWork,
            });
        });
    });

    describe('closePage', () => {
        it('should hide start work webview', () => {
            api.closePage();

            expect(mockStartWorkWebviewFactory.hide).toHaveBeenCalledTimes(1);
        });
    });
});
