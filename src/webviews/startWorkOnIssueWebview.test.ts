import { createEmptyMinimalIssue, MinimalIssue, Status, Transition } from '@atlassianlabs/jira-pi-common-models';
import orderBy from 'lodash.orderby';
import { OpenJiraIssueAction } from 'src/ipc/issueActions';
import { expansionCastTo } from 'testsutil/miscFunctions';
import { env, Uri, Webview, WebviewPanel } from 'vscode';

import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../atlclients/authInfo';
import * as bbUtils from '../bitbucket/bbUtils';
import { assignIssue } from '../commands/jira/assignIssue';
import { Container } from '../container';
import * as fetchIssue from '../jira/fetchIssue';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { Resources } from '../resources';
import { Branch, RefType, Repository, RepositoryState } from '../typings/git';
import { AbstractReactWebview } from './abstractWebview';
import { StartWorkOnIssueWebview } from './startWorkOnIssueWebview';

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
        bitbucketContext: {
            getAllRepositories: jest.fn().mockReturnValue([]),
            getRepositoryScm: jest.fn(),
        },
        jiraActiveIssueStatusBar: {
            handleActiveIssueChange: jest.fn(),
        },
        pmfStats: {
            touchActivity: jest.fn(),
        },
    },
}));

jest.mock('../jira/fetchIssue', () => ({
    fetchMinimalIssue: jest.fn(),
}));

jest.mock('../jira/transitionIssue', () => ({
    transitionIssue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../commands/jira/assignIssue', () => ({
    assignIssue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../commands/jira/showIssue', () => ({
    showIssue: jest.fn(),
}));

jest.mock('../bitbucket/bbUtils', () => ({
    clientForSite: jest.fn(),
}));

jest.mock('../resources', () => ({
    Resources: {
        icons: {
            get: jest.fn(),
        },
        html: {
            get: jest.fn(() => '<html></html>'),
        },
    },
    iconSet: {
        JIRAICON: 'jira-icon',
    },
}));

