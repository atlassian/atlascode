import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { it } from '@jest/globals';
import { expansionCastTo, forceCastTo } from 'testsutil';
import * as vscode from 'vscode';
import { window } from 'vscode';

import { DetailedSiteInfo, ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
import * as commandContext from '../../../commandContext';
import { configuration, JQLEntry } from '../../../config/configuration';
import { Container } from '../../../container';
import { PromiseRacer } from '../../../util/promises';
import { RefreshTimer } from '../../../views/RefreshTimer';
import { BadgeDelegate } from '../../notifications/badgeDelegate';
import { JiraNotifier } from '../../notifications/jiraNotifier';
import { AssignedWorkItemsViewProvider } from './jiraAssignedWorkItemsViewProvider';

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
    source: mockedJqlEntry,
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
    source: mockedJqlEntry,
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
    source: mockedJqlEntry,
    children: [],
});

jest.mock('../../notifications/badgeDelegate');
jest.mock('../../notifications/jiraNotifier');
jest.mock('../searchJiraHelper');
jest.mock('../../RefreshTimer');
jest.mock('../../../logger');
jest.mock('../../../analytics', () => ({
    viewScreenEvent: () => Promise.resolve({ eventName: 'viewScreenEvent' }),
}));
jest.mock('../../../config/configuration', () => ({
    configuration: {
        onDidChange: (func: any, thisArg: any) => ({ func, thisArg }),
        changed: () => false,
    },
}));
jest.mock('../../../container', () => ({
    Container: {
        jqlManager: {
            getAllDefaultJQLEntries: () => [],
            onDidJQLChange: () => new vscode.Disposable(() => {}),
        },
        siteManager: {
            onDidSitesAvailableChange: () => new vscode.Disposable(() => {}),
            productHasAtLeastOneSite: () => true,
        },
        context: {
            subscriptions: [],
        },
        config: {
            jira: {
                explorer: {
                    enabled: true,
                },
            },
        },
        analyticsClient: {
            sendScreenEvent: () => {},
        },
    },
}));
jest.mock('../../../util/featureFlags', () => ({
    FeatureFlagClient: {
        checkGate: jest.fn().mockResolvedValue(true),
    },
    Features: {
        AuthBadgeNotification: 'AuthBadgeNotification',
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

jest.mock('../../notifications/jiraNotifier', () => ({
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

const mockedTreeView = expansionCastTo<vscode.TreeView<vscode.TreeItem>>({
    onDidChangeVisibility: () => new vscode.Disposable(() => {}),
});

describe('AssignedWorkItemsViewProvider', () => {
    let provider: AssignedWorkItemsViewProvider | undefined;
    let createTreeViewMock: jest.SpyInstance<
        vscode.TreeView<unknown>,
        [viewId: string, options: vscode.TreeViewOptions<unknown>],
        any
    >;

    beforeEach(() => {
        jest.spyOn(window, 'createTreeView').mockReturnValue(mockedTreeView as any);
        provider = undefined;

        PromiseRacerMockClass.LastInstance = undefined;
        JiraNotifierMockClass.LastInstance = undefined;
        RefreshTimerMockClass.LastInstance = undefined;
        provider = undefined;

        jest.spyOn(vscode.window, 'createTreeView').mockReturnValue(mockedTreeView as any);
        createTreeViewMock = jest.spyOn(vscode.window, 'createTreeView').mockReturnValue(mockedTreeView);
    });

    afterEach(() => {
        provider?.dispose();
        jest.restoreAllMocks();
    });

    describe('initialization', () => {
        it('constructor triggers the onDidChangeTreeData event', () => {
            let registeredProviderObj = undefined;
            let onDidChangeTreeDataFired = false;

            createTreeViewMock.mockImplementation((viewId, providerObj) => {
                expect(viewId).toEqual('atlascode.views.jira.assignedWorkItemsTreeView');
                registeredProviderObj = providerObj.treeDataProvider;
                registeredProviderObj.onDidChangeTreeData!(() => (onDidChangeTreeDataFired = true));
                return mockedTreeView;
            });

            provider = new AssignedWorkItemsViewProvider();

            expect(registeredProviderObj).toBe(provider);
            expect(onDidChangeTreeDataFired).toBeTruthy();
        });

        it('RefreshTimer is registered during construction and triggers refresh', async () => {
            let dataChanged = false;

            provider = new AssignedWorkItemsViewProvider();
            provider.onDidChangeTreeData(() => (dataChanged = true), undefined);

            expect(RefreshTimerMockClass.LastInstance).toBeDefined();

            RefreshTimerMockClass.LastInstance?.refreshFunc();
            expect(dataChanged).toBeTruthy();
        });

        it('JiraBadgeManager is initialized', () => {
            provider = new AssignedWorkItemsViewProvider();
            expect(BadgeDelegate.initialize).toHaveBeenCalled();
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
            jest.spyOn(window, 'showInformationMessage');

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
            jest.spyOn(window, 'showInformationMessage');

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

        it.each([ProductJira, ProductBitbucket])(
            'onDidSitesAvailableChange callback refreshes only for Jira sites changes (%p)',
            (product) => {
                let onDidSitesAvailableChangeCallback = undefined;
                jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                    (func: any, parent: any): any => {
                        onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                    },
                );

                provider = new AssignedWorkItemsViewProvider();

                const refreshCallback = jest.fn();
                provider.onDidChangeTreeData(refreshCallback);

                onDidSitesAvailableChangeCallback!({ product });

                if (product.key === ProductJira.key) {
                    expect(refreshCallback).toHaveBeenCalledTimes(1);
                } else {
                    expect(refreshCallback).not.toHaveBeenCalled();
                }
            },
        );
    });

    describe('onDidChangeVisibility', () => {
        it('onDidChangeVisibility is registered during construction', async () => {
            jest.spyOn(mockedTreeView, 'onDidChangeVisibility');

            provider = new AssignedWorkItemsViewProvider();

            expect(mockedTreeView.onDidChangeVisibility).toHaveBeenCalled();
        });

        it('the onDidChangeVisibility callback sends telemetry if the panel is visible and there are Jira sites configured', async () => {
            let onDidChangeVisibilityCallback = undefined;
            jest.spyOn(mockedTreeView, 'onDidChangeVisibility').mockImplementation((func: any, parent: any): any => {
                onDidChangeVisibilityCallback = (...args: any[]) => func.apply(parent, args);
            });

            provider = new AssignedWorkItemsViewProvider();

            expect(onDidChangeVisibilityCallback).toBeDefined();

            jest.spyOn(Container.analyticsClient, 'sendScreenEvent');
            jest.spyOn(Container.siteManager, 'productHasAtLeastOneSite').mockReturnValue(true);

            const event = expansionCastTo<vscode.TreeViewVisibilityChangeEvent>({
                visible: true,
            });
            await onDidChangeVisibilityCallback!(event);

            expect(Container.analyticsClient.sendScreenEvent).toHaveBeenCalledWith({ eventName: 'viewScreenEvent' });
        });

        it("the onDidChangeVisibility doesn't send telemetry if the panel is not visible", async () => {
            let onDidChangeVisibilityCallback = undefined;
            jest.spyOn(mockedTreeView, 'onDidChangeVisibility').mockImplementation((func: any, parent: any): any => {
                onDidChangeVisibilityCallback = (...args: any[]) => func.apply(parent, args);
            });

            provider = new AssignedWorkItemsViewProvider();

            expect(onDidChangeVisibilityCallback).toBeDefined();

            jest.spyOn(Container.analyticsClient, 'sendScreenEvent');
            jest.spyOn(Container.siteManager, 'productHasAtLeastOneSite').mockReturnValue(true);

            const event = expansionCastTo<vscode.TreeViewVisibilityChangeEvent>({
                visible: false,
            });
            await onDidChangeVisibilityCallback!(event);

            expect(Container.analyticsClient.sendScreenEvent).not.toHaveBeenCalled();
        });

        it("the onDidChangeVisibility doesn't send telemetry if there aren't Jira sites configured", async () => {
            let onDidChangeVisibilityCallback = undefined;
            jest.spyOn(mockedTreeView, 'onDidChangeVisibility').mockImplementation((func: any, parent: any): any => {
                onDidChangeVisibilityCallback = (...args: any[]) => func.apply(parent, args);
            });

            provider = new AssignedWorkItemsViewProvider();

            expect(onDidChangeVisibilityCallback).toBeDefined();

            jest.spyOn(Container.analyticsClient, 'sendScreenEvent');
            jest.spyOn(Container.siteManager, 'productHasAtLeastOneSite').mockReturnValue(false);

            const event = expansionCastTo<vscode.TreeViewVisibilityChangeEvent>({
                visible: true,
            });
            await onDidChangeVisibilityCallback!(event);

            expect(Container.analyticsClient.sendScreenEvent).not.toHaveBeenCalled();
        });
    });

    describe('onConfigurationChanged', () => {
        it('onConfigurationChanged is registered during construction', async () => {
            jest.spyOn(mockedTreeView, 'onDidChangeVisibility');
            const currentSubscriptionCount = Container.context.subscriptions.length;

            provider = new AssignedWorkItemsViewProvider();

            expect(Container.context.subscriptions).toHaveLength(currentSubscriptionCount + 1);
        });

        it.each([[true], [false]])(
            'onConfigurationChanged enabled or disables the panel depending on jira.explorer.enabled setting (%p)',
            (explorerEnabled) => {
                jest.spyOn(configuration, 'changed').mockImplementation((e, name) => name === 'jira.explorer.enabled');
                Container.config.jira.explorer.enabled = explorerEnabled;

                provider = new AssignedWorkItemsViewProvider();

                jest.spyOn(commandContext, 'setCommandContext');

                const callbackObj = Container.context.subscriptions[0] as any;
                callbackObj.func.call(callbackObj.thisArg);

                expect(commandContext.setCommandContext).toHaveBeenCalledWith(
                    commandContext.CommandContext.AssignedIssueExplorer,
                    explorerEnabled,
                );
            },
        );

        it.each([
            ['jira', false],
            ['jira.jqlList', false],
            ['jira.explorer', true],
            ['jira.explorer.enabled', true],
            ['jira.explorer.collapsed', false],
        ])('onConfigurationChanged refreshes if one relevant config is changed (%p)', (configName, expectedRefresh) => {
            jest.spyOn(configuration, 'changed').mockImplementation((e, name) => name === configName);

            provider = new AssignedWorkItemsViewProvider();

            const refreshCallback = jest.fn();
            provider.onDidChangeTreeData(refreshCallback);

            const callbackObj = Container.context.subscriptions[Container.context.subscriptions.length - 1] as any;
            callbackObj.func.call(callbackObj.thisArg);

            if (expectedRefresh) {
                expect(refreshCallback).toHaveBeenCalledTimes(1);
            } else {
                expect(refreshCallback).not.toHaveBeenCalled();
            }
        });
    });
});
