jest.mock('../jira/treeViews/utils', () => ({
    JiraIssueNode: () => {}, // actually mocked below
}));
jest.mock('../../jira/issueForKey', () => ({
    issueForKey: () => Promise.reject('error'),
}));
jest.mock('../../resources', () => ({
    Resources: {
        icons: {
            get: jest.fn(() => 'mockIconPath'),
        },
    },
}));

import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { expansionCastTo } from 'testsutil';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';

import * as issueForKey from '../../jira/issueForKey';
import { JiraIssueNode } from '../jira/treeViews/utils';
import { RelatedIssuesNode } from './relatedIssuesNode';
import { SimpleNode } from './simpleNode';

class MockedJiraIssueNode {
    static NodeType = { RelatedJiraIssueInBitbucketPR: 'RelatedJiraIssueInBitbucketPR' };

    public readonly label: string;
    public readonly id: string;

    constructor(nodeType: any, issue: any) {
        this.label = issue.key;
        this.id = issue.source.id;
    }
}

describe('RelatedIssuesNode', () => {
    let mockIssueForKey: jest.SpyInstance<Promise<MinimalIssue<DetailedSiteInfo>>, any, any>;

    beforeAll(() => {
        (JiraIssueNode as any) = MockedJiraIssueNode;
    });

    beforeEach(() => {
        mockIssueForKey = jest
            .spyOn(issueForKey, 'issueForKey')
            .mockImplementation((key) => Promise.resolve(expansionCastTo<MinimalIssue<DetailedSiteInfo>>({ key })));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with correct properties when jiraKeys are provided', () => {
        const jiraKeys = ['JIRA-1', 'JIRA-2'];
        const label = 'Related Issues';
        const node = new RelatedIssuesNode('prId1', jiraKeys, label);

        expect(node.label).toBe(label);
        expect(node.collapsibleState).toBe(TreeItemCollapsibleState.Expanded);
        expect(node.iconPath).toBe('mockIconPath');
    });

    it('should initialize with correct properties when no jiraKeys are provided', () => {
        const jiraKeys: string[] = [];
        const label = 'Related Issues';
        const node = new RelatedIssuesNode('prId1', jiraKeys, label);

        expect(node.label).toBe(label);
        expect(node.collapsibleState).toBe(TreeItemCollapsibleState.None);
        expect(node.iconPath).toBe('mockIconPath');
    });

    it('should return children nodes when getChildren is called and jiraKeys are valid', async () => {
        const jiraKeys = ['JIRA-1', 'JIRA-2'];
        const label = 'Related Issues';

        const node = new RelatedIssuesNode('prId1', jiraKeys, label);
        const children = await node.getChildren();

        expect(children).toHaveLength(2);
        expect(children[0]).toBeInstanceOf(JiraIssueNode);
        expect(children[1]).toBeInstanceOf(JiraIssueNode);
    });

    it('should return a SimpleNode when getChildren is called and no issues are found', async () => {
        const jiraKeys = ['JIRA-1'];
        const label = 'Related Issues';

        mockIssueForKey.mockImplementation(() => Promise.reject(new Error('Issue not found')));

        const node = new RelatedIssuesNode('prId1', jiraKeys, label);
        const children = await node.getChildren();

        expect(children).toHaveLength(1);
        expect(children[0]).toBeInstanceOf(SimpleNode);
        const treeItem = await children[0].getTreeItem();
        expect(treeItem.label).toBe('No issues found');
    });

    it('should dispose without errors', () => {
        const jiraKeys = ['JIRA-1'];
        const label = 'Related Issues';
        const node = new RelatedIssuesNode('prId1', jiraKeys, label);

        expect(() => node.dispose()).not.toThrow();
    });

    it('returned children nodes have unique ids for different PRs', async () => {
        const jiraKeys = ['JIRA-1'];
        const label = 'Related Issues';

        const node1 = new RelatedIssuesNode('prId1', jiraKeys, label);
        const node2 = new RelatedIssuesNode('prId2', jiraKeys, label);

        const children1 = (await node1.getChildren()) as TreeItem[];
        const children2 = (await node2.getChildren()) as TreeItem[];

        expect(children1[0].label).toEqual(jiraKeys[0]);
        expect(children2[0].label).toEqual(jiraKeys[0]);

        expect(children1[0].id).not.toEqual(children2[0].id);
    });
});
