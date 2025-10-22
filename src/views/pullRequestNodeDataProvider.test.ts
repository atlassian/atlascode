import { commands, TreeItem, Uri, window, workspace } from 'vscode';

import { prPaginationEvent, viewScreenEvent } from '../analytics';
import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { clientForSite } from '../bitbucket/bbUtils';
import { PaginatedPullRequests, WorkspaceRepo } from '../bitbucket/model';
import { configuration } from '../config/configuration';
import { Commands } from '../constants';
import { Container } from '../container';
import { GitContentProvider } from './gitContentProvider';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { emptyBitbucketNodes } from './nodes/definedNodes';
import { SimpleNode } from './nodes/simpleNode';
import { CreatePullRequestNode, PullRequestFilters, PullRequestHeaderNode } from './pullrequest/headerNode';
import { DescriptionNode, PullRequestTitlesNode } from './pullrequest/pullRequestNode';
import { RepositoriesNode } from './pullrequest/repositoriesNode';
import { PullRequestNodeDataProvider } from './pullRequestNodeDataProvider';

// Mock modules
jest.mock('../analytics');
jest.mock('../atlclients/authInfo');
jest.mock('../bitbucket/bbUtils');
jest.mock('../config/configuration');
jest.mock('../constants');
jest.mock('../container');
jest.mock('./gitContentProvider');
jest.mock('./nodes/definedNodes');
jest.mock('./pullrequest/headerNode');
jest.mock('./pullrequest/pullRequestNode');
jest.mock('./pullrequest/repositoriesNode');

