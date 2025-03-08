import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
const mockFeatureGateValues = {
    'atlascode-new-sidebar-treeview': true,
};
jest.mock('./simpleJiraIssueNode', () => {
    return {
        SimpleJiraIssueNode: jest.fn().mockImplementation(() => {
            return {
                getTreeItem: jest.fn().mockReturnValue({}),
            };
        }),
    };
});
jest.mock('../../commands', () => {
    return {
        Commands: {
            WorkbenchOpenRepository: 'workbench.openRepository',
            ShowIssue: 'showIssue',
        },
    };
});
jest.mock('../../util/featureFlags', () => {
    return {
        FeatureFlagClient: {
            featureGates: mockFeatureGateValues,
        },
        Features: {
            NewSidebarTreeView: 'atlascode-new-sidebar-treeview',
        },
    };
});
jest.mock('@atlassianlabs/jira-pi-common-models', () => {
    return {
        isMinimalIssue: jest.fn(() => true),
    };
});
const mockIssue: MinimalORIssueLink<DetailedSiteInfo> = {
    descriptionHtml: '<p>This is a test issue description</p>',
    issuelinks: [],
    transitions: [],
    siteDetails: {
        userId: 'user123',
        id: '',
        name: '',
        avatarUrl: '',
        baseLinkUrl: '',
        baseApiUrl: '',
        isCloud: false,
        credentialId: '',
        host: '',
        product: ProductJira,
    },
    epicLink: '',
    id: '1',
    self: 'https://example.com/issue/TEST-123',
    updated: new Date('2023-01-01T00:00:00.000Z'),
    description: 'This is a test issue description',
    key: 'TEST-123',
    summary: 'Test Issue',
    status: {
        name: 'To Do',
        statusCategory: {
            name: 'To Do',
            colorName: 'blue-gray',
            id: 1,
            key: 'key',
            self: '',
        },
        id: '1',
        iconUrl: 'https://example.com/status-icon.png',
        self: '',
        description: 'This is a test issue status',
    },
    isEpic: false,
    epicName: '',
    subtasks: [],
    epicChildren: [],
    issuetype: {
        id: '10001',
        name: 'Bug',
        description: 'A problem which impairs or prevents the functions of the product.',
        iconUrl: 'https://example.com/bug-icon.png',
        subtask: false,
        self: '',
        avatarId: 10002,
        epic: false,
    },
    priority: {
        id: '2',
        name: 'High',
        iconUrl: 'https://example.com/high-priority-icon.png',
    },
};

import { IssueNode } from './issueNode';
import * as vscode from 'vscode';
describe('IssueNode', () => {
    describe('getTreeItem', () => {
        it('should return a TreeItem with the issue key and summary if the new sidebar tree view feature flag is enabled', () => {
            mockFeatureGateValues['atlascode-new-sidebar-treeview'] = true;
            const issueNode = new IssueNode(mockIssue, undefined);
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.label).toBe(mockIssue.key);
            expect(treeItem.description).toBe(mockIssue.summary);
        });
        it('should return a TreeItem with the issue key and summary in title if the new sidebar tree view feature flag is disabled', () => {
            mockFeatureGateValues['atlascode-new-sidebar-treeview'] = false;
            const issueNode = new IssueNode(mockIssue, undefined);
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.label).toBe(`${mockIssue.key} ${mockIssue.summary}`);
            expect(treeItem.description).toBeUndefined();
        });
        it('should return a TreeItem with a collapsible state of Expanded if the issue has subtasks or epic children', () => {
            mockFeatureGateValues['atlascode-new-sidebar-treeview'] = true;
            const issueNode = new IssueNode({ ...mockIssue, subtasks: [mockIssue] }, undefined);
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Expanded);
        });

        it('should return a TreeItem with a collapsible state of None if the issue does not have subtasks or epic children', () => {
            mockFeatureGateValues['atlascode-new-sidebar-treeview'] = true;
            const issueNode = new IssueNode(mockIssue, undefined);
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
        });

        it('should return a TreeItem with a command to show the issue', () => {
            const issueNode = new IssueNode(mockIssue, undefined);
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.command).toEqual({ command: 'showIssue', title: 'Show Issue', arguments: [mockIssue] });
        });

        it('should return a TreeItem with Todo contextValue if the issue is a Todo statusCategory', () => {
            const issueNode = new IssueNode(mockIssue, undefined);
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.contextValue).toBe('todoJiraIssue');
        });
        it('should return a TreeItem with InProgress contextValue if the issue is an In Progress statusCategory', () => {
            const issueNode = new IssueNode(
                {
                    ...mockIssue,
                    status: {
                        ...mockIssue.status,
                        statusCategory: { ...mockIssue.status.statusCategory, name: 'In Progress' },
                    },
                },
                undefined,
            );
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.contextValue).toBe('inProgressJiraIssue');
        });
        it('should return a TreeItem with Done contextValue if the issue is a Done statusCategory', () => {
            const issueNode = new IssueNode(
                {
                    ...mockIssue,
                    status: {
                        ...mockIssue.status,
                        statusCategory: { ...mockIssue.status.statusCategory, name: 'Done' },
                    },
                },
                undefined,
            );
            const treeItem = issueNode.getTreeItem();
            expect(treeItem.contextValue).toBe('doneJiraIssue');
        });
    });

    describe('getChildren', () => {
        it('should return an empty array if the issue does not have subtasks or epic children', async () => {
            const issueNode = new IssueNode(mockIssue, undefined);
            const children = await issueNode.getChildren();
            expect(children).toEqual([]);
        });

        it('should return an array of IssueNodes for each subtask if the issue has subtasks', async () => {
            const issueNode = new IssueNode({ ...mockIssue, subtasks: [mockIssue] }, undefined);
            const children = await issueNode.getChildren();
            expect(children).toHaveLength(1);
            expect(children[0]).toBeInstanceOf(IssueNode);
        });

        it('should return an array of IssueNodes for each epic child if the issue has epic children', async () => {
            const issueNode = new IssueNode({ ...mockIssue, epicChildren: [mockIssue] }, undefined);
            const children = await issueNode.getChildren();
            expect(children).toHaveLength(1);
            expect(children[0]).toBeInstanceOf(IssueNode);
        });
    });
});
