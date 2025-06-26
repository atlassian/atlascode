import * as path from 'path';
import * as vscode from 'vscode';

import { BitbucketSite, PaginatedPullRequests, PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { SimpleNode } from '../nodes/simpleNode';
import { NextPageNode, PullRequestContextValue, PullRequestTitlesNode } from './pullRequestNode';
import { RepositoriesNode } from './repositoriesNode';

// Mock Container
jest.mock('../../container', () => ({
    Container: {
        bitbucketContext: {
            prCommentController: {
                disposePR: jest.fn(),
            },
        },
    },
}));

// Mock SimpleNode
jest.mock('../nodes/simpleNode', () => ({
    SimpleNode: jest.fn().mockImplementation((label) => ({
        label,
        getTreeItem: () => ({ label }),
        getChildren: () => Promise.resolve([]),
        dispose: jest.fn(),
    })),
}));

// Mock PullRequestTitlesNode
jest.mock('./pullRequestNode', () => ({
    PullRequestContextValue: 'pullrequest',
    PullRequestTitlesNode: jest.fn().mockImplementation((pr, preloading) => ({
        pr,
        preloading,
        prHref: pr.data.url,
        getPR: () => pr,
        getTreeItem: () => ({ resourceUri: { toString: () => pr.data.url } }),
        getChildren: () => Promise.resolve([]),
        dispose: jest.fn(),
    })),
    NextPageNode: jest.fn().mockImplementation((paginatedPRs) => ({
        paginatedPRs,
        getTreeItem: () => ({ label: 'Load more...' }),
        getChildren: () => Promise.resolve([]),
        dispose: jest.fn(),
    })),
}));

describe('RepositoriesNode', () => {
    let mockFetcher: jest.MockedFunction<(wsRepo: WorkspaceRepo) => Promise<PaginatedPullRequests>>;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockPaginatedPRs: PaginatedPullRequests;
    let mockPullRequest: PullRequest;
    let mockBitbucketSite: BitbucketSite;
    let repositoriesNode: RepositoriesNode;

    beforeEach(() => {
        jest.clearAllMocks();

        (vscode.Uri as any) = {
            parse: jest.fn().mockImplementation((uri) => ({ toString: () => uri })),
        };

        // Mock BitbucketSite
        mockBitbucketSite = {
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
                credentialId: 'cred-123',
            },
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
        };

        // Mock WorkspaceRepo
        mockWorkspaceRepo = {
            rootUri: '/path/to/test-repo',
            mainSiteRemote: {
                site: mockBitbucketSite,
                remote: {
                    name: 'origin',
                    fetchUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                    isReadOnly: false,
                },
            },
            siteRemotes: [
                {
                    site: mockBitbucketSite,
                    remote: {
                        name: 'origin',
                        fetchUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                        isReadOnly: false,
                    },
                },
            ],
        };

        // Mock PullRequest
        mockPullRequest = {
            site: mockBitbucketSite,
            data: {
                siteDetails: mockBitbucketSite.details,
                id: 'pr-1',
                version: 1,
                title: 'Test PR',
                url: 'https://bitbucket.org/test-owner/test-repo/pull-requests/1',
                updatedTs: '2023-01-01T00:00:00Z',
                ts: '2023-01-01T00:00:00Z',
                state: 'OPEN',
                author: {
                    accountId: 'author-id',
                    displayName: 'Test Author',
                    url: 'https://bitbucket.org/author',
                    avatarUrl: 'author-avatar.png',
                    mention: '@author',
                },
                participants: [],
                destination: {
                    branchName: 'main',
                    commitHash: 'dest-commit',
                    repo: {
                        id: 'repo-id',
                        name: 'test-repo',
                        displayName: 'Test Repo',
                        fullName: 'test-owner/test-repo',
                        url: 'https://bitbucket.org/test-owner/test-repo',
                        avatarUrl: 'repo-avatar.png',
                        mainbranch: 'main',
                        issueTrackerEnabled: false,
                    },
                },
                source: {
                    branchName: 'feature-branch',
                    commitHash: 'source-commit',
                    repo: {
                        id: 'repo-id',
                        name: 'test-repo',
                        displayName: 'Test Repo',
                        fullName: 'test-owner/test-repo',
                        url: 'https://bitbucket.org/test-owner/test-repo',
                        avatarUrl: 'repo-avatar.png',
                        mainbranch: 'main',
                        issueTrackerEnabled: false,
                    },
                },
                htmlSummary: 'Test summary',
                rawSummary: 'Test summary',
                closeSourceBranch: false,
                taskCount: 0,
                buildStatuses: [],
                draft: false,
            },
            workspaceRepo: mockWorkspaceRepo,
        };

        // Mock PaginatedPullRequests
        mockPaginatedPRs = {
            site: mockBitbucketSite,
            data: [mockPullRequest],
            next: undefined,
            workspaceRepo: mockWorkspaceRepo,
        };

        // Mock fetcher function
        mockFetcher = jest.fn().mockResolvedValue(mockPaginatedPRs);

        repositoriesNode = new RepositoriesNode(mockFetcher, mockWorkspaceRepo, true, false);
    });

    describe('constructor', () => {
        it('should create a RepositoriesNode with correct properties', () => {
            expect(repositoriesNode.fetcher).toBe(mockFetcher);
            expect(repositoriesNode['workspaceRepo']).toBe(mockWorkspaceRepo);
            expect(repositoriesNode['preloadingEnabled']).toBe(true);
            expect(repositoriesNode['expand']).toBe(false);
            expect(repositoriesNode['children']).toBeUndefined();
            expect(repositoriesNode['dirty']).toBe(false);
        });

        it('should create tree item correctly', () => {
            const treeItem = repositoriesNode.getTreeItem();
            const expectedDirectory = path.basename(mockWorkspaceRepo.rootUri);

            expect(treeItem.label).toBe(expectedDirectory);
            expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
            expect(treeItem.tooltip).toBe(mockWorkspaceRepo.rootUri);
            expect(treeItem.contextValue).toBe(PullRequestContextValue);
        });

        it('should create expanded tree item when expand is true', () => {
            const expandedNode = new RepositoriesNode(mockFetcher, mockWorkspaceRepo, true, true);
            const treeItem = expandedNode.getTreeItem();

            expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Expanded);
        });

        it('should set correct resource URI for cloud site', () => {
            repositoriesNode.getTreeItem();
            const expectedUri = `${mockBitbucketSite.details.baseLinkUrl}/${mockBitbucketSite.ownerSlug}/${mockBitbucketSite.repoSlug}/pull-requests`;

            expect(vscode.Uri.parse).toHaveBeenCalledWith(expectedUri);
        });

        it('should set correct resource URI for server site', () => {
            const serverSite = {
                ...mockBitbucketSite,
                details: {
                    ...mockBitbucketSite.details,
                    isCloud: false,
                },
            };
            const serverWorkspaceRepo = {
                ...mockWorkspaceRepo,
                mainSiteRemote: {
                    ...mockWorkspaceRepo.mainSiteRemote,
                    site: serverSite,
                },
            };

            const serverNode = new RepositoriesNode(mockFetcher, serverWorkspaceRepo, true, false);
            serverNode.getTreeItem();
            const expectedUri = `${serverSite.details.baseLinkUrl}/projects/${serverSite.ownerSlug}/repos/${serverSite.repoSlug}/pull-requests`;

            expect(vscode.Uri.parse).toHaveBeenCalledWith(expectedUri);
        });
    });

    describe('dispose', () => {
        it('should dispose all children when called', () => {
            const mockChild1 = {
                prHref: 'https://bitbucket.org/test1',
                dispose: jest.fn(),
            } as any;
            const mockChild2 = {
                prHref: 'https://bitbucket.org/test2',
                dispose: jest.fn(),
            } as any;

            // Make child1 an instance of PullRequestTitlesNode
            Object.setPrototypeOf(mockChild1, PullRequestTitlesNode.prototype);
            Object.setPrototypeOf(mockChild2, PullRequestTitlesNode.prototype);

            repositoriesNode['children'] = [mockChild1, mockChild2];

            repositoriesNode.dispose();

            expect(Container.bitbucketContext.prCommentController.disposePR).toHaveBeenCalledWith(mockChild1.prHref);
            expect(Container.bitbucketContext.prCommentController.disposePR).toHaveBeenCalledWith(mockChild2.prHref);
            expect(mockChild1.dispose).toHaveBeenCalled();
            expect(mockChild2.dispose).toHaveBeenCalled();
        });

        it('should not throw error when children is undefined', () => {
            repositoriesNode['children'] = undefined;

            expect(() => repositoriesNode.dispose()).not.toThrow();
        });

        it('should dispose NextPageNode children without calling prCommentController', () => {
            const mockNextPageNode = {
                dispose: jest.fn(),
            } as any;

            // Make it an instance of NextPageNode
            Object.setPrototypeOf(mockNextPageNode, NextPageNode.prototype);

            repositoriesNode['children'] = [mockNextPageNode];

            repositoriesNode.dispose();

            expect(Container.bitbucketContext.prCommentController.disposePR).not.toHaveBeenCalled();
            expect(mockNextPageNode.dispose).toHaveBeenCalled();
        });
    });

    describe('markDirty', () => {
        it('should mark node as dirty and update preloading settings', async () => {
            repositoriesNode['dirty'] = false;
            repositoriesNode['preloadingEnabled'] = false;

            await repositoriesNode.markDirty(true);

            expect(repositoriesNode['dirty']).toBe(true);
            expect(repositoriesNode['preloadingEnabled']).toBe(true);
        });
    });

    describe('getChildren', () => {
        it('should call refresh and return children when children is undefined', async () => {
            repositoriesNode['children'] = undefined;

            const children = await repositoriesNode.getChildren();

            expect(mockFetcher).toHaveBeenCalledWith(mockWorkspaceRepo);
            expect(children).toHaveLength(1);
            expect(PullRequestTitlesNode).toHaveBeenCalledWith(mockPullRequest, true);
        });

        it('should call refresh and return children when dirty is true', async () => {
            repositoriesNode['children'] = [];
            repositoriesNode['dirty'] = true;

            const children = await repositoriesNode.getChildren();

            expect(mockFetcher).toHaveBeenCalledWith(mockWorkspaceRepo);
            expect(children).toHaveLength(1);
        });

        it('should return cached children when not dirty and children exist', async () => {
            const mockChild = new PullRequestTitlesNode(mockPullRequest, true);
            repositoriesNode['children'] = [mockChild];
            repositoriesNode['dirty'] = false;

            const children = await repositoriesNode.getChildren();

            expect(mockFetcher).not.toHaveBeenCalled();
            expect(children).toEqual([mockChild]);
        });

        it('should return SimpleNode when no pull requests found', async () => {
            mockFetcher.mockResolvedValue({
                ...mockPaginatedPRs,
                data: [],
            });

            const children = await repositoriesNode.getChildren();

            expect(children).toHaveLength(1);
            expect(SimpleNode).toHaveBeenCalledWith('No pull requests found for this repository');
        });

        it('should delegate to element when element is provided', async () => {
            const mockElement = {
                getChildren: jest.fn().mockResolvedValue(['child1', 'child2']),
            } as any;

            const children = await repositoriesNode.getChildren(mockElement);

            expect(mockElement.getChildren).toHaveBeenCalled();
            expect(children).toEqual(['child1', 'child2']);
        });

        it('should add NextPageNode when there is a next page', async () => {
            mockFetcher.mockResolvedValue({
                ...mockPaginatedPRs,
                next: 'next-page-url',
            });

            const children = await repositoriesNode.getChildren();

            expect(children).toHaveLength(2);
            expect(NextPageNode).toHaveBeenCalledWith({
                ...mockPaginatedPRs,
                next: 'next-page-url',
            });
        });

        it('should call refresh when children is undefined or dirty', async () => {
            const refreshSpy = jest.spyOn(repositoriesNode as any, 'refresh');
            repositoriesNode['children'] = undefined;

            await repositoriesNode.getChildren();

            expect(refreshSpy).toHaveBeenCalled();

            refreshSpy.mockClear();
            repositoriesNode['dirty'] = true;
            repositoriesNode['children'] = [];

            await repositoriesNode.getChildren();

            expect(refreshSpy).toHaveBeenCalled();
        });
    });

    describe('addItems', () => {
        it('should initialize children array if undefined', () => {
            repositoriesNode['children'] = undefined;

            repositoriesNode.addItems(mockPaginatedPRs);

            expect(repositoriesNode['children']).toBeDefined();
            expect(repositoriesNode['children']!.length).toBe(1);
        });

        it('should remove existing NextPageNode before adding new items', () => {
            const existingChild = {
                dispose: jest.fn(),
                getPR: () => mockPullRequest,
            } as any;
            const existingNextPageNode = {
                dispose: jest.fn(),
            } as any;

            // Set prototypes to make instanceof checks work
            Object.setPrototypeOf(existingChild, PullRequestTitlesNode.prototype);
            Object.setPrototypeOf(existingNextPageNode, NextPageNode.prototype);

            repositoriesNode['children'] = [existingChild, existingNextPageNode];

            const newPR = { ...mockPullRequest, data: { ...mockPullRequest.data, id: 'new-pr' } };
            const newPaginatedPRs = {
                ...mockPaginatedPRs,
                data: [newPR],
            };

            repositoriesNode.addItems(newPaginatedPRs);

            // Should have: existing child + new PR child = 2 total
            expect(repositoriesNode['children']).toHaveLength(2);
            expect(repositoriesNode['children']![0]).toBe(existingChild);
        });

        it('should add NextPageNode when next page exists', () => {
            repositoriesNode['children'] = [];

            const paginatedWithNext = {
                ...mockPaginatedPRs,
                next: 'next-page-url',
            };

            repositoriesNode.addItems(paginatedWithNext);

            expect(repositoriesNode['children']).toHaveLength(2);
            expect(NextPageNode).toHaveBeenCalledWith(paginatedWithNext);
        });
    });

    describe('findResource', () => {
        it('should return self when URI matches tree item resource URI', () => {
            const uri = vscode.Uri.parse('test-uri');
            repositoriesNode.getTreeItem().resourceUri = uri;

            const result = repositoriesNode.findResource(uri);

            expect(result).toBe(repositoriesNode);
        });

        it('should return matching child when child resource URI matches', () => {
            const uri = vscode.Uri.parse('child-uri');
            const mockChild = {
                getTreeItem: () => ({ resourceUri: uri }),
                dispose: jest.fn(),
                prHref: 'test-href',
                getPR: () => mockPullRequest,
                getChildren: () => Promise.resolve([]),
            } as any;
            repositoriesNode['children'] = [mockChild];

            const result = repositoriesNode.findResource(uri);

            expect(result).toBe(mockChild);
        });

        it('should return undefined when no matching resource found', () => {
            const uri = vscode.Uri.parse('no-match-uri');
            repositoriesNode['children'] = [new PullRequestTitlesNode(mockPullRequest, true)];

            const result = repositoriesNode.findResource(uri);

            expect(result).toBeUndefined();
        });

        it('should return undefined when children is undefined', () => {
            const uri = vscode.Uri.parse('test-uri');
            repositoriesNode['children'] = undefined;

            const result = repositoriesNode.findResource(uri);

            expect(result).toBeUndefined();
        });
    });

    describe('createChildNodes', () => {
        it('should create PullRequestTitlesNode for cloud PRs with preloading when <= 10 PRs', () => {
            const pullRequests = [mockPullRequest];

            const result = repositoriesNode['createChildNodes'](pullRequests);

            expect(result).toHaveLength(1);
            expect(PullRequestTitlesNode).toHaveBeenCalledWith(mockPullRequest, true);
        });

        it('should disable preloading for cloud PRs when > 10 PRs', () => {
            repositoriesNode['preloadingEnabled'] = true;
            const pullRequests = Array(12)
                .fill(0)
                .map((_, i) => ({
                    ...mockPullRequest,
                    data: { ...mockPullRequest.data, id: `pr-${i}` },
                }));

            const result = repositoriesNode['createChildNodes'](pullRequests);

            expect(result).toHaveLength(12);
            expect(PullRequestTitlesNode).toHaveBeenCalledWith(expect.any(Object), false);
        });

        it('should not cache server PRs and enable preloading only when <= 10 PRs', () => {
            const serverPR = {
                ...mockPullRequest,
                site: {
                    ...mockBitbucketSite,
                    details: { ...mockBitbucketSite.details, isCloud: false },
                },
            };
            const pullRequests = [serverPR];

            const result = repositoriesNode['createChildNodes'](pullRequests);

            expect(result).toHaveLength(1);
            expect(PullRequestTitlesNode).toHaveBeenCalledWith(serverPR, true);
        });

        it('should reuse existing node when PR has same updated timestamp', () => {
            const existingChild = {
                getPR: () => mockPullRequest,
                dispose: jest.fn(),
            } as any;

            Object.setPrototypeOf(existingChild, PullRequestTitlesNode.prototype);
            const currentChildren = [existingChild];

            const result = repositoriesNode['createChildNodes']([mockPullRequest], currentChildren);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(existingChild);
        });

        it('should create new node when PR has different updated timestamp', () => {
            const existingPR = {
                ...mockPullRequest,
                data: { ...mockPullRequest.data, updatedTs: '2023-01-01T00:00:00Z' },
            };
            const existingChild = new PullRequestTitlesNode(existingPR, true);
            const currentChildren = [existingChild];

            const updatedPR = {
                ...mockPullRequest,
                data: { ...mockPullRequest.data, updatedTs: '2023-01-02T00:00:00Z' },
            };

            const result = repositoriesNode['createChildNodes']([updatedPR], currentChildren);

            expect(result).toHaveLength(1);
            expect(result[0]).not.toBe(existingChild);
            expect(PullRequestTitlesNode).toHaveBeenCalledWith(updatedPR, true);
        });
    });

    describe('refresh', () => {
        it('should reset dirty flag after refresh', async () => {
            repositoriesNode['dirty'] = true;

            await repositoriesNode['refresh']();

            expect(repositoriesNode['dirty']).toBe(false);
        });

        it('should dispose PR comments for removed PRs', async () => {
            const oldPR = { ...mockPullRequest, data: { ...mockPullRequest.data, id: 'old-pr' } };
            const oldChild = {
                prHref: oldPR.data.url,
                getPR: () => oldPR,
                dispose: jest.fn(),
            } as any;

            Object.setPrototypeOf(oldChild, PullRequestTitlesNode.prototype);
            repositoriesNode['children'] = [oldChild];

            // Mock fetcher to return different PRs
            const newPR = { ...mockPullRequest, data: { ...mockPullRequest.data, id: 'new-pr' } };
            mockFetcher.mockResolvedValue({
                ...mockPaginatedPRs,
                data: [newPR],
            });

            await repositoriesNode['refresh']();

            expect(Container.bitbucketContext.prCommentController.disposePR).toHaveBeenCalledWith(oldChild.prHref);
        });
    });
});
