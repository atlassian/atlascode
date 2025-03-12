import { AssignedWorkItemsViewProvider } from './jiraAssignedWorkItemsViewProvider';
import { Container } from '../../../container';
import { JQLManager } from 'src/jira/jqlManager';
import { SiteManager } from 'src/siteManager';
import { Disposable } from 'vscode';
import { JQLEntry } from '../../../config/model';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}

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

        PromiseRacerMockClass.LastInstance?.mockData([mockedIssue1, mockedIssue2]);
        const children = await provider.getChildren();

        expect(PromiseRacerMockClass.LastInstance?.isEmpty).toHaveBeenCalled();
        expect(PromiseRacerMockClass.LastInstance?.next).toHaveBeenCalled();
        expect(children).toHaveLength(2);

        expect(children[0].label).toBe(mockedIssue1.key);
        expect(children[0].description).toBe(mockedIssue1.summary);
        expect(children[0].contextValue).toBe('assignedJiraIssue');

        expect(children[1].label).toBe(mockedIssue2.key);
        expect(children[1].description).toBe(mockedIssue2.summary);
        expect(children[1].contextValue).toBe('assignedJiraIssue');
    });
});
