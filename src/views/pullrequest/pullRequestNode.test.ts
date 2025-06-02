import { expansionCastTo } from 'testsutil/miscFunctions';
import * as vscode from 'vscode';

import { DetailedSiteInfo, ProductBitbucket } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import * as issueKeysExtractor from '../../bitbucket/issueKeysExtractor';
import { BitbucketApi, Repo } from '../../bitbucket/model';
import { Commit, FileDiff, PaginatedComments, PullRequest, Task } from '../../bitbucket/model';
import { Container } from '../../container';
import { Resources } from '../../resources';
import { DescriptionNode, NextPageNode, PullRequestContextValue, PullRequestTitlesNode } from './pullRequestNode';

// Mock all the dependencies
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../bitbucket/issueKeysExtractor');
jest.mock('../../container', () => ({
    Container: {
        config: {
            get: jest.fn(),
        },
        siteManager: {
            get: jest.fn(),
        },
    },
}));
jest.mock('../../resources');
jest.mock('./diffViewHelper', () => ({
    createFileChangesNodes: jest.fn().mockResolvedValue([]),
}));

// Set up mocks
const mockCommandsExecute = jest.fn();
(vscode.commands.executeCommand as jest.Mock) = mockCommandsExecute;

const mockTreeItem = expansionCastTo<vscode.TreeItem>({});
const mockUri = expansionCastTo<vscode.Uri>({});

(vscode.TreeItem as jest.Mock) = jest.fn().mockImplementation(() => mockTreeItem);
(vscode.Uri.parse as jest.Mock) = jest.fn().mockReturnValue(mockUri);

// Set up mock PR data
const createMockPullRequest = (isCloud = true): PullRequest => ({
    site: {
        details: expansionCastTo<DetailedSiteInfo>({
            isCloud,
            // Add required properties for site.details
            baseLinkUrl: 'https://test-bitbucket.org',
            product: ProductBitbucket,
            userId: 'testuser',
            host: 'test-bitbucket.org',
        }),
        ownerSlug: 'team1',
        repoSlug: 'repo1',
    },
    data: {
        id: '123',
        version: 1,
        url: 'https://test-bitbucket.org/team1/repo1/pull-requests/123',
        author: {
            accountId: 'user1',
            displayName: 'User One',
            avatarUrl: 'https://test-bitbucket.org/avatar.png',
            userName: 'user1',
            emailAddress: 'user1@example.com',
            url: 'https://test-bitbucket.org/user1',
            mention: '@user1',
        },
        participants: [
            {
                accountId: 'user2',
                displayName: 'User Two',
                avatarUrl: 'https://test-bitbucket.org/avatar2.png',
                userName: 'user2',
                emailAddress: 'user2@example.com',
                url: 'https://test-bitbucket.org/user2',
                mention: '@user2',
                role: 'REVIEWER',
                status: 'APPROVED',
            },
        ],
        source: {
            repo: expansionCastTo<Repo>({ fullName: 'team1/repo1', name: 'repo1', mainbranch: 'main' }),
            branchName: 'feature/test',
            commitHash: 'abc123',
        },
        destination: {
            repo: expansionCastTo<Repo>({ fullName: 'team1/repo1', name: 'repo1', mainbranch: 'main' }),
            branchName: 'main',
            commitHash: 'def456',
        },
        title: 'Test PR',
        htmlSummary: '<p>Test Summary</p>',
        rawSummary: 'Test Summary',
        ts: '2023-01-01T00:00:00Z',
        updatedTs: '2023-01-02T00:00:00Z',
        state: 'OPEN',
        closeSourceBranch: false,
        taskCount: 2,
        buildStatuses: [],
        draft: false,
        siteDetails: expansionCastTo<DetailedSiteInfo>({
            isCloud,
            // Add required properties for siteDetails
            baseLinkUrl: 'https://test-bitbucket.org',
            product: ProductBitbucket,
            userId: 'testuser',
            host: 'test-bitbucket.org',
        }),
    },
});

