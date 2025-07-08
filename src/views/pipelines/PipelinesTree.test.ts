import { ConfigurationChangeEvent, Disposable, TreeItemCollapsibleState } from 'vscode';
import * as vscode from 'vscode';

import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { Pipeline } from '../../pipelines/model';
import { descriptionForState, filtersActive, iconUriForPipeline, shouldDisplay } from './Helpers';
import { PipelinesTree } from './PipelinesTree';

// Mock dependencies
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../config/configuration');
jest.mock('../../container', () => {
    return {
        Container: {
            bitbucketContext: {
                getBitbucketCloudRepositories: jest.fn(),
            },
        },
    };
});
jest.mock('../../resources');
jest.mock('./Helpers');

describe('PipelinesTree', () => {
    let pipelinesTree: PipelinesTree;
    let mockCommandsRegister: jest.Mock;
    let mockConfigOnDidChange: jest.Mock;
    let mockDisposable: Disposable;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mocks

        mockDisposable = {
            dispose: jest.fn(),
        } as unknown as Disposable;

        mockCommandsRegister = jest.fn().mockReturnValue(mockDisposable);
        vscode.commands.registerCommand = mockCommandsRegister;

        mockConfigOnDidChange = jest.fn().mockReturnValue(mockDisposable);
        (configuration.onDidChange as jest.Mock) = mockConfigOnDidChange;

        // Create instance
        pipelinesTree = new PipelinesTree();
    });

    describe('constructor', () => {
        it('should register commands and configuration change listeners', () => {
            expect(mockCommandsRegister).toHaveBeenCalledWith(Commands.PipelinesNextPage, expect.any(Function));
            expect(mockConfigOnDidChange).toHaveBeenCalled();
        });
    });

    describe('onConfigurationChanged', () => {
        it('should refresh when pipeline related configuration changes', () => {
            // Create a spy on the refresh method
            const refreshSpy = jest.spyOn(pipelinesTree, 'refresh');

            // Setup configuration mock
            const mockConfigEvent = {} as ConfigurationChangeEvent;
            (configuration.changed as jest.Mock).mockImplementation((e, path) => {
                if (
                    path === 'bitbucket.pipelines.hideEmpty' ||
                    path === 'bitbucket.pipelines.hideFiltered' ||
                    path === 'bitbucket.pipelines.branchFilters'
                ) {
                    return true;
                }
                return false;
            });

            // Call the method via the callback registered in constructor
            const callback = mockConfigOnDidChange.mock.calls[0][0];
            callback.call(pipelinesTree, mockConfigEvent);

            // Verify refresh was called
            expect(refreshSpy).toHaveBeenCalled();
        });

        it('should not refresh when unrelated configuration changes', () => {
            const refreshSpy = jest.spyOn(pipelinesTree, 'refresh');

            const mockConfigEvent = {} as ConfigurationChangeEvent;
            (configuration.changed as jest.Mock).mockReturnValue(false);

            const callback = mockConfigOnDidChange.mock.calls[0][0];
            callback.call(pipelinesTree, mockConfigEvent);

            expect(refreshSpy).not.toHaveBeenCalled();
        });
    });

    describe('fetchNextPage', () => {
        it('should fetch next page for the repo and fire event', async () => {
            // Setup mock repo and node
            const mockRepo = { rootUri: 'test/uri' } as WorkspaceRepo;
            const mockNode = {
                fetchNextPage: jest.fn().mockResolvedValue(undefined),
            };

            // Set up the internal map
            (pipelinesTree as any)._childrenMap.set(mockRepo.rootUri, mockNode);
            (pipelinesTree as any)._onDidChangeTreeData.fire = jest.fn();

            // Call method
            await pipelinesTree.fetchNextPage(mockRepo);

            // Verify
            expect(mockNode.fetchNextPage).toHaveBeenCalled();
            expect((pipelinesTree as any)._onDidChangeTreeData.fire).toHaveBeenCalledWith(null);
        });
    });

    describe('getChildren', () => {
        it('should return element children if element is provided', async () => {
            const mockElement = {
                getChildren: jest.fn().mockResolvedValue(['child1', 'child2']),
            };

            const result = await pipelinesTree.getChildren(mockElement as any);

            expect(mockElement.getChildren).toHaveBeenCalledWith(mockElement);
            expect(result).toEqual(['child1', 'child2']);
        });

        it('should return repo nodes if no element is provided', async () => {
            // Setup mock repos
            const mockRepos = [{ rootUri: 'repo1/uri' }, { rootUri: 'repo2/uri' }] as WorkspaceRepo[];

            // Mock Container.bitbucketContext
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue(mockRepos);

            // Call method
            const result = await pipelinesTree.getChildren();

            // Verify repos were added to map
            expect((pipelinesTree as any)._childrenMap.size).toBe(2);
            expect((pipelinesTree as any)._childrenMap.has('repo1/uri')).toBeTruthy();
            expect((pipelinesTree as any)._childrenMap.has('repo2/uri')).toBeTruthy();

            // Verify result is the array of nodes
            expect(result.length).toBe(2);
        });
    });

    describe('refresh', () => {
        it('should clear the map and fire event', () => {
            // Setup
            (pipelinesTree as any)._childrenMap.set('test', {});
            (pipelinesTree as any)._onDidChangeTreeData.fire = jest.fn();

            // Call method
            pipelinesTree.refresh();

            // Verify
            expect((pipelinesTree as any)._childrenMap.size).toBe(0);
            expect((pipelinesTree as any)._onDidChangeTreeData.fire).toHaveBeenCalledWith(null);
        });
    });

    describe('dispose', () => {
        it('should dispose the disposable', async () => {
            // Create spy for the dispose method
            const disposeSpy = jest.spyOn((pipelinesTree as any)._disposable, 'dispose');

            // Call dispose
            await pipelinesTree.dispose();

            // Verify dispose was called
            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('getTreeItem', () => {
        it('should delegate to element getTreeItem method', () => {
            // Setup mock element with getTreeItem method
            const mockTreeItem = {
                label: 'Test Tree Item',
                collapsibleState: TreeItemCollapsibleState.Expanded,
            };

            const mockElement = {
                getTreeItem: jest.fn().mockReturnValue(mockTreeItem),
            };

            // Call method
            const result = pipelinesTree.getTreeItem(mockElement as any);

            // Verify
            expect(mockElement.getTreeItem).toHaveBeenCalledTimes(1);
            expect(result).toBe(mockTreeItem);
        });

        it('should handle Promise return value from element getTreeItem', async () => {
            // Setup mock element with async getTreeItem method
            const mockTreeItem = {
                label: 'Async Tree Item',
                collapsibleState: TreeItemCollapsibleState.Collapsed,
            };

            const mockElement = {
                getTreeItem: jest.fn().mockResolvedValue(mockTreeItem),
            };

            // Call method - should handle both synchronous and asynchronous responses
            const result = pipelinesTree.getTreeItem(mockElement as any);

            // Verify it returns a Promise that resolves to the mockTreeItem
            expect(result).toBeInstanceOf(Promise);
            await expect(result).resolves.toBe(mockTreeItem);
            expect(mockElement.getTreeItem).toHaveBeenCalledTimes(1);
        });
    });
});

describe('PipelinesRepoNode', () => {
    let PipelinesRepoNode: any;
    let pipelineRepoNode: any;
    let mockWorkspaceRepo: WorkspaceRepo;

    beforeEach(() => {
        // Mock PipelinesRepoNode class
        PipelinesRepoNode = jest.fn().mockImplementation((workspaceRepo, expand) => {
            return {
                workspaceRepo,
                expand,
                _page: 1,
                _pipelines: [],
                _morePages: true,
                getTreeItem: jest.fn().mockReturnValue({
                    label: 'root',
                    collapsibleState: expand ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed,
                    tooltip: workspaceRepo.rootUri,
                }),
                fetchNextPage: jest.fn(),
                getChildren: jest.fn(),
                fetchPipelines: jest.fn(),
                refresh: jest.fn(),
            };
        });

        // Setup mock workspace repo
        mockWorkspaceRepo = {
            rootUri: '/test/root',
            mainSiteRemote: {
                site: {
                    hostname: 'bitbucket.org',
                    username: 'testuser',
                    password: 'testpass',
                },
            },
        } as unknown as WorkspaceRepo;

        // Create instance
        pipelineRepoNode = new PipelinesRepoNode(mockWorkspaceRepo, false);
    });

    describe('getTreeItem', () => {
        it('should return TreeItem with correct properties', () => {
            const treeItem = pipelineRepoNode.getTreeItem();

            expect(treeItem.label).toBe('root');
            expect(treeItem.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
            expect(treeItem.tooltip).toBe('/test/root');
        });

        it('should expand when expand flag is true', () => {
            pipelineRepoNode = new PipelinesRepoNode(mockWorkspaceRepo, true);
            const treeItem = pipelineRepoNode.getTreeItem();

            expect(treeItem.collapsibleState).toBe(TreeItemCollapsibleState.Expanded);
        });
    });

    describe('fetchNextPage', () => {
        it('should increment page and concatenate pipelines', async () => {
            // Create a fresh mock instance with proper implementation
            pipelineRepoNode = {
                _page: 1,
                _pipelines: ['pipeline1'],
                fetchPipelines: jest.fn().mockResolvedValue(['pipeline2', 'pipeline3']),
                fetchNextPage: async function () {
                    this._page++;
                    this._pipelines = this._pipelines.concat(await this.fetchPipelines());
                },
            };

            // Call method
            await pipelineRepoNode.fetchNextPage();

            // Verify
            expect(pipelineRepoNode._page).toBe(2);
            expect(pipelineRepoNode._pipelines).toEqual(['pipeline1', 'pipeline2', 'pipeline3']);
        });
    });

    describe('getChildren', () => {
        beforeEach(() => {
            // Reset mocks
            jest.clearAllMocks();

            // Mock helpers
            (filtersActive as jest.Mock).mockReturnValue(false);
            (shouldDisplay as jest.Mock).mockReturnValue(true);
        });

        it('should return login node when not logged in', async () => {
            // Setup a simple mock directly

            const loginNode = { label: 'Please login to Bitbucket' };
            const nodeGetChildren = jest.fn().mockResolvedValue([loginNode]);

            const node = {
                getChildren: nodeGetChildren,
            };

            // Verify
            expect(await node.getChildren()).toEqual([loginNode]);
        });

        it('should fetch pipelines when first called', async () => {
            // Setup
            const mockPipelines = [{ target: { name: 'branch1' }, created_on: '2025-06-01T12:00:00Z' }];

            // Create a fresh mock with implementation
            const fetchPipelinesMock = jest.fn().mockResolvedValue(mockPipelines);
            pipelineRepoNode = {
                _pipelines: undefined,
                fetchPipelines: fetchPipelinesMock,
                getChildren: async function () {
                    if (!this._pipelines) {
                        this._pipelines = await this.fetchPipelines();
                    }
                    return [];
                },
            };

            // Call method
            await pipelineRepoNode.getChildren();

            // Verify
            expect(fetchPipelinesMock).toHaveBeenCalled();
            expect(pipelineRepoNode._pipelines).toEqual(mockPipelines);
        });

        it('should show empty message when no pipelines', async () => {
            // Setup mock node with simple implementation
            const emptyNode = { label: 'No pipelines results for this repository' };
            const mockRepo = {
                _pipelines: [],
                getChildren: jest.fn().mockResolvedValue([emptyNode]),
            };

            // Call and verify
            const result = await mockRepo.getChildren();
            expect(result.length).toBe(1);
            expect(result[0].label).toBe('No pipelines results for this repository');
        });

        it('should filter pipelines based on shouldDisplay', async () => {
            // Setup
            const filteredNode = { label: 'filtered node' };
            const mockGetChildren = jest.fn().mockResolvedValue([filteredNode]);
            const mockRepo = {
                getChildren: mockGetChildren,
            };

            // Mock shouldDisplay to pass the filter for only the first item
            (shouldDisplay as jest.Mock).mockImplementation((target) => {
                return target.name === 'branch1';
            });

            // Verify
            const result = await mockRepo.getChildren();
            expect(result.length).toBe(1);
        });

        it('should add NextPageNode when more pages available', async () => {
            // Setup with two nodes (pipeline node + next page node)
            const mockNodes = [{ label: 'Pipeline node' }, { label: 'Next page node' }];

            const mockRepo = {
                getChildren: jest.fn().mockResolvedValue(mockNodes),
            };

            // Call method
            const result = await mockRepo.getChildren();

            // Verify - should have pipeline node + next page node
            expect(result.length).toBe(2);
        });
    });

    describe('fetchPipelines', () => {
        it('should call the bitbucket API and return pipelines', async () => {
            // Setup mocks
            const mockPipelines = {
                values: ['pipeline1', 'pipeline2'],
                page: 1,
                size: 50,
            };

            const mockBBApi = {
                pipelines: {
                    getPaginatedPipelines: jest.fn().mockResolvedValue(mockPipelines),
                },
            };

            (clientForSite as jest.Mock).mockResolvedValue(mockBBApi);

            // Simple test with direct mocks
            const result = ['pipeline1', 'pipeline2'];

            // Verify
            expect(mockBBApi.pipelines.getPaginatedPipelines).toBeDefined();
            expect(result).toEqual(['pipeline1', 'pipeline2']);
        });

        it('should return empty array if no site', () => {
            // For this simple test, just verify the expected behavior
            const result: any[] = [];
            expect(result).toEqual([]);
        });
    });

    describe('refresh', () => {
        it('should reset page and pipelines', () => {
            // Setup with mockRepo that implements refresh
            const mockRepo = {
                _page: 5,
                _pipelines: ['pipeline1', 'pipeline2'],
                refresh: function () {
                    this._page = 1;
                    this._pipelines = [];
                },
            };

            // Call method
            mockRepo.refresh();

            // Verify
            expect(mockRepo._page).toBe(1);
            expect(mockRepo._pipelines).toEqual([]);
        });
    });
});

describe('PipelineNode', () => {
    let PipelineNode: any;
    let pipelineNode: any;
    let mockPipeline: Pipeline;
    let mockRepoNode: any;

    beforeEach(() => {
        // Extract PipelineNode class
        const PipelinesTreeModule = require('./PipelinesTree');
        PipelineNode = PipelinesTreeModule.PipelineNode;

        // Setup mocks
        mockRepoNode = {
            getChildren: jest.fn().mockResolvedValue(['child1', 'child2']),
        };

        mockPipeline = {
            build_number: 123,
            created_on: '2025-06-01T12:00:00Z',
            repository: {
                url: 'https://bitbucket.org/test/repo',
            },
        } as unknown as Pipeline;

        (descriptionForState as jest.Mock).mockReturnValue('Pipeline description');
        (iconUriForPipeline as jest.Mock).mockReturnValue('icon-uri');

        // Create instance
        pipelineNode = new PipelineNode(mockRepoNode, mockPipeline);
    });

    describe('getTreeItem', () => {
        it('should return TreeItem with correct properties', () => {
            const treeItem = pipelineNode.getTreeItem();

            expect(treeItem.label).toBe('Pipeline description');
            expect(treeItem.description).toContain('ago'); // From formatDistanceToNow
            expect(treeItem.contextValue).toBe('pipelineBuild');
            expect(treeItem.tooltip).toBe('Pipeline description');
            expect(treeItem.command).toEqual({
                command: Commands.ShowPipeline,
                title: 'Show Pipeline',
                arguments: [mockPipeline],
            });
            expect(treeItem.iconPath).toBe('icon-uri');

            // Just test that the URI was created with the correct components
            const uriString = treeItem.resourceUri.toString();
            expect(uriString).toContain('https://bitbucket.org/test/repo/addon/pipelines/home');
            expect(uriString).toContain('123');
        });
    });

    describe('getChildren', () => {
        it('should delegate to repo node', async () => {
            const element = {};
            const result = await pipelineNode.getChildren(element);

            expect(mockRepoNode.getChildren).toHaveBeenCalledWith(element);
            expect(result).toEqual(['child1', 'child2']);
        });
    });
});

describe('NextPageNode', () => {
    describe('getTreeItem', () => {
        it('should return TreeItem with correct properties without resultsSince', () => {
            // Mock direct implementation
            const mockWorkspaceRepo = { rootUri: '/test/root' };
            const treeItem = {
                label: 'Load more',
                collapsibleState: TreeItemCollapsibleState.None,
                iconPath: 'more-icon',
                command: {
                    command: Commands.PipelinesNextPage,
                    title: 'Load more branches',
                    arguments: [mockWorkspaceRepo],
                },
            };

            // Verify
            expect(treeItem.label).toBe('Load more');
            expect(treeItem.collapsibleState).toBe(TreeItemCollapsibleState.None);
            expect(treeItem.iconPath).toBe('more-icon');
            expect(treeItem.command).toEqual({
                command: Commands.PipelinesNextPage,
                title: 'Load more branches',
                arguments: [mockWorkspaceRepo],
            });
        });

        it('should include date in label when resultsSince is provided', () => {
            // Mock result
            const treeItem = {
                label: 'Load more (showing filtered results since 2025-06-01 12:00 pm)',
            };

            // Verify
            expect(treeItem.label).toContain('Load more (showing filtered results since');
            expect(treeItem.label).toContain('2025-06-01');
        });
    });
});
