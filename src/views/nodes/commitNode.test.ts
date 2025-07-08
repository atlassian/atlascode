import * as vscode from 'vscode';

import { ProductBitbucket } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, Commit, PullRequest, User } from '../../bitbucket/model';
import { Logger } from '../../logger';
import { createFileChangesNodes } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';
import { CommitNode } from './commitNode';
import { SimpleNode } from './simpleNode';

// Mock dependencies
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../logger');
jest.mock('../pullrequest/diffViewHelper');

const mockClientForSite = clientForSite as jest.MockedFunction<typeof clientForSite>;
const mockCreateFileChangesNodes = createFileChangesNodes as jest.MockedFunction<typeof createFileChangesNodes>;

describe('CommitNode', () => {
    let mockPullRequest: PullRequest;
    let mockCommit: Commit;
    let mockUser: User;
    let mockSite: BitbucketSite;
    let mockBbApi: any;
    let commitNode: CommitNode;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user
        mockUser = {
            accountId: 'user123',
            displayName: 'Test User',
            url: 'https://test.com/user',
            avatarUrl: 'https://test.com/avatar.jpg',
            mention: '@testuser',
        };

        // Mock site
        mockSite = {
            details: {
                id: 'site-id',
                name: 'test-site',
                avatarUrl: 'https://test.com/avatar.jpg',
                host: 'test.bitbucket.org',
                baseLinkUrl: 'https://test.bitbucket.org',
                baseApiUrl: 'https://api.test.bitbucket.org',
                product: ProductBitbucket,
                isCloud: true,
                userId: 'user123',
                credentialId: 'cred123',
            },
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
        };

        // Mock commit
        mockCommit = {
            author: mockUser,
            ts: '2023-01-01T00:00:00Z',
            hash: 'abc123def456ghi789',
            message: 'Test commit message',
            url: 'https://test.bitbucket.org/commits/abc123def456ghi789',
            htmlSummary: '<p>Test commit message</p>',
            rawSummary: 'Test commit message',
            parentHashes: ['parent123'],
        };

        // Mock pull request
        mockPullRequest = {
            site: mockSite,
            data: {
                siteDetails: mockSite.details,
                id: 'pr123',
                version: 1,
                url: 'https://test.bitbucket.org/pr/123',
                author: mockUser,
                participants: [],
                source: {
                    repo: {
                        id: 'repo-id',
                        name: 'test-repo',
                        displayName: 'Test Repo',
                        url: 'https://test.bitbucket.org/repo',
                        fullName: 'test-owner/test-repo',
                        avatarUrl: 'https://test.com/repo-avatar.jpg',
                        issueTrackerEnabled: false,
                    },
                    branchName: 'feature-branch',
                    commitHash: 'commit123',
                },
                destination: {
                    repo: {
                        id: 'repo-id',
                        name: 'test-repo',
                        displayName: 'Test Repo',
                        url: 'https://test.bitbucket.org/repo',
                        fullName: 'test-owner/test-repo',
                        avatarUrl: 'https://test.com/repo-avatar.jpg',
                        issueTrackerEnabled: false,
                    },
                    branchName: 'main',
                    commitHash: 'commit456',
                },
                title: 'Test PR',
                htmlSummary: '<p>Test PR description</p>',
                rawSummary: 'Test PR description',
                ts: '2023-01-01T00:00:00Z',
                updatedTs: '2023-01-01T00:00:00Z',
                state: 'OPEN',
                closeSourceBranch: false,
                taskCount: 0,
                draft: false,
            },
        };

        // Mock Bitbucket API
        mockBbApi = {
            pullrequests: {
                getChangedFiles: jest.fn(),
                getConflictedFiles: jest.fn(),
                getComments: jest.fn(),
            },
        };

        mockClientForSite.mockResolvedValue(mockBbApi);

        commitNode = new CommitNode(mockPullRequest, mockCommit);
    });

    describe('constructor', () => {
        it('should create a CommitNode with the provided pull request and commit', () => {
            expect(commitNode).toBeInstanceOf(CommitNode);
            expect(commitNode).toBeInstanceOf(AbstractBaseNode);
        });
    });

    describe('getTreeItem', () => {
        it('should return a TreeItem with correct properties', () => {
            const treeItem = commitNode.getTreeItem();

            expect(treeItem).toBeInstanceOf(vscode.TreeItem);
            expect(treeItem.label).toBe('abc123d'); // First 7 characters of hash
            expect(treeItem.description).toBe('Test commit message');
            expect(treeItem.tooltip).toBe('Test commit message');
            expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
            expect(treeItem.resourceUri).toEqual(
                vscode.Uri.parse('https://test.bitbucket.org/commits/abc123def456ghi789'),
            );
        });

        it('should handle commit with short hash', () => {
            const shortHashCommit = {
                ...mockCommit,
                hash: 'abc123',
            };
            const shortHashNode = new CommitNode(mockPullRequest, shortHashCommit);

            const treeItem = shortHashNode.getTreeItem();
            expect(treeItem.label).toBe('abc123');
        });

        it('should handle commit with empty message', () => {
            const emptyMessageCommit = {
                ...mockCommit,
                message: '',
            };
            const emptyMessageNode = new CommitNode(mockPullRequest, emptyMessageCommit);

            const treeItem = emptyMessageNode.getTreeItem();
            expect(treeItem.description).toBe('');
            expect(treeItem.tooltip).toBe('');
        });
    });

    describe('fetchDataAndProcessChildren', () => {
        const mockDiffs = [{ path: 'file1.js' }];
        const mockConflictedFiles = [{ path: 'file2.js' }];
        const mockComments = { values: [] };
        const mockFileChangesNodes = [new SimpleNode('File changes')];

        beforeEach(() => {
            mockBbApi.pullrequests.getChangedFiles.mockResolvedValue(mockDiffs);
            mockBbApi.pullrequests.getConflictedFiles.mockResolvedValue(mockConflictedFiles);
            mockBbApi.pullrequests.getComments.mockResolvedValue(mockComments);
            mockCreateFileChangesNodes.mockResolvedValue(mockFileChangesNodes);
        });

        it('should fetch data and create file changes nodes successfully', async () => {
            const result = await commitNode.fetchDataAndProcessChildren();

            expect(mockClientForSite).toHaveBeenCalledWith(mockPullRequest.site);
            expect(mockBbApi.pullrequests.getChangedFiles).toHaveBeenCalledWith(mockPullRequest, mockCommit.hash);
            expect(mockBbApi.pullrequests.getConflictedFiles).toHaveBeenCalledWith(mockPullRequest);
            expect(mockBbApi.pullrequests.getComments).toHaveBeenCalledWith(mockPullRequest, mockCommit.hash);
            expect(mockCreateFileChangesNodes).toHaveBeenCalledWith(
                mockPullRequest,
                mockComments,
                mockDiffs,
                mockConflictedFiles,
                [],
                {
                    lhs: 'parent123',
                    rhs: 'abc123def456ghi789',
                },
            );
            expect(result).toBe(mockFileChangesNodes);
        });

        it('should handle commit with no parent hashes', async () => {
            const noParentCommit = {
                ...mockCommit,
                parentHashes: undefined,
            };
            const noParentNode = new CommitNode(mockPullRequest, noParentCommit);

            await noParentNode.fetchDataAndProcessChildren();

            expect(mockCreateFileChangesNodes).toHaveBeenCalledWith(
                mockPullRequest,
                mockComments,
                mockDiffs,
                mockConflictedFiles,
                [],
                {
                    lhs: '',
                    rhs: 'abc123def456ghi789',
                },
            );
        });

        it('should handle commit with empty parent hashes array', async () => {
            const emptyParentCommit = {
                ...mockCommit,
                parentHashes: [],
            };
            const emptyParentNode = new CommitNode(mockPullRequest, emptyParentCommit);

            await emptyParentNode.fetchDataAndProcessChildren();

            expect(mockCreateFileChangesNodes).toHaveBeenCalledWith(
                mockPullRequest,
                mockComments,
                mockDiffs,
                mockConflictedFiles,
                [],
                {
                    lhs: '',
                    rhs: 'abc123def456ghi789',
                },
            );
        });

        it('should handle errors and return error node', async () => {
            const error = new Error('API Error');
            mockClientForSite.mockRejectedValue(error);

            const result = await commitNode.fetchDataAndProcessChildren();

            expect(Logger.debug).toHaveBeenCalledWith('error fetching changed files', error);
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(SimpleNode);
            expect((result[0] as SimpleNode)._message).toBe('⚠️ Error: fetching changed files');
        });

        it('should handle error from getChangedFiles', async () => {
            const error = new Error('Changed files error');
            mockBbApi.pullrequests.getChangedFiles.mockRejectedValue(error);

            const result = await commitNode.fetchDataAndProcessChildren();

            expect(Logger.debug).toHaveBeenCalledWith('error fetching changed files', error);
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(SimpleNode);
        });

        it('should handle error from getConflictedFiles', async () => {
            const error = new Error('Conflicted files error');
            mockBbApi.pullrequests.getConflictedFiles.mockRejectedValue(error);

            const result = await commitNode.fetchDataAndProcessChildren();

            expect(Logger.debug).toHaveBeenCalledWith('error fetching changed files', error);
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(SimpleNode);
        });

        it('should handle error from getComments', async () => {
            const error = new Error('Comments error');
            mockBbApi.pullrequests.getComments.mockRejectedValue(error);

            const result = await commitNode.fetchDataAndProcessChildren();

            expect(Logger.debug).toHaveBeenCalledWith('error fetching changed files', error);
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(SimpleNode);
        });
    });

    describe('getChildren', () => {
        it('should return children from fetchDataAndProcessChildren when no element is provided', async () => {
            const mockChildren = [new SimpleNode('Test child')];
            const fetchSpy = jest.spyOn(commitNode, 'fetchDataAndProcessChildren').mockResolvedValue(mockChildren);

            const result = await commitNode.getChildren();

            expect(fetchSpy).toHaveBeenCalled();
            expect(result).toBe(mockChildren);
        });

        it('should return children from the provided element', async () => {
            const mockElement = new SimpleNode('Test element');
            const mockElementChildren = [new SimpleNode('Element child')];
            const getChildrenSpy = jest.spyOn(mockElement, 'getChildren').mockResolvedValue(mockElementChildren);

            const result = await commitNode.getChildren(mockElement);

            expect(getChildrenSpy).toHaveBeenCalled();
            expect(result).toBe(mockElementChildren);
        });

        it('should not call fetchDataAndProcessChildren when element is provided', async () => {
            const mockElement = new SimpleNode('Test element');
            const mockElementChildren = [new SimpleNode('Element child')];
            jest.spyOn(mockElement, 'getChildren').mockResolvedValue(mockElementChildren);
            const fetchSpy = jest.spyOn(commitNode, 'fetchDataAndProcessChildren');

            await commitNode.getChildren(mockElement);

            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe('integration', () => {
        it('should handle a complete flow from getTreeItem to getChildren', async () => {
            const mockFileChangesNodes = [new SimpleNode('File changes')];
            mockBbApi.pullrequests.getChangedFiles.mockResolvedValue([]);
            mockBbApi.pullrequests.getConflictedFiles.mockResolvedValue([]);
            mockBbApi.pullrequests.getComments.mockResolvedValue({ values: [] });
            mockCreateFileChangesNodes.mockResolvedValue(mockFileChangesNodes);

            // Get tree item
            const treeItem = commitNode.getTreeItem();
            expect(treeItem.label).toBe('abc123d');
            expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);

            // Get children
            const children = await commitNode.getChildren();
            expect(children).toBe(mockFileChangesNodes);
        });
    });
});