jest.mock('../logger', () => ({
    Logger: {
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// this mocks the base class AbstractReactWebview
jest.mock('./abstractWebview', () => {
    class AbstractReactWebview {
        constructor() {}
        createOrShow() {
            return undefined;
        }
        onMessageReceived() {
            return Promise.resolve(false);
        }
        formatErrorReason() {
            return 'reason';
        }
        postMessage() {
            return false;
        }
    }
    return { AbstractReactWebview };
});

jest.mock('lodash.orderby', () => ({
    default: jest.fn((collection: any) => collection),
}));

describe('StartWorkOnIssueWebview', () => {
    let startWorkOnIssueWebview: StartWorkOnIssueWebview;
    const extensionPath = '/path/to/extension';

    const mockSiteDetails = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Jira Site',
        avatarUrl: 'avatar-url',
        userId: 'user-1',
        baseLinkUrl: 'https://test-jira.com',
        baseApiUrl: 'https://test-jira.com/rest/api/2',
        isCloud: true,
        product: ProductJira,
    });

    const mockIssue = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key: 'TEST-123',
        id: 'issue-123',
        summary: 'Test Issue',
        siteDetails: mockSiteDetails,
        status: expansionCastTo<Status>({ id: 'status-1', name: 'To Do' }),
        transitions: [
            expansionCastTo<Transition>({
                id: 'transition-1',
                name: 'Start Progress',
                isInitial: true,
                to: expansionCastTo<Status>({ id: 'status-2', name: 'In Progress' }),
            }),
        ],
    });

    const mockRepository = expansionCastTo<Repository>({
        rootUri: expansionCastTo<Uri>({ toString: () => '/path/to/repo' }),
        state: expansionCastTo<RepositoryState>({
            remotes: [{ name: 'origin', fetchUrl: 'https://bitbucket.org/test/repo.git', isReadOnly: true }],
            submodules: [],
        }),
        fetch: jest.fn().mockResolvedValue(undefined),
        getBranch: jest.fn(),
        getBranches: jest.fn().mockResolvedValue([]),
        checkout: jest.fn().mockResolvedValue(undefined),
        createBranch: jest.fn().mockResolvedValue(undefined),
        push: jest.fn().mockResolvedValue(undefined),
    });

    const mockWorkspaceRepo = {
        rootUri: '/path/to/repo',
        siteRemotes: [
            {
                remote: { name: 'origin', fetchUrl: 'https://bitbucket.org/test/repo.git' },
                site: {
                    ownerSlug: 'test',
                    repoSlug: 'repo',
                    details: { isCloud: true },
                },
            },
        ],
        mainSiteRemote: {
            remote: { name: 'origin', fetchUrl: 'https://bitbucket.org/test/repo.git' },
            site: {
                ownerSlug: 'test',
                repoSlug: 'repo',
                details: { isCloud: true },
            },
        },
    };

    // Mock BitbucketApi methods
    const mockBitbucketApi = {
        repositories: {
            get: jest.fn().mockResolvedValue({ url: 'https://bitbucket.org/test/repo' }),
            getDevelopmentBranch: jest.fn().mockResolvedValue('main'),
            getBranchingModel: jest.fn().mockResolvedValue({
                branch_types: [
                    { kind: 'feature', prefix: 'feature/' },
                    { kind: 'bugfix', prefix: 'bugfix/' },
                ],
            }),
        },
    };

    const mockPanel = expansionCastTo<WebviewPanel>({
        webview: expansionCastTo<Webview>({
            asWebviewUri: jest.fn(),
        }),
        reveal: jest.fn(),
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Create instance of StartWorkOnIssueWebview
        startWorkOnIssueWebview = new StartWorkOnIssueWebview(extensionPath);

        // Setup default mocks
        (Container.bitbucketContext.getAllRepositories as jest.Mock).mockReturnValue([mockWorkspaceRepo]);
        (Container.bitbucketContext.getRepositoryScm as jest.Mock).mockReturnValue(mockRepository);
        (bbUtils.clientForSite as jest.Mock).mockResolvedValue(mockBitbucketApi);

        // Mock postMessage implementation
        (startWorkOnIssueWebview as any).postMessage = jest.fn();

        // Mock the webview panel
        startWorkOnIssueWebview['_panel'] = mockPanel;
    });

    describe('Constructor and Properties', () => {
        test('should initialize with empty issue', () => {
            expect(startWorkOnIssueWebview['_state']).toEqual(createEmptyMinimalIssue(emptySiteInfo));
        });

        test('should have correct title', () => {
            expect(startWorkOnIssueWebview.title).toBe('Start work on Jira Issue');
        });

        test('should have correct id', () => {
            expect(startWorkOnIssueWebview.id).toBe('startWorkOnIssueScreen');
        });

        test('should return site details from state', () => {
            startWorkOnIssueWebview['_state'] = mockIssue;
            expect(startWorkOnIssueWebview.siteOrUndefined).toBe(mockSiteDetails);
        });

        test('should return Jira product', () => {
            expect(startWorkOnIssueWebview.productOrUndefined).toBe(ProductJira);
        });
    });

    describe('setIconPath', () => {
        test('should set icon path correctly', () => {
            startWorkOnIssueWebview.setIconPath();

            expect(Resources.icons.get).toHaveBeenCalledWith('jira-icon');
        });
    });

    describe('createOrShowIssue', () => {
        test('should create or show panel and initialize with issue data', async () => {
            const createOrShowSpy = jest.spyOn(AbstractReactWebview.prototype, 'createOrShow');
            const initializeSpy = jest.spyOn(startWorkOnIssueWebview, 'initialize').mockImplementation(async () => {});

            await startWorkOnIssueWebview.createOrShowIssue(mockIssue);

            expect(createOrShowSpy).toHaveBeenCalled();
            expect(initializeSpy).toHaveBeenCalledWith(mockIssue);
        });
    });

    describe('initialize', () => {
        test('should update state and post message with empty issue when issue key is different', async () => {
            startWorkOnIssueWebview['_state'] = { ...mockIssue, key: 'TEST-456' };
            const updateIssueSpy = jest
                .spyOn(startWorkOnIssueWebview, 'updateIssue')
                .mockImplementation(async () => {});
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.initialize(mockIssue);

            expect(postMessageSpy).toHaveBeenCalledWith({
                type: 'update',
                issue: createEmptyMinimalIssue(emptySiteInfo),
                repoData: [],
            });
            expect(updateIssueSpy).toHaveBeenCalledWith(mockIssue);
        });

        test('should only update issue when issue key is the same', async () => {
            startWorkOnIssueWebview['_state'] = { ...mockIssue };
            const updateIssueSpy = jest
                .spyOn(startWorkOnIssueWebview, 'updateIssue')
                .mockImplementation(async () => {});
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.initialize(mockIssue);

            expect(postMessageSpy).not.toHaveBeenCalled();
            expect(updateIssueSpy).toHaveBeenCalledWith(mockIssue);
        });
    });

    describe('invalidate', () => {
        test('should fetch and update issue', async () => {
            startWorkOnIssueWebview['_state'] = mockIssue;
            (fetchIssue.fetchMinimalIssue as jest.Mock).mockResolvedValue(mockIssue);
            const updateIssueSpy = jest
                .spyOn(startWorkOnIssueWebview, 'updateIssue')
                .mockImplementation(async () => {});

            await startWorkOnIssueWebview.invalidate();

            expect(fetchIssue.fetchMinimalIssue).toHaveBeenCalledWith('TEST-123', mockSiteDetails);
            expect(updateIssueSpy).toHaveBeenCalledWith(mockIssue);
        });

        test('should handle error correctly', async () => {
            startWorkOnIssueWebview['_state'] = mockIssue;
            const error = new Error('Test error');
            (fetchIssue.fetchMinimalIssue as jest.Mock).mockRejectedValue(error);
            const formatErrorSpy = jest
                .spyOn(AbstractReactWebview.prototype as any, 'formatErrorReason')
                .mockReturnValue('Formatted error');
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.invalidate();

            expect(Logger.error).toHaveBeenCalledWith(error, 'StartWorkOnIssueWebview.forceUpdateIssue');
            expect(formatErrorSpy).toHaveBeenCalledWith(error);
            expect(postMessageSpy).toHaveBeenCalledWith({ type: 'error', reason: 'Formatted error' });
        });

        test('should do nothing if issue key is empty', async () => {
            startWorkOnIssueWebview['_state'] = createEmptyMinimalIssue(emptySiteInfo);
            const updateIssueSpy = jest.spyOn(startWorkOnIssueWebview, 'updateIssue');

            await startWorkOnIssueWebview.invalidate();

            expect(fetchIssue.fetchMinimalIssue).not.toHaveBeenCalled();
            expect(updateIssueSpy).not.toHaveBeenCalled();
        });
    });

    describe('updateIssue', () => {
        test('should update state and panel title', async () => {
            //startWorkOnIssueWebview['_panel'] = { title: '' } as unknown as WebviewPanel;

            await startWorkOnIssueWebview.updateIssue(mockIssue);

            expect(startWorkOnIssueWebview['_state']).toBe(mockIssue);
            expect(startWorkOnIssueWebview['_panel']!.title).toBe('Start work on TEST-123');
        });

        test('should prepare repository data for all workspace repos', async () => {
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.updateIssue(mockIssue);

            expect(bbUtils.clientForSite).toHaveBeenCalled();
            expect(mockRepository.fetch).toHaveBeenCalled();
            expect(mockBitbucketApi.repositories.get).toHaveBeenCalled();
            expect(mockBitbucketApi.repositories.getDevelopmentBranch).toHaveBeenCalled();
            expect(mockBitbucketApi.repositories.getBranchingModel).toHaveBeenCalled();
            expect(postMessageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    issue: expect.any(Object),
                    repoData: expect.any(Array),
                }),
            );
        });

        test('should update transitions to prefer in-progress status', async () => {
            // Setup a mock issue with multiple transitions
            const issueWithTransitions = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
                ...mockIssue,
                transitions: [
                    expansionCastTo<Transition>({
                        id: 'trans-1',
                        name: 'Start Progress',
                        isInitial: false,
                        to: expansionCastTo<Status>({ id: 'status-2', name: 'In Progress' }),
                    }),
                    expansionCastTo<Transition>({
                        id: 'trans-2',
                        name: 'Block',
                        isInitial: false,
                        to: expansionCastTo<Status>({ id: 'status-3', name: 'Blocked' }),
                    }),
                ],
            });

            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.updateIssue(issueWithTransitions);

            // Verify that the message sent has the in-progress transition as the status
            const messageArg = postMessageSpy.mock.calls[0][0] as any;
            expect(messageArg.issue.status.name).toBe('In Progress');
        });

        test('should handle repositories with submodules', async () => {
            // Setup a repo with submodules
            const repoWithSubmodules = {
                ...mockWorkspaceRepo,
                rootUri: '/path/to/repo-with-submodules',
            };

            const repoScmWithSubmodules = {
                ...mockRepository,
                state: {
                    ...mockRepository.state,
                    submodules: [{ name: 'sub1', path: 'submodule1' }],
                },
            };

            (Container.bitbucketContext.getAllRepositories as jest.Mock).mockReturnValue([
                mockWorkspaceRepo,
                repoWithSubmodules,
            ]);
            (Container.bitbucketContext.getRepositoryScm as jest.Mock).mockImplementation((uri) =>
                uri === '/path/to/repo-with-submodules' ? repoScmWithSubmodules : mockRepository,
            );

            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.updateIssue(mockIssue);

            const messageArg = postMessageSpy.mock.calls[0][0] as any;

            // Verify repos with submodules are ordered first
            expect(orderBy).toHaveBeenCalledWith(messageArg.repoData, 'hasSubmodules', 'desc');

            // but we've actually mocked orderBy, so the sorting isn't happening
            expect(messageArg.repoData[0].hasSubmodules).toBe(false);
            expect(messageArg.repoData[1].hasSubmodules).toBe(true);
        });

        test('should handle errors during repo processing', async () => {
            // Mock an error during repository processing
            (bbUtils.clientForSite as jest.Mock).mockRejectedValue(new Error('API error'));
            jest.spyOn(startWorkOnIssueWebview as any, 'formatErrorReason').mockReturnValue('Formatted error');
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.updateIssue(mockIssue);

            expect(Logger.error).toHaveBeenCalled();
            expect(postMessageSpy).toHaveBeenCalledWith({ type: 'error', reason: 'Formatted error' });
        });

        test('should do nothing if already refreshing', async () => {
            startWorkOnIssueWebview['isRefeshing'] = true;
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview.updateIssue(mockIssue);

            expect(postMessageSpy).not.toHaveBeenCalled();
            // Reset for other tests
            startWorkOnIssueWebview['isRefeshing'] = false;
        });
    });

    describe('onMessageReceived', () => {
        test('should handle refreshIssue action', async () => {
            const forceUpdateSpy = jest
                .spyOn(startWorkOnIssueWebview as any, 'forceUpdateIssue')
                .mockResolvedValue(undefined);

            const result = await startWorkOnIssueWebview['onMessageReceived']({ action: 'refreshIssue' });

            expect(result).toBe(true);
            expect(forceUpdateSpy).toHaveBeenCalled();
        });

        test('should handle openJiraIssue action', async () => {
            const { showIssue } = require('../commands/jira/showIssue');

            const action: OpenJiraIssueAction = {
                action: 'openJiraIssue',
                issueOrKey: mockIssue,
            };
            const result = await startWorkOnIssueWebview['onMessageReceived'](action);

            expect(result).toBe(true);
            expect(showIssue).toHaveBeenCalledWith(mockIssue);
        });

        test('should handle copyJiraIssueLink action', async () => {
            const clipboardWriteTextSpy = jest.spyOn(env.clipboard, 'writeText').mockResolvedValue(undefined);
            startWorkOnIssueWebview['_state'] = mockIssue;

            const result = await startWorkOnIssueWebview['onMessageReceived']({ action: 'copyJiraIssueLink' });

            expect(result).toBe(true);
            expect(clipboardWriteTextSpy).toHaveBeenCalledWith('https://test-jira.com/browse/TEST-123');
        });

        test('should handle startWork action', async () => {
            startWorkOnIssueWebview['_state'] = mockIssue;

            // Define startWork action
            const startWorkAction = {
                action: 'startWork',
                setupBitbucket: true,
                repoUri: '/path/to/repo',
                targetBranchName: 'feature/TEST-123-test-issue',
                sourceBranch: {
                    name: 'main',
                    type: RefType.Head,
                },
                remoteName: 'origin',
                pushBranchToRemote: true,
                setupJira: true,
                transition: mockIssue.transitions[0],
            };

            // Mock branch creation
            const createOrCheckoutBranchSpy = jest
                .spyOn(startWorkOnIssueWebview, 'createOrCheckoutBranch')
                .mockResolvedValue(undefined);

            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview['onMessageReceived'](startWorkAction);

            // Verify that all operations were called
            expect(createOrCheckoutBranchSpy).toHaveBeenCalled();
            expect(assignIssue).toHaveBeenCalledWith(mockIssue, 'user-1');
            expect(transitionIssue).toHaveBeenCalledWith(mockIssue, startWorkAction.transition, {
                source: 'startWork',
            });
            expect(postMessageSpy).toHaveBeenCalledWith({
                type: 'startWorkOnIssueResult',
                successMessage: expect.stringContaining('Assigned the issue to you'),
            });
        });

        test('should handle startWork action errors', async () => {
            startWorkOnIssueWebview['_state'] = mockIssue;

            // Define startWork action
            const startWorkAction = {
                action: 'startWork',
                setupBitbucket: true,
                repoUri: '/path/to/repo',
                targetBranchName: 'feature/TEST-123-test-issue',
                sourceBranch: {
                    name: 'main',
                    type: RefType.Head,
                },
                remoteName: 'origin',
                pushBranchToRemote: false,
                setupJira: false,
                transition: mockIssue.transitions[0],
            };

            // Mock error during branch creation
            const error = new Error('Branch creation failed');
            jest.spyOn(startWorkOnIssueWebview, 'createOrCheckoutBranch').mockRejectedValue(error);

            const formatErrorSpy = jest
                .spyOn(AbstractReactWebview.prototype as any, 'formatErrorReason')
                .mockReturnValue('Formatted error');
            const postMessageSpy = jest.spyOn(startWorkOnIssueWebview as any, 'postMessage');

            await startWorkOnIssueWebview['onMessageReceived'](startWorkAction);

            expect(formatErrorSpy).toHaveBeenCalledWith(error);
            expect(postMessageSpy).toHaveBeenCalledWith({ type: 'error', reason: 'Formatted error' });
        });

        test('should pass unhandled actions to parent', async () => {
            const superOnMessageSpy = jest
                .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(startWorkOnIssueWebview)), 'onMessageReceived')
                .mockResolvedValue(true);

            const result = await startWorkOnIssueWebview['onMessageReceived']({ action: 'unknownAction' });

            expect(superOnMessageSpy).toHaveBeenCalledWith({ action: 'unknownAction' });
            expect(result).toBe(true);
        });
    });

    describe('createOrCheckoutBranch', () => {
        test('should checkout existing local branch', async () => {
            (mockRepository.getBranch as jest.Mock).mockImplementation((name) => {
                if (name === 'feature/TEST-123') {
                    return Promise.resolve({ name: 'feature/TEST-123' });
                }
                return Promise.reject(new Error('Branch not found'));
            });

            await startWorkOnIssueWebview.createOrCheckoutBranch(
                mockRepository,
                'feature/TEST-123',
                { name: 'main', type: RefType.Head } as Branch,
                'origin',
                false,
            );

            expect(mockRepository.checkout).toHaveBeenCalledWith('feature/TEST-123');
            expect(mockRepository.createBranch).not.toHaveBeenCalled();
            expect(mockRepository.push).not.toHaveBeenCalled();
        });

        test('should checkout existing remote branch', async () => {
            // First getBranch call for local branch fails, second for remote succeeds
            (mockRepository.getBranch as jest.Mock)
                .mockImplementationOnce(() => Promise.reject(new Error('Local branch not found')))
                .mockImplementation((name) => {
                    if (name === 'remotes/origin/feature/TEST-123') {
                        return Promise.resolve({ name: 'remotes/origin/feature/TEST-123' });
                    }
                    return Promise.reject(new Error('Branch not found'));
                });

            await startWorkOnIssueWebview.createOrCheckoutBranch(
                mockRepository,
                'feature/TEST-123',
                { name: 'main', type: RefType.Head } as Branch,
                'origin',
                false,
            );

            expect(mockRepository.checkout).toHaveBeenCalledWith('feature/TEST-123');
            expect(mockRepository.createBranch).not.toHaveBeenCalled();
            expect(mockRepository.push).not.toHaveBeenCalled();
        });

        test('should create new branch from local source', async () => {
            // Both getBranch calls fail
            (mockRepository.getBranch as jest.Mock).mockRejectedValue(new Error('Branch not found'));

            await startWorkOnIssueWebview.createOrCheckoutBranch(
                mockRepository,
                'feature/TEST-123',
                { name: 'main', type: RefType.Head } as Branch,
                'origin',
                false,
            );

            expect(mockRepository.createBranch).toHaveBeenCalledWith('feature/TEST-123', true, 'main');
            expect(mockRepository.push).not.toHaveBeenCalled();
        });

        test('should create new branch from remote source and push', async () => {
            // Both getBranch calls fail
            (mockRepository.getBranch as jest.Mock).mockRejectedValue(new Error('Branch not found'));

            await startWorkOnIssueWebview.createOrCheckoutBranch(
                mockRepository,
                'feature/TEST-123',
                { name: 'origin/main', type: RefType.RemoteHead } as Branch,
                'origin',
                true,
            );

            expect(mockRepository.createBranch).toHaveBeenCalledWith('feature/TEST-123', true, 'remotes/origin/main');
            expect(mockRepository.push).toHaveBeenCalledWith('origin', 'feature/TEST-123', true);
        });
    });
});
