import * as vscode from 'vscode';

import { FileStatus } from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Commands } from '../../constants';
import { Resources } from '../../resources';
import { DiffViewArgs } from '../pullrequest/diffViewHelper';
import { PullRequestContextValue } from '../pullrequest/pullRequestNode';
import { PullRequestFilesNode } from './pullRequestFilesNode';

// Mock dependencies
jest.mock('path', () => ({
    default: {
        basename: jest.fn().mockImplementation((filename: string) => {
            const parts = filename.split('/');
            return parts[parts.length - 1];
        }),
    },
}));
jest.mock('../../config/configuration');
jest.mock('../../resources');

describe('PullRequestFilesNode', () => {
    let mockDiffViewData: DiffViewArgs;
    let pullRequestFilesNode: PullRequestFilesNode;
    let mockTreeItem: vscode.TreeItem;
    let mockUri: vscode.Uri;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock TreeItem
        mockTreeItem = {
            label: '',
            tooltip: '',
            command: undefined,
            contextValue: '',
            resourceUri: undefined,
            iconPath: undefined,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
        } as vscode.TreeItem;

        // Setup mock Uri
        mockUri = {
            scheme: 'https',
            authority: 'bitbucket.org',
            path: '/test/repo',
            query: '',
            fragment: 'chg-test-file.ts',
            fsPath: '',
            with: jest.fn(),
            toJSON: jest.fn(),
        } as unknown as vscode.Uri;

        // Mock vscode.TreeItem constructor
        (vscode.TreeItem as jest.Mock) = jest.fn().mockImplementation((label, collapsibleState) => {
            mockTreeItem.label = label;
            mockTreeItem.collapsibleState = collapsibleState;
            return mockTreeItem;
        });

        // Mock vscode.Uri.parse
        (vscode.Uri.parse as jest.Mock) = jest.fn().mockReturnValue(mockUri);

        // Mock Resources.icons.get
        (Resources.icons.get as jest.Mock) = jest.fn().mockReturnValue('mock-icon-path');

        // Mock configuration.get
        (configuration.get as jest.Mock) = jest.fn().mockReturnValue(false);

        // Setup mock DiffViewArgs
        mockDiffViewData = {
            diffArgs: ['arg1', 'arg2'],
            fileDisplayData: {
                prUrl: 'https://bitbucket.org/test/repo/pull-requests/123',
                fileDisplayName: 'src/components/test-file.ts',
                fileDiffStatus: FileStatus.MODIFIED,
                isConflicted: false,
                numberOfComments: 0,
            },
        };

        pullRequestFilesNode = new PullRequestFilesNode(mockDiffViewData);
    });

    describe('constructor', () => {
        it('should initialize with correct diffViewData', () => {
            expect(pullRequestFilesNode['diffViewData']).toBe(mockDiffViewData);
        });
    });

    describe('getTreeItem', () => {
        it('should return TreeItem with correct properties when file has no comments', async () => {
            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith(
                'src/components/test-file.ts',
                vscode.TreeItemCollapsibleState.None,
            );
            expect(treeItem.tooltip).toBe('src/components/test-file.ts');
            expect(treeItem.command).toEqual({
                command: Commands.ViewDiff,
                title: 'Diff file',
                arguments: ['arg1', 'arg2'],
            });
            expect(treeItem.contextValue).toBe(PullRequestContextValue);
            expect(vscode.Uri.parse).toHaveBeenCalledWith(
                'https://bitbucket.org/test/repo/pull-requests/123#chg-src/components/test-file.ts',
            );
            expect(treeItem.resourceUri).toBe(mockUri);
        });

        it('should return TreeItem with comment emoji when file has comments', async () => {
            mockDiffViewData.fileDisplayData.numberOfComments = 3;

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith(
                '💬 src/components/test-file.ts',
                vscode.TreeItemCollapsibleState.None,
            );
            expect(treeItem).toBeDefined();
        });

        it('should use basename when nest files is enabled', async () => {
            (configuration.get as jest.Mock).mockReturnValue(true);

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith('test-file.ts', vscode.TreeItemCollapsibleState.None);
            expect(treeItem.tooltip).toBe('src/components/test-file.ts');
        });

        it('should use basename with comment emoji when nest files is enabled and has comments', async () => {
            (configuration.get as jest.Mock).mockReturnValue(true);
            mockDiffViewData.fileDisplayData.numberOfComments = 2;

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith('💬 test-file.ts', vscode.TreeItemCollapsibleState.None);
            expect(treeItem).toBeDefined();
        });

        describe('icon path based on file status', () => {
            it('should set add-circle icon for ADDED files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.ADDED;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('add-circle');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });

            it('should set delete icon for DELETED files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.DELETED;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('delete');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });

            it('should set warning icon for CONFLICT files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.CONFLICT;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('warning');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });

            it('should set edit icon for MODIFIED files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.MODIFIED;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('edit');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });

            it('should set edit icon for RENAMED files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.RENAMED;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('edit');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });

            it('should set edit icon for COPIED files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.COPIED;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('edit');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });

            it('should set edit icon for UNKNOWN files', async () => {
                mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.UNKNOWN;

                const treeItem = await pullRequestFilesNode.getTreeItem();

                expect(Resources.icons.get).toHaveBeenCalledWith('edit');
                expect(treeItem.iconPath).toBe('mock-icon-path');
            });
        });

        it('should override icon with warning when file is conflicted', async () => {
            mockDiffViewData.fileDisplayData.fileDiffStatus = FileStatus.ADDED;
            mockDiffViewData.fileDisplayData.isConflicted = true;

            const treeItem = await pullRequestFilesNode.getTreeItem();

            // Should call both icons, but warning should be the final one
            expect(Resources.icons.get).toHaveBeenCalledWith('add-circle');
            expect(Resources.icons.get).toHaveBeenCalledWith('warning');
            expect(treeItem.iconPath).toBe('mock-icon-path');
        });

        it('should handle configuration.get throwing an error', async () => {
            (configuration.get as jest.Mock).mockImplementation(() => {
                throw new Error('Configuration error');
            });

            // Should not throw and should use the full file name
            await expect(pullRequestFilesNode.getTreeItem()).rejects.toThrow('Configuration error');
        });
    });

    describe('getChildren', () => {
        it('should return empty array when no element is provided', async () => {
            const children = await pullRequestFilesNode.getChildren();

            expect(children).toEqual([]);
        });

        it('should return empty array when element is provided', async () => {
            const mockElement = {} as any;
            const children = await pullRequestFilesNode.getChildren(mockElement);

            expect(children).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('should handle empty file display name', async () => {
            mockDiffViewData.fileDisplayData.fileDisplayName = '';

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith('', vscode.TreeItemCollapsibleState.None);
            expect(treeItem.tooltip).toBe('');
        });

        it('should handle null/undefined values gracefully', async () => {
            mockDiffViewData.fileDisplayData.numberOfComments = 0;
            mockDiffViewData.fileDisplayData.isConflicted = undefined;

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(treeItem).toBeDefined();
            expect(treeItem.iconPath).toBe('mock-icon-path');
        });

        it('should handle negative comment count', async () => {
            mockDiffViewData.fileDisplayData.numberOfComments = -1;

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith(
                'src/components/test-file.ts',
                vscode.TreeItemCollapsibleState.None,
            );
            expect(treeItem).toBeDefined();
        });

        it('should handle very long file names', async () => {
            const longFileName =
                'src/very/deep/nested/directory/structure/with/many/levels/and/a/very/long/file/name/that/exceeds/normal/limits/test-file.ts';
            mockDiffViewData.fileDisplayData.fileDisplayName = longFileName;
            (configuration.get as jest.Mock).mockReturnValue(true);

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith('test-file.ts', vscode.TreeItemCollapsibleState.None);
            expect(treeItem.tooltip).toBe(longFileName);
        });

        it('should handle special characters in file names', async () => {
            const specialFileName = 'src/components/test-file@#$%^&*().ts';
            mockDiffViewData.fileDisplayData.fileDisplayName = specialFileName;

            const treeItem = await pullRequestFilesNode.getTreeItem();

            expect(vscode.TreeItem).toHaveBeenCalledWith(specialFileName, vscode.TreeItemCollapsibleState.None);
            expect(treeItem.tooltip).toBe(specialFileName);
        });
    });

    describe('inheritance', () => {
        it('should be instance of AbstractBaseNode', () => {
            expect(pullRequestFilesNode).toBeDefined();
            expect(typeof pullRequestFilesNode.getTreeItem).toBe('function');
            expect(typeof pullRequestFilesNode.getChildren).toBe('function');
        });
    });
});
