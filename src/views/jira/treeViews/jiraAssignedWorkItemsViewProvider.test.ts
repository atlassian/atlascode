import { AssignedWorkItemsViewProvider } from './jiraAssignedWorkItemsViewProvider';
import { Container } from '../../../container';
import { JQLManager } from '../../../jira/jqlManager';
import { SiteManager } from '../../../siteManager';
import { Disposable } from 'vscode';
import { JQLEntry } from '../../../config/model';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';

function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}

const mockedJqlEntry = forceCastTo<JQLEntry>({
    id: 'jqlId',
});

const mockedIssue1 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-1',
    isEpic: false,
    summary: 'summary1',
    status: { name: 'statusName', statusCategory: { name: 'To Do' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
    jqlSource: mockedJqlEntry,
    children: [],
});

const mockedIssue2 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-2',
    isEpic: false,
    summary: 'summary2',
    status: { name: 'statusName', statusCategory: { name: 'In Progress' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
    jqlSource: mockedJqlEntry,
    children: [],
});

const mockedIssue3 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-3',
    isEpic: false,
    summary: 'summary3',
    status: { name: 'statusName', statusCategory: { name: 'Done' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
    jqlSource: mockedJqlEntry,
    children: [],
});

jest.mock('../searchJiraHelper');
jest.mock('../../../container', () => ({
    Container: {
        jqlManager: {
            getAllDefaultJQLEntries: () => [],
            onDidJQLChange: () => new Disposable(() => {}),
        } as Partial<JQLManager>,

        siteManager: {
            onDidSitesAvailableChange: () => new Disposable(() => {}),
        } as Partial<SiteManager>,
        context: {
            subscriptions: {
                push: jest.fn(),
            },
        },
        config: {
            jira: {
                explorer: {
                    enabled: true,
                },
            },
        },
    },
}));

class PromiseRacerMockClass {
    public static LastInstance: PromiseRacerMockClass | undefined = undefined;
    private count: number;
    private mockedData: any[] = [];
    constructor(promises: any[]) {
        this.count = promises.length;
        PromiseRacerMockClass.LastInstance = this;
        jest.spyOn(PromiseRacerMockClass.LastInstance, 'isEmpty');
        jest.spyOn(PromiseRacerMockClass.LastInstance, 'next');
    }
    mockData(data: any[]) {
        this.mockedData.push(data);
    }
    isEmpty() {
        return !this.count;
    }
    next() {
        if (this.count) {
            --this.count;
            return Promise.resolve(this.mockedData.pop() || []);
        } else {
            throw new Error('error');
        }
    }
}

jest.mock('../../../util/promises', () => ({
    PromiseRacer: jest.fn().mockImplementation((promises) => new PromiseRacerMockClass(promises)),
}));

describe('AssignedWorkItemsViewProvider', () => {
    let provider: AssignedWorkItemsViewProvider | undefined;

    beforeEach(() => {
        provider = undefined;
    });

    afterEach(() => {
        provider?.dispose();
        jest.restoreAllMocks();
    });

    describe('getAllDefaultJQLEntries', () => {
        it('should initialize with configure Jira message if no JQL entries', async () => {
            jest.spyOn(Container.jqlManager, 'getAllDefaultJQLEntries').mockReturnValue([]);
            provider = new AssignedWorkItemsViewProvider();

            const children = await provider.getChildren();
            expect(children).toHaveLength(1);
            expect(children[0].label).toBe('Please login to Jira');
            expect(children[0].command).toBeDefined();

            expect(PromiseRacerMockClass.LastInstance).toBeUndefined();
        });

        it('should initialize with JQL promises if JQL entries exist, returns empty', async () => {
            const jqlEntries = [forceCastTo<JQLEntry>({ siteId: 'site1', query: 'query1' })];
            jest.spyOn(Container.jqlManager, 'getAllDefaultJQLEntries').mockReturnValue(jqlEntries);
            provider = new AssignedWorkItemsViewProvider();

            expect(PromiseRacerMockClass.LastInstance).toBeDefined();

            const children = await provider.getChildren();

            expect(PromiseRacerMockClass.LastInstance?.isEmpty).toHaveBeenCalled();
            expect(PromiseRacerMockClass.LastInstance?.next).toHaveBeenCalled();
            expect(children).toHaveLength(0);
        });

        it('should initialize with JQL promises if JQL entries exist, returns issues', async () => {
            const jqlEntries = [forceCastTo<JQLEntry>({ siteId: 'site1', query: 'query1' })];
            jest.spyOn(Container.jqlManager, 'getAllDefaultJQLEntries').mockReturnValue(jqlEntries);
            provider = new AssignedWorkItemsViewProvider();

            expect(PromiseRacerMockClass.LastInstance).toBeDefined();

            PromiseRacerMockClass.LastInstance?.mockData([mockedIssue1, mockedIssue2, mockedIssue3]);
            const children = await provider.getChildren();

            expect(PromiseRacerMockClass.LastInstance?.isEmpty).toHaveBeenCalled();
            expect(PromiseRacerMockClass.LastInstance?.next).toHaveBeenCalled();
            expect(children).toHaveLength(3);

            expect(children[0].label).toBe(mockedIssue1.key);
            expect(children[0].description).toBe(mockedIssue1.summary);
            expect(children[0].contextValue).toBe('assignedJiraIssue_todo');

            expect(children[1].label).toBe(mockedIssue2.key);
            expect(children[1].description).toBe(mockedIssue2.summary);
            expect(children[1].contextValue).toBe('assignedJiraIssue_inProgress');

            expect(children[2].label).toBe(mockedIssue3.key);
            expect(children[2].description).toBe(mockedIssue3.summary);
            expect(children[2].contextValue).toBe('assignedJiraIssue_done');
        });
    });

    describe('onDidJQLChange', () => {
        it('onDidJQLChange is registered during construction', async () => {
            let onDidJQLChangeCallback = undefined;
            jest.spyOn(Container.jqlManager, 'onDidJQLChange').mockImplementation((func: any, parent: any): any => {
                onDidJQLChangeCallback = (...args: any[]) => func.apply(parent, args);
            });

            provider = new AssignedWorkItemsViewProvider();

            expect(onDidJQLChangeCallback).toBeDefined();
        });
    });

    describe('onDidSitesAvailableChange', () => {
        it('onDidSitesAvailableChange is registered during construction', async () => {
            let onDidSitesAvailableChangeCallback = undefined;
            jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                (func: any, parent: any): any => {
                    onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                },
            );

            provider = new AssignedWorkItemsViewProvider();

            expect(onDidSitesAvailableChangeCallback).toBeDefined();
        });
    });
});
