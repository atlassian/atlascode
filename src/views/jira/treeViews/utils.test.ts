import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { cloneDeep } from 'lodash';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { JQLEntry } from 'src/config/model';
import { expansionCastTo, forceCastTo } from 'testsutil';
import { Uri } from 'vscode';

import { Container } from '../../../container';
import * as issuesForJQL from '../../../jira/issuesForJql';
import { Logger } from '../../../logger';
import { executeJqlQuery, JiraIssueNode, TreeViewIssue } from './utils';

jest.mock('../../../container', () => ({
    Container: {
        siteManager: {
            getSiteForId: () =>
                expansionCastTo<DetailedSiteInfo>({ id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' }),
        },
    },
}));
jest.mock('../../../jira/issuesForJql', () => ({
    issuesForJQL: () => Promise.resolve([]),
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

const mockedJqlEntry = expansionCastTo<JQLEntry>({
    id: 'jqlId',
    siteId: 'siteDetailsId',
});

const mockedIssue1 = forceCastTo<TreeViewIssue>({
    key: 'AXON-1',
    isEpic: false,
    summary: 'summary1',
    status: { name: 'statusName', statusCategory: { name: 'To Do' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
    source: mockedJqlEntry,
    children: [],
});

const mockedIssue2 = forceCastTo<TreeViewIssue>({
    key: 'AXON-2',
    isEpic: false,
    summary: 'summary2',
    status: { name: 'statusName', statusCategory: { name: 'In Progress' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
    source: mockedJqlEntry,
    children: [mockedIssue1],
});

const mockedIssue3 = forceCastTo<TreeViewIssue>({
    key: 'AXON-3',
    isEpic: false,
    summary: 'summary3',
    status: { name: 'statusName', statusCategory: { name: 'Done' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
    source: mockedJqlEntry,
    children: [],
});

describe('utils', () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('executeJqlQuery', () => {
        it('returns an empty collection of issues for no JQL', async () => {
            const issues = await executeJqlQuery(undefined as unknown as JQLEntry);
            expect(issues).toHaveLength(0);
            expect(Logger.error).not.toHaveBeenCalled();
        });

        it('returns an empty collection of issues for no corresponding site', async () => {
            const jqlEntry = expansionCastTo<JQLEntry>({ id: 'id1', query: 'query1' });
            jest.spyOn(Container.siteManager, 'getSiteForId').mockReturnValue(undefined);

            const issues = await executeJqlQuery(jqlEntry);
            expect(issues).toHaveLength(0);
            expect(Logger.error).not.toHaveBeenCalled();
        });

        it('initializes the `source` and the `children` fields', async () => {
            const jqlEntry = expansionCastTo<JQLEntry>({ id: 'id1', query: 'query1' });
            const mockedMinimalIssues = [
                expansionCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'AXON-1' }),
                expansionCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'AXON-2' }),
                expansionCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'AXON-3' }),
            ];
            jest.spyOn(issuesForJQL, 'issuesForJQL').mockResolvedValue(mockedMinimalIssues);

            const issues = await executeJqlQuery(jqlEntry);

            expect(issues).toHaveLength(3);
            for (const issue of issues) {
                expect(issue.source).toBe(jqlEntry);
                expect(issue.children).toBeDefined();
                expect(issue.children).toHaveLength(0);
            }

            expect(Logger.error).not.toHaveBeenCalled();
        });

        it('logs an error in case of failure, and returns an empty collection of issues', async () => {
            const error = new Error('this is a failure');
            const jqlEntry = expansionCastTo<JQLEntry>({ id: 'id1', query: 'query1' });
            jest.spyOn(issuesForJQL, 'issuesForJQL').mockRejectedValue(error);

            const issues = await executeJqlQuery(jqlEntry);
            expect(issues).toHaveLength(0);
            expect(Logger.error).toHaveBeenCalledWith(error, expect.any(String));
        });
    });

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

        it('JiraIssueNode id is unique for the same Jira issue across different JQL entries', () => {
            const _mockedIssue1 = cloneDeep(mockedIssue1);
            _mockedIssue1.source = {
                id: 'jqlId1',
            };

            const _mockedIssue2 = cloneDeep(mockedIssue1);
            _mockedIssue2.source = {
                id: 'jqlId2',
            };

            const jiraIssueNode1 = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, _mockedIssue1);
            const jiraIssueNode2 = new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, _mockedIssue2);

            expect(jiraIssueNode1.id).not.toEqual(jiraIssueNode2.id);
        });
    });
});