describe('PullRequestTitlesNode', () => {
    let prNode: PullRequestTitlesNode;
    let mockPr: PullRequest;
    let mockBbApi: jest.Mocked<BitbucketApi>;
    let mockPrApi: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPr = createMockPullRequest();

        mockPrApi = {
            getChangedFiles: jest.fn().mockResolvedValue([]),
            getComments: jest.fn().mockResolvedValue({ data: [] }),
            getCommits: jest.fn().mockResolvedValue([]),
            getTasks: jest.fn().mockResolvedValue([]),
            getConflictedFiles: jest.fn().mockResolvedValue([]),
        };

        mockBbApi = {
            pullrequests: mockPrApi,
        } as unknown as jest.Mocked<BitbucketApi>;

        (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

        jest.spyOn(Container.config as any, 'get').mockReturnValue({
            bitbucket: {
                explorer: {
                    relatedJiraIssues: {
                        enabled: true,
                    },
                },
            },
        });
        jest.spyOn(Container.siteManager as any, 'get').mockReturnValue({
            productHasAtLeastOneSite: jest.fn().mockReturnValue(true),
        });

        // Mock Resources.icons.get
        (Resources.icons.get as jest.Mock) = jest.fn().mockReturnValue('icon-path');

        // Initialize test subject
        prNode = new PullRequestTitlesNode(mockPr, false);
    });

    test('constructor initializes properties correctly', () => {
        expect(prNode.prHref).toBe(mockPr.data.url);
    });

    test('getTreeItem returns a TreeItem with correct properties', () => {
        const treeItem = prNode.getTreeItem();
        expect(treeItem).toBe(mockTreeItem);

        expect(vscode.TreeItem).toHaveBeenCalledWith(mockPr.data.title, vscode.TreeItemCollapsibleState.Collapsed);

        expect(mockTreeItem.tooltip).toContain(mockPr.data.title);
        expect(mockTreeItem.tooltip).toContain('Approved-by:');
        expect(mockTreeItem.iconPath).toBe(mockUri);
        expect(mockTreeItem.contextValue).toBe(PullRequestContextValue);
    });

    test('getPR returns the PR object', () => {
        expect(prNode.getPR()).toBe(mockPr);
    });

    test('refresh calls the command to refresh the explorer node', () => {
        prNode.refresh();
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
            'atlascode.bb.refreshPullRequest',
            expect.any(Object),
        );
    });

    test('getChildren returns two nodes initially and starts loading', async () => {
        const children = await prNode.getChildren();

        // it should contain a DescriptioNode and a SimpleNode
        expect(children.length).toBe(2);

        const node1 = await children[0].getTreeItem();
        expect(node1.tooltip).toEqual('Open pull request details');

        const node2 = await children[1].getTreeItem();
        expect(node2.tooltip).toEqual('Loading...');
    });

    test('fetchDataAndProcessChildren loads data and updates children', async () => {
        const mockFiles: FileDiff[] = [
            {
                file: 'test.ts',
                status: 'M' as any,
                linesAdded: 10,
                linesRemoved: 5,
                oldPath: 'test.ts',
                newPath: 'test.ts',
            },
        ];
        const mockComments: PaginatedComments = { data: [] };
        const mockCommits: Commit[] = [
            expansionCastTo<Commit>({
                hash: 'abc123',
                message: 'Test commit',
                url: 'https://test-url',
                author: {
                    accountId: 'user1',
                    displayName: 'User One',
                    avatarUrl: '',
                    userName: 'user1',
                    emailAddress: '',
                    url: '',
                    mention: '',
                },
                parentHashes: [],
            }),
        ];

        // Setup mock implementations for this test
        mockPrApi.getChangedFiles.mockResolvedValue(mockFiles);
        mockPrApi.getComments.mockResolvedValue(mockComments);
        mockPrApi.getCommits.mockResolvedValue(mockCommits);

        // Call fetch method
        await prNode.fetchDataAndProcessChildren();

        // Verify methods called
        expect(clientForSite).toHaveBeenCalledWith(mockPr.site);
        expect(mockPrApi.getChangedFiles).toHaveBeenCalledWith(mockPr);
        expect(mockPrApi.getComments).toHaveBeenCalledWith(mockPr);
        expect(mockPrApi.getCommits).toHaveBeenCalledWith(mockPr);
        expect(mockPrApi.getConflictedFiles).toHaveBeenCalledWith(mockPr);
        expect(mockPrApi.getTasks).toHaveBeenCalledWith(mockPr);

        // getChildren should now return the loaded children
        const children = await prNode.getChildren();
        expect(children.length).toBeGreaterThan(0);

        // First child should be DescriptionNode
        expect(children[0]).toBeInstanceOf(DescriptionNode);
    });

    test('critical and non-critical data handling', async () => {
        const mockFiles: FileDiff[] = [
            {
                file: 'test.ts',
                status: 'M' as any,
                linesAdded: 10,
                linesRemoved: 5,
                oldPath: 'test.ts',
                newPath: 'test.ts',
            },
        ];
        const mockComments: PaginatedComments = { data: [] };
        const value: [FileDiff[], PaginatedComments] = [mockFiles, mockComments];

        const criticalPromise = Promise.resolve(value);
        const [files, comments, fileNodes] = await prNode.criticalData(criticalPromise);

        expect(files).toBe(mockFiles);
        expect(comments).toBe(mockComments);
        expect(Array.isArray(fileNodes)).toBe(true);

        // Test refresh was called
        expect(vscode.commands.executeCommand).toHaveBeenCalled();
    });

    test('handles error in criticalData', async () => {
        // Create a promise that rejects
        const criticalPromise = Promise.reject(new Error('Test error'));

        // Should not throw
        const [files, comments, fileNodes] = await prNode.criticalData(criticalPromise);

        expect(files).toEqual([]);
        expect(comments).toEqual({ data: [] });
        expect(fileNodes).toEqual([]);

        // Verify loading error node was created
        const children = await prNode.getChildren();
        expect(children.length).toBe(1);
        const treeItem = await children[0].getTreeItem();
        expect(treeItem.tooltip).toContain('Error');
    });

    test('nonCriticalData updates children correctly', async () => {
        const mockFiles: FileDiff[] = [];
        const mockComments: PaginatedComments = { data: [] };
        const mockCommits: Commit[] = [];
        const mockTasks: Task[] = [];
        const mockConflictedFiles: string[] = [];
        const value: [string[], Task[]] = [mockConflictedFiles, mockTasks];

        const nonCriticalPromise = Promise.resolve(value);

        // Mock issue keys extraction
        (issueKeysExtractor.extractIssueKeys as jest.Mock).mockResolvedValue(['ABC-123']);

        await prNode.nonCriticalData(nonCriticalPromise, mockFiles, mockComments, mockCommits);

        // Verify children were updated by checking number of children
        const children = await prNode.getChildren();
        expect(children.length).toBeGreaterThan(1);
    });
});

