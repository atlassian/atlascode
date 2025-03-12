import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Container } from '../../../container';
import { CustomJQLViewProvider } from './customJqlViewProvider';
import * as utils from './utils';

const mockJqlEntries = [
    {
        id: '1',
        name: 'Test JQL Entry',
        query: 'project = TEST',
        siteId: '1',
        enabled: true,
        monitor: true,
    },
    {
        id: '2',
        name: 'Test JQL Entry 2',
        query: 'project = TEST',
        siteId: '1',
        enabled: true,
        monitor: true,
    },
];

const mockedIssue1 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-1',
    isEpic: false,
    summary: 'summary1',
    status: { name: 'statusName' },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

const mockedIssue2 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-2',
    isEpic: false,
    summary: 'summary2',
    status: { name: 'statusName' },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

jest.mock('../../../container', () => ({
    Container: {
        jqlManager: {
            getCustomJQLEntries: jest.fn(() => mockJqlEntries),
            onDidJQLChange: jest.fn(),
            updateFilters: jest.fn(),
        },
        siteManager: {
            onDidSitesAvailableChange: jest.fn(),
            productHasAtLeastOneSite: jest.fn(() => true),
        },
        context: {
            subscriptions: {
                push: jest.fn(),
            },
        },
        config: {
            jira: {
                explorer: {
                    nestSubtasks: false,
                },
            },
        },
    },
}));

const mockExecuteQuery = jest.fn().mockReturnValue(Promise.resolve([]));
jest.mock('../customJqlTree', () => {
    return {
        CustomJQLTree: jest.fn().mockImplementation(() => ({
            dispose: jest.fn(),
            executeQuery: mockExecuteQuery,
            setNumIssues: jest.fn(),
        })),
    };
});

jest.mock('../searchJiraHelper', () => ({
    SearchJiraHelper: {
        clearIssues: jest.fn(),
        setIssues: jest.fn(),
    },
}));

const mockCheckForNewIssues = jest.fn();
jest.mock('../../../jira/newIssueMonitor', () => {
    return {
        NewIssueMonitor: jest.fn().mockImplementation(() => ({
            checkForNewIssues: mockCheckForNewIssues,
        })),
    };
});

function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}

describe('CustomJqlViewProvider', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getChildren', () => {
        it('should return the list of custom JQLs as tree nodes', async () => {
            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.getCustomJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(2);

            expect(children[0].label).toBe('Test JQL Entry');
            expect(children[1].label).toBe('Test JQL Entry 2');
        });

        it('should return a the list of issues under a jql node', async () => {
            jest.spyOn(utils, 'executeJqlQuery').mockResolvedValue([mockedIssue1, mockedIssue2]);

            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            const jqlNode = children[0];
            expect(jqlNode).toBeDefined();

            const issues = await provider.getChildren(jqlNode);
            expect(issues).toHaveLength(2);

            expect(issues[0].label).toBe(mockedIssue1.key);
            expect(issues[0].description).toBe(mockedIssue1.summary);
            expect(issues[0].contextValue).toBe('jiraIssue');

            expect(issues[1].label).toBe(mockedIssue2.key);
            expect(issues[1].description).toBe(mockedIssue2.summary);
            expect(issues[1].contextValue).toBe('jiraIssue');
        });

        it("should return a 'No issues' node under a jql node without results", async () => {
            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            const jqlNode = children[0];
            expect(jqlNode).toBeDefined();

            const issues = await provider.getChildren(jqlNode);
            expect(issues).toHaveLength(1);

            expect(issues[0].label).toEqual('No issues match this query');
            expect(issues[0].command).toBeUndefined();
        });

        it("should return a 'Configure JQL entries' node if no jql entries are enabled", async () => {
            (Container.jqlManager.getCustomJQLEntries as jest.Mock).mockReturnValue([]);
            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.getCustomJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(1);

            expect(children[0].label).toEqual('Configure JQL entries in settings to view Jira issues');
            expect(children[0].command).toBeDefined();
        });

        it("should return a 'Login to Jira' node if no sites are available", async () => {
            (Container.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(false);
            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.getCustomJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(1);

            expect(children[0].label).toEqual('Please login to Jira');
            expect(children[0].command).toBeDefined();
        });
    });
});
