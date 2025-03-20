import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { JiraIssueNode } from './utils';
import { Uri } from 'vscode';

function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}
jest.mock('vscode', () => {
    return {
        TreeItem: class {
            constructor(label: string) {}
            command = { command: '', title: '' };
        },
        TreeItemCollapsibleState: {
            None: 0,
            Collapsed: 1,
        },
        Uri: {
            parse: jest.fn((a) => a as Uri),
        },
    };
});
jest.mock('../../../container', () => ({
    Container: {
        siteManager: {
            getSiteForId: jest.fn(() =>
                forceCastTo<DetailedSiteInfo>({ id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' }),
            ),
        },
    },
}));
jest.mock('../../../commands', () => ({
    Commands: {
        ShowConfigPage: 'atlascode.showConfigPage',
        ShowIssue: 'atlascode.jira.showIssue',
    },
}));
jest.mock('../../../logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));
const mockedIssue1 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-1',
    isEpic: false,
    summary: 'summary1',
    status: { name: 'statusName', statusCategory: { name: 'To Do' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

const mockedIssue2 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-2',
    isEpic: false,
    summary: 'summary2',
    status: { name: 'statusName', statusCategory: { name: 'In Progress' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [mockedIssue1],
});

const mockedIssue3 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-3',
    isEpic: false,
    summary: 'summary3',
    status: { name: 'statusName', statusCategory: { name: 'Done' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('utils', () => {
    describe('JiraIssueNode', () => {
        it('should create a JiraIssueNode', () => {
            const jiraIssueNode = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, mockedIssue1);
            expect(jiraIssueNode).toBeDefined();
        });
        it('should append correct contextValues', () => {
            const jiraIssueNode1 = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, mockedIssue1);
            const jiraIssueNode2 = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, mockedIssue2);
            const jiraIssueNode3 = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, mockedIssue3);
            expect(jiraIssueNode1.contextValue).toBe('jiraIssue_todo');
            expect(jiraIssueNode2.contextValue).toBe('jiraIssue_inProgress');
            expect(jiraIssueNode3.contextValue).toBe('jiraIssue_done');
        });
        it('getChildren should return children', async () => {
            const jiraIssueNode = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, mockedIssue2);
            const children = await jiraIssueNode.getChildren();
            expect(children).toHaveLength(1);
        });
        it('getTreeItem should return resourceUri', async () => {
            const jiraIssueNode = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, mockedIssue1);
            const treeItem = await jiraIssueNode.getTreeItem();
            expect(treeItem.resourceUri).toEqual(Uri.parse('/siteDetails/browse/AXON-1'));
        });
    });
});