describe('PullRequestNodeDataProvider', () => {
    let provider: PullRequestNodeDataProvider;
    let mockBitbucketContext: jest.Mocked<BitbucketContext>;
    let mockRepositoriesNode: jest.Mocked<RepositoriesNode>;
    let mockBbApi: any;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockPaginatedPRs: PaginatedPullRequests;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock VS Code APIs
        (commands.registerCommand as jest.Mock) = jest.fn().mockReturnValue({ dispose: jest.fn() });
        (workspace.registerTextDocumentContentProvider as jest.Mock) = jest
            .fn()
            .mockReturnValue({ dispose: jest.fn() });
        (window.showQuickPick as jest.Mock) = jest.fn();
        (commands.executeCommand as jest.Mock) = jest.fn();

        // Mock configuration
        (configuration.get as jest.Mock) = jest.fn().mockReturnValue(PullRequestFilters.Open);

        // Mock Container
        (Container.siteManager as any) = {
            getSitesAvailable: jest.fn().mockReturnValue(['site1']),
        };
        (Container.analyticsClient as any) = {
            sendUIEvent: jest.fn(),
            sendScreenEvent: jest.fn(),
        };

        // Mock BitbucketContext
        mockBitbucketContext = {
            getBitbucketRepositories: jest.fn().mockReturnValue([]),
            onDidChangeBitbucketContext: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        } as any;

        // Mock WorkspaceRepo
        mockWorkspaceRepo = {
            rootUri: '/test/repo',
            mainSiteRemote: {
                site: { name: 'test-site' },
            },
            siteRemotes: [],
        } as any;

        // Mock PaginatedPullRequests
        mockPaginatedPRs = {
            site: { name: 'test-site' },
            workspaceRepo: mockWorkspaceRepo,
            pullRequests: [],
            hasNext: false,
        } as any;

        // Mock BB API
        mockBbApi = {
            pullrequests: {
                nextPage: jest.fn().mockResolvedValue(mockPaginatedPRs),
                getList: jest.fn().mockResolvedValue(mockPaginatedPRs),
                getListCreatedByMe: jest.fn().mockResolvedValue(mockPaginatedPRs),
                getListToReview: jest.fn().mockResolvedValue(mockPaginatedPRs),
                getListMerged: jest.fn().mockResolvedValue(mockPaginatedPRs),
                getListDeclined: jest.fn().mockResolvedValue(mockPaginatedPRs),
            },
        };

        (clientForSite as jest.Mock) = jest.fn().mockResolvedValue(mockBbApi);

        // Mock RepositoriesNode
        const RepositoriesNodeMock = RepositoriesNode as jest.MockedClass<typeof RepositoriesNode>;
        mockRepositoriesNode = {
            dispose: jest.fn(),
            markDirty: jest.fn(),
            addItems: jest.fn(),
            findResource: jest.fn(),
            getChildren: jest.fn().mockResolvedValue([]),
        } as any;

        // Make sure instanceof checks work properly
        RepositoriesNodeMock.mockImplementation(() => mockRepositoriesNode);
        Object.setPrototypeOf(mockRepositoriesNode, RepositoriesNode.prototype);

        // Mock analytics functions
        (prPaginationEvent as jest.Mock) = jest.fn().mockResolvedValue({});
        (viewScreenEvent as jest.Mock) = jest.fn().mockResolvedValue({});

        provider = new PullRequestNodeDataProvider(mockBitbucketContext);
    });

    afterEach(() => {
        provider.dispose();
    });

    describe('constructor', () => {
        it('should initialize with default filter from configuration', () => {
            expect(configuration.get).toHaveBeenCalledWith('bitbucket.explorer.defaultPullRequestFilter');
        });

        it('should register commands and content provider', () => {
            expect(workspace.registerTextDocumentContentProvider).toHaveBeenCalledWith(
                PullRequestNodeDataProvider.SCHEME,
                expect.any(GitContentProvider),
            );
            expect(commands.registerCommand).toHaveBeenCalledTimes(8); // All command registrations
        });

        it('should listen to context changes', () => {
            expect(mockBitbucketContext.onDidChangeBitbucketContext).toHaveBeenCalled();
        });
    });

    describe('fetch', () => {
        it('should fetch open pull requests by default', async () => {
            // Ensure the header node has the correct filter type
            provider['_headerNode'].filterType = PullRequestFilters.Open;

            const result = await provider.fetch(mockWorkspaceRepo);

            expect(clientForSite).toHaveBeenCalledWith(mockWorkspaceRepo.mainSiteRemote.site);
            expect(mockBbApi.pullrequests.getList).toHaveBeenCalledWith(mockWorkspaceRepo);
            expect(result).toBe(mockPaginatedPRs);
        });

        it('should fetch pull requests created by me when filter is CreatedByMe', async () => {
            provider['_headerNode'].filterType = PullRequestFilters.CreatedByMe;

            await provider.fetch(mockWorkspaceRepo);

            expect(mockBbApi.pullrequests.getListCreatedByMe).toHaveBeenCalledWith(mockWorkspaceRepo);
        });

        it('should fetch pull requests to review when filter is ToReview', async () => {
            provider['_headerNode'].filterType = PullRequestFilters.ToReview;

            await provider.fetch(mockWorkspaceRepo);

            expect(mockBbApi.pullrequests.getListToReview).toHaveBeenCalledWith(mockWorkspaceRepo);
        });

        it('should fetch merged pull requests when filter is Merged', async () => {
            provider['_headerNode'].filterType = PullRequestFilters.Merged;

            await provider.fetch(mockWorkspaceRepo);

            expect(mockBbApi.pullrequests.getListMerged).toHaveBeenCalledWith(mockWorkspaceRepo);
        });

        it('should fetch declined pull requests when filter is Declined', async () => {
            provider['_headerNode'].filterType = PullRequestFilters.Declined;

            await provider.fetch(mockWorkspaceRepo);

            expect(mockBbApi.pullrequests.getListDeclined).toHaveBeenCalledWith(mockWorkspaceRepo);
        });
    });

    describe('refresh', () => {
        it('should update children and fire tree data change event', async () => {
            const fireEventSpy = jest.spyOn(provider['_onDidChangeTreeData'], 'fire');

            await provider.refresh();

            expect(fireEventSpy).toHaveBeenCalledWith(null);
        });
    });

    describe('refreshResource', () => {
        it('should refresh specific resource when found', async () => {
            const mockUri = Uri.parse('test://uri');
            const mockFoundItem = {} as AbstractBaseNode;
            const fireEventSpy = jest.spyOn(provider['_onDidChangeTreeData'], 'fire');

            mockRepositoriesNode.findResource.mockReturnValue(mockFoundItem);
            provider['_childrenMap'] = new Map([['test', mockRepositoriesNode]]);

            await provider.refreshResource(mockUri);

            expect(mockRepositoriesNode.findResource).toHaveBeenCalledWith(mockUri);
            expect(fireEventSpy).toHaveBeenCalledWith(mockFoundItem);
        });

        it('should do nothing when childrenMap is not initialized', async () => {
            const mockUri = Uri.parse('test://uri');
            provider['_childrenMap'] = undefined;

            await provider.refreshResource(mockUri);

            expect(mockRepositoriesNode.findResource).not.toHaveBeenCalled();
        });
    });

    describe('getChildren', () => {
        it('should return empty array when no sites are available', async () => {
            (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([]);

            const children = await provider.getChildren();

            expect(Container.siteManager.getSitesAvailable).toHaveBeenCalledWith(ProductBitbucket);
            expect(viewScreenEvent).toHaveBeenCalledWith(
                'pullRequestsTreeViewUnauthenticatedMessage',
                undefined,
                ProductBitbucket,
            );
            // Should return empty array to show viewsWelcome with login button
            expect(children).toEqual([]);
        });

        it('should return empty nodes when no repositories are found', async () => {
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([]);

            const children = await provider.getChildren();

            expect(viewScreenEvent).toHaveBeenCalledWith(
                'pullRequestsTreeViewNoReposFoundMessage',
                undefined,
                ProductBitbucket,
            );
            expect(children).toBe(emptyBitbucketNodes);
        });

        it('should return element children when element is provided', async () => {
            const mockElement = {
                getChildren: jest.fn().mockResolvedValue(['child1', 'child2']),
            } as any;
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);

            const children = await provider.getChildren(mockElement);

            expect(mockElement.getChildren).toHaveBeenCalled();
            expect(children).toEqual(['child1', 'child2']);
        });

        it('should return root children when no element is provided', async () => {
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
            provider['_childrenMap'] = new Map([['test', mockRepositoriesNode]]);

            const children = await provider.getChildren();

            expect(children).toHaveLength(3); // createPRNode, headerNode, and repos
            expect(children[0]).toBeInstanceOf(CreatePullRequestNode);
            expect(children[1]).toBeInstanceOf(PullRequestHeaderNode);
        });
    });

    describe('getTreeItem', () => {
        it('should return tree item from element', async () => {
            const mockElement = {
                getTreeItem: jest.fn().mockResolvedValue({ label: 'test' } as TreeItem),
            } as any;

            const treeItem = await provider.getTreeItem(mockElement);

            expect(mockElement.getTreeItem).toHaveBeenCalled();
            expect(treeItem).toEqual({ label: 'test' });
        });
    });

    describe('getFirstPullRequestNode', () => {
        it('should return first PR node when available', async () => {
            const mockPRNode = {} as PullRequestTitlesNode;
            mockRepositoriesNode.getChildren.mockResolvedValue([mockPRNode]);
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
            provider['_childrenMap'] = new Map([[mockWorkspaceRepo.rootUri, mockRepositoriesNode]]);

            const result = await provider.getFirstPullRequestNode(false);

            expect(result).toBe(mockPRNode);
        });

        it('should return first child when forceFocus is true and no PR nodes', async () => {
            const mockSimpleNode = {} as SimpleNode;
            mockRepositoriesNode.getChildren.mockResolvedValue([]);
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
            jest.spyOn(provider, 'getChildren').mockResolvedValue([mockSimpleNode]);

            const result = await provider.getFirstPullRequestNode(true);

            expect(result).toBe(mockSimpleNode);
        });

        it('should return undefined when no nodes and forceFocus is false', async () => {
            mockRepositoriesNode.getChildren.mockResolvedValue([]);
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
            provider['_childrenMap'] = new Map([['test', mockRepositoriesNode]]);

            const result = await provider.getFirstPullRequestNode(false);

            expect(result).toBeUndefined();
        });
    });

    describe('getCreatePullRequestNode', () => {
        it('should return create PR node when available', async () => {
            const mockCreatePRNode = new CreatePullRequestNode();
            jest.spyOn(provider, 'getChildren').mockResolvedValue([mockCreatePRNode]);

            const result = await provider.getCreatePullRequestNode(false);

            expect(result).toBe(mockCreatePRNode);
        });

        it('should return first child when forceFocus is true and no create PR node', async () => {
            const mockSimpleNode = {} as SimpleNode;
            jest.spyOn(provider, 'getChildren').mockResolvedValue([mockSimpleNode]);

            const result = await provider.getCreatePullRequestNode(true);

            expect(result).toBe(mockSimpleNode);
        });
    });

    describe('getDetailsNode', () => {
        it('should return first child as description node', async () => {
            const mockDescriptionNode = {} as DescriptionNode;
            const mockPRTitlesNode = {
                getChildren: jest.fn().mockResolvedValue([mockDescriptionNode]),
            } as any;

            const result = await provider.getDetailsNode(mockPRTitlesNode);

            expect(mockPRTitlesNode.getChildren).toHaveBeenCalled();
            expect(result).toBe(mockDescriptionNode);
        });
    });

    describe('addItems', () => {
        it('should add items to repository node and fire change event', () => {
            const fireEventSpy = jest.spyOn(provider['_onDidChangeTreeData'], 'fire');
            provider['_childrenMap'] = new Map([[mockWorkspaceRepo.rootUri, mockRepositoriesNode]]);

            provider.addItems(mockPaginatedPRs);

            expect(mockRepositoriesNode.addItems).toHaveBeenCalledWith(mockPaginatedPRs);
            expect(fireEventSpy).toHaveBeenCalledWith(null);
        });

        it('should do nothing when no workspace repo or children map', () => {
            const fireEventSpy = jest.spyOn(provider['_onDidChangeTreeData'], 'fire');
            const prsWithoutRepo = { ...mockPaginatedPRs, workspaceRepo: undefined };

            provider.addItems(prsWithoutRepo);

            expect(mockRepositoriesNode.addItems).not.toHaveBeenCalled();
            expect(fireEventSpy).not.toHaveBeenCalled();
        });
    });

    describe('updateChildren', () => {
        it('should create children map if not exists', async () => {
            provider['_childrenMap'] = undefined;
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([]);

            await provider['updateChildren']();

            expect(provider['_childrenMap']).toBeInstanceOf(Map);
        });

        it('should dispose removed repositories', async () => {
            const oldRepo = { rootUri: '/old/repo' } as WorkspaceRepo;
            const oldRepoNode = { dispose: jest.fn() } as any;
            provider['_childrenMap'] = new Map([[oldRepo.rootUri, oldRepoNode]]);
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);

            await provider['updateChildren']();

            expect(oldRepoNode.dispose).toHaveBeenCalled();
            expect(provider['_childrenMap'].has(oldRepo.rootUri)).toBe(false);
        });

        it('should add new repositories', async () => {
            provider['_childrenMap'] = new Map();
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);

            await provider['updateChildren']();

            expect(RepositoriesNode).toHaveBeenCalledWith(
                expect.any(Function),
                mockWorkspaceRepo,
                true, // preload when <= 3 repos
                true, // expand when single repo
            );
            expect(provider['_childrenMap'].has(mockWorkspaceRepo.rootUri)).toBe(true);
        });

        it('should mark existing repositories as dirty', async () => {
            provider['_childrenMap'] = new Map([[mockWorkspaceRepo.rootUri, mockRepositoriesNode]]);
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);

            await provider['updateChildren']();

            expect(mockRepositoriesNode.markDirty).toHaveBeenCalledWith(true);
        });

        it('should disable preloading when more than 3 repositories', async () => {
            const repos = Array.from({ length: 5 }, (_, i) => ({
                rootUri: `/repo${i}`,
                mainSiteRemote: { site: { name: 'site' } },
                siteRemotes: [],
            })) as unknown as WorkspaceRepo[];
            provider['_childrenMap'] = new Map();
            mockBitbucketContext.getBitbucketRepositories.mockReturnValue(repos);

            await provider['updateChildren']();

            expect(RepositoriesNode).toHaveBeenCalledWith(
                expect.any(Function),
                repos[0],
                false, // no preload when > 3 repos
                false, // no expand when multiple repos
            );
        });
    });

    describe('command handlers', () => {
        beforeEach(() => {
            // Reset and capture command registrations
            (commands.registerCommand as jest.Mock).mockClear();
            provider = new PullRequestNodeDataProvider(mockBitbucketContext);
        });

        it('should handle next page command', async () => {
            const [, nextPageHandler] = (commands.registerCommand as jest.Mock).mock.calls.find(
                (call) => call[0] === Commands.BitbucketPullRequestsNextPage,
            );

            await nextPageHandler(mockPaginatedPRs);

            expect(clientForSite).toHaveBeenCalledWith(mockPaginatedPRs.site);
            expect(mockBbApi.pullrequests.nextPage).toHaveBeenCalledWith(mockPaginatedPRs);
            expect(prPaginationEvent).toHaveBeenCalled();
        });

        it('should handle filter commands', () => {
            const filterCommands = [
                [Commands.BitbucketShowOpenPullRequests, PullRequestFilters.Open],
                [Commands.BitbucketShowPullRequestsCreatedByMe, PullRequestFilters.CreatedByMe],
                [Commands.BitbucketShowPullRequestsToReview, PullRequestFilters.ToReview],
                [Commands.BitbucketShowMergedPullRequests, PullRequestFilters.Merged],
                [Commands.BitbucketShowDeclinedPullRequests, PullRequestFilters.Declined],
            ];

            filterCommands.forEach(([command, expectedFilter]) => {
                const [, handler] = (commands.registerCommand as jest.Mock).mock.calls.find(
                    (call) => call[0] === command,
                );
                const refreshSpy = jest.spyOn(provider, 'refresh').mockImplementation();

                handler();

                expect(provider['_headerNode'].filterType).toBe(expectedFilter);
                expect(refreshSpy).toHaveBeenCalled();

                refreshSpy.mockRestore();
            });
        });

        it('should handle pull request filters quick pick command', async () => {
            const [, filtersHandler] = (commands.registerCommand as jest.Mock).mock.calls.find(
                (call) => call[0] === Commands.BitbucketPullRequestFilters,
            );

            (window.showQuickPick as jest.Mock).mockResolvedValue('Show all open pull requests');

            await filtersHandler();

            expect(window.showQuickPick).toHaveBeenCalledWith([
                'Show all open pull requests',
                'Show pull requests created by me',
                'Show pull requests to be reviewed',
                'Show merged pull requests',
                'Show declined pull requests',
            ]);
            expect(commands.executeCommand).toHaveBeenCalledWith(Commands.BitbucketShowOpenPullRequests);
        });
    });

    describe('dispose', () => {
        it('should dispose all resources', () => {
            const mockDisposable = { dispose: jest.fn() };
            provider['_disposable'] = mockDisposable as any;
            provider['_childrenMap'] = new Map([['test', mockRepositoriesNode]]);
            const fireEventDisposeSpy = jest.spyOn(provider['_onDidChangeTreeData'], 'dispose');

            provider.dispose();

            expect(mockRepositoriesNode.dispose).toHaveBeenCalled();
            expect(mockDisposable.dispose).toHaveBeenCalled();
            expect(fireEventDisposeSpy).toHaveBeenCalled();
        });

        it('should handle case when childrenMap is undefined', () => {
            provider['_childrenMap'] = undefined;
            const mockDisposable = { dispose: jest.fn() };
            provider['_disposable'] = mockDisposable as any;

            expect(() => provider.dispose()).not.toThrow();
        });
    });
});
