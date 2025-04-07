import { expansionCastTo, forceCastTo } from '../../../../testsutil';
import { AssignedWorkItemsViewProvider } from './jiraAssignedWorkItemsViewProvider';
import { Container } from '../../../container';
import { JQLManager } from '../../../jira/jqlManager';
import { SiteManager } from '../../../siteManager';
import { Disposable } from 'vscode';
import { JQLEntry } from '../../../config/model';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import * as vscode from 'vscode';
import { PromiseRacer } from 'src/util/promises';
import { JiraNotifier } from './jiraNotifier';
import { RefreshTimer } from 'src/views/RefreshTimer';

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

jest.mock('./jiraNotifier');
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

type ExtractPublic<T> = { [P in keyof T]: T[P] };

class PromiseRacerMockClass implements ExtractPublic<PromiseRacer<any>> {
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

class JiraNotifierMockClass implements ExtractPublic<JiraNotifier> {
    public static LastInstance: JiraNotifierMockClass | undefined = undefined;
    constructor() {
        JiraNotifierMockClass.LastInstance = this;
    }
    public ignoreAssignedIssues(issues: MinimalIssue<DetailedSiteInfo>[]): void {}
    public notifyForNewAssignedIssues(issues: MinimalIssue<DetailedSiteInfo>[]): void {}
}

jest.mock('./jiraNotifier', () => ({
    JiraNotifier: jest.fn().mockImplementation(() => new JiraNotifierMockClass()),
}));

class RefreshTimerMockClass implements ExtractPublic<RefreshTimer> {
    public static LastInstance: RefreshTimerMockClass | undefined = undefined;
    constructor(
        _enabledConfigPath: string | undefined,
        _intervalConfigPath: string,
        public refreshFunc: () => void,
    ) {
        RefreshTimerMockClass.LastInstance = this;
    }
    dispose(): void {}
    isEnabled(): boolean {
        return false;
    }
    setActive(active: boolean): void {}
}

jest.mock('../../RefreshTimer', () => ({
    RefreshTimer: jest
        .fn()
        .mockImplementation(
            (enabledConfigPath, intervalConfigPath, refreshFunc) =>
                new RefreshTimerMockClass(enabledConfigPath, intervalConfigPath, refreshFunc),
        ),
}));

const mockedTreeView = {
    onDidChangeVisibility: () => {},
};

describe('AssignedWorkItemsViewProvider', () => {
    let provider: AssignedWorkItemsViewProvider | undefined;

    beforeEach(() => {
        jest.spyOn(vscode.window, 'createTreeView').mockReturnValue(mockedTreeView as any);
        provider = undefined;

        PromiseRacerMockClass.LastInstance = undefined;
        JiraNotifierMockClass.LastInstance = undefined;
        RefreshTimerMockClass.LastInstance = undefined;
    });

    afterEach(() => {
        provider?.dispose();
        jest.restoreAllMocks();
    });

    describe('initialization', () => {
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

        it('RefreshTimer is registered during construction and triggers refresh', async () => {
            let dataChanged = false;

            provider = new AssignedWorkItemsViewProvider();
            provider.onDidChangeTreeData(() => (dataChanged = true), undefined);

            expect(RefreshTimerMockClass.LastInstance).toBeDefined();

            RefreshTimerMockClass.LastInstance?.refreshFunc();
            expect(dataChanged).toBeTruthy();
        });
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
            const jqlEntries = [expansionCastTo<JQLEntry>({ siteId: 'site1', query: 'query1' })];
            jest.spyOn(Container.jqlManager, 'getAllDefaultJQLEntries').mockReturnValue(jqlEntries);
            provider = new AssignedWorkItemsViewProvider();

            expect(PromiseRacerMockClass.LastInstance).toBeDefined();

            const children = await provider.getChildren();

            expect(PromiseRacerMockClass.LastInstance?.isEmpty).toHaveBeenCalled();
            expect(PromiseRacerMockClass.LastInstance?.next).toHaveBeenCalled();
            expect(children).toHaveLength(0);
        });

        it('should initialize with JQL promises if JQL entries exist, returns issues', async () => {
            const jqlEntries = [expansionCastTo<JQLEntry>({ siteId: 'site1', query: 'query1' })];
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

    describe('JiraNotifier', () => {
        it("doesn't notify when the provider is fetching for the first time", async () => {
            const jqlEntries = [expansionCastTo<JQLEntry>({ siteId: 'site1', query: 'query1' })];

            jest.spyOn(Container.jqlManager, 'getAllDefaultJQLEntries').mockReturnValue(jqlEntries);
            jest.spyOn(vscode.window, 'showInformationMessage');

            provider = new AssignedWorkItemsViewProvider();

            jest.spyOn(JiraNotifierMockClass.LastInstance!, 'ignoreAssignedIssues');
            jest.spyOn(JiraNotifierMockClass.LastInstance!, 'notifyForNewAssignedIssues');

            PromiseRacerMockClass.LastInstance?.mockData([mockedIssue1, mockedIssue2, mockedIssue3]);
            await provider.getChildren();

            expect(JiraNotifierMockClass.LastInstance!.ignoreAssignedIssues).toHaveBeenCalled();
            expect(JiraNotifierMockClass.LastInstance!.notifyForNewAssignedIssues).not.toHaveBeenCalled();
        });

        it('it notifies for newly fetched items', async () => {
            const jqlEntries = [expansionCastTo<JQLEntry>({ siteId: 'site1', query: 'query1' })];

            jest.spyOn(Container.jqlManager, 'getAllDefaultJQLEntries').mockReturnValue(jqlEntries);
            jest.spyOn(vscode.window, 'showInformationMessage');

            provider = new AssignedWorkItemsViewProvider();

            PromiseRacerMockClass.LastInstance?.mockData([mockedIssue1, mockedIssue2, mockedIssue3]);
            await provider.getChildren();

            jest.spyOn(JiraNotifierMockClass.LastInstance!, 'ignoreAssignedIssues');
            jest.spyOn(JiraNotifierMockClass.LastInstance!, 'notifyForNewAssignedIssues');

            await provider.getChildren();

            expect(JiraNotifierMockClass.LastInstance!.ignoreAssignedIssues).not.toHaveBeenCalled();
            expect(JiraNotifierMockClass.LastInstance!.notifyForNewAssignedIssues).toHaveBeenCalled();
        });
    });
});