describe('DescriptionNode', () => {
    let descNode: DescriptionNode;
    let mockPr: PullRequest;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPr = createMockPullRequest();

        // Mock Resources.icons.get
        (Resources.icons.get as jest.Mock) = jest.fn().mockReturnValue('icon-path');

        // Initialize test subject
        descNode = new DescriptionNode(mockPr);
    });

    test('getTreeItem returns a TreeItem with correct properties', () => {
        descNode.getTreeItem();

        expect(vscode.TreeItem).toHaveBeenCalledWith('Details', vscode.TreeItemCollapsibleState.None);
        expect(mockTreeItem.tooltip).toBe('Open pull request details');
        expect(mockTreeItem.iconPath).toBe('icon-path');
        expect(mockTreeItem.command).toEqual({
            command: 'atlascode.bb.showPullRequestDetails',
            title: 'Open pull request details',
            arguments: [mockPr],
        });
        expect(mockTreeItem.contextValue).toBe(PullRequestContextValue);
    });

    test('getChildren returns an empty array', async () => {
        const children = await descNode.getChildren();
        expect(children).toEqual([]);
    });
});

describe('NextPageNode', () => {
    let nextPageNode: NextPageNode;
    let mockPaginatedPrs: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPaginatedPrs = {
            site: { details: { isCloud: true } },
            data: [createMockPullRequest()],
            next: 'next-page-url',
        };

        // Mock Resources.icons.get
        (Resources.icons.get as jest.Mock) = jest.fn().mockReturnValue('icon-path');

        // Initialize test subject
        nextPageNode = new NextPageNode(mockPaginatedPrs);
    });

    test('getTreeItem returns a TreeItem with correct properties', () => {
        nextPageNode.getTreeItem();

        expect(vscode.TreeItem).toHaveBeenCalledWith('Load next page', vscode.TreeItemCollapsibleState.None);
        expect(mockTreeItem.iconPath).toBe('icon-path');
        expect(mockTreeItem.command).toEqual({
            command: 'atlascode.bb.pullReqeustsNextPage',
            title: 'Load pull requests next page',
            arguments: [mockPaginatedPrs],
        });
    });

    test('getChildren returns an empty array', async () => {
        const children = await nextPageNode.getChildren();
        expect(children).toEqual([]);
    });
});
