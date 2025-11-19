import { it } from '@jest/globals';
import { expansionCastTo, forceCastTo } from 'testsutil';
import * as vscode from 'vscode';

import { ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
import * as commandContext from '../../../commandContext';
import { configuration, JQLEntry } from '../../../config/configuration';
import { Container } from '../../../container';
import { CustomJQLViewProvider } from './customJqlViewProvider';
import { TreeViewIssue } from './utils';
import * as utils from './utils';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms || 1));
}

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

function getMockedIssue(key: string, status: 'To Do' | 'In Progress' | 'Done', parentKey?: string): TreeViewIssue {
    return forceCastTo<TreeViewIssue>({
        key,
        isEpic: false,
        summary: `${key} summary`,
        status: { name: 'statusName', statusCategory: { name: status } },
        priority: { name: 'priorityName' },
        siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
        issuetype: { iconUrl: '/issueType/' },
        parentKey,
        subtasks: [],
        source: mockJqlEntries[0], // this must be set to the source jql query for this issue
        children: [], // this must be set to empty
    });
}

jest.mock('../searchJiraHelper');
jest.mock('../../RefreshTimer');
jest.mock('../../../logger');
jest.mock('../../../analytics', () => ({
    viewScreenEvent: () => Promise.resolve({ eventName: 'viewScreenEvent' }),
}));
jest.mock('../../../jira/fetchIssue', () => ({
    fetchMinimalIssue: (issueKey: string) => Promise.resolve(getMockedIssue(issueKey, 'To Do')),
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
            enabledJQLEntries: () => mockJqlEntries,
            onDidJQLChange: () => {},
            updateFilters: () => {},
            initializeJQL: () => {},
        },
        siteManager: {
            onDidSitesAvailableChange: () => {},
            productHasAtLeastOneSite: () => true,
        },
        context: {
            subscriptions: [],
        },
        config: {
            jira: {
                explorer: {
                    // all these values are re-set in beforeEach()
                    enabled: true,
                    nestSubtasks: false,
                },
            },
        },
        analyticsClient: {
            sendScreenEvent: () => {},
        },
    },
}));

const mockedTreeView = expansionCastTo<vscode.TreeView<vscode.TreeItem>>({
    onDidChangeVisibility: () => new vscode.Disposable(() => {}),
});

describe('CustomJqlViewProvider', () => {
    let executeJqlQueryMock: jest.SpyInstance<Promise<TreeViewIssue[]>, [jqlEntry: JQLEntry], any>;
    let createTreeViewMock: jest.SpyInstance<
        vscode.TreeView<unknown>,
        [viewId: string, options: vscode.TreeViewOptions<unknown>],
        any
    >;
    let provider: CustomJQLViewProvider | undefined;

    beforeEach(() => {
        (Container.context.subscriptions as any) = [];
        Container.config.jira.explorer.enabled = true;
        Container.config.jira.explorer.nestSubtasks = false;
        provider = undefined;

        executeJqlQueryMock = jest.spyOn(utils, 'executeJqlQuery').mockResolvedValue([]);
        createTreeViewMock = jest.spyOn(vscode.window, 'createTreeView').mockReturnValue(mockedTreeView);
    });

    afterEach(() => {
        provider?.dispose();
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('constructor triggers the onDidChangeTreeData event', () => {
        let registeredProviderObj = undefined;
        let onDidChangeTreeDataFired = false;

        createTreeViewMock.mockImplementation((viewId, providerObj) => {
            expect(viewId).toEqual('atlascode.views.jira.customJqlTreeView');
            registeredProviderObj = providerObj.treeDataProvider;
            registeredProviderObj.onDidChangeTreeData!(() => (onDidChangeTreeDataFired = true));
            return mockedTreeView;
        });

        provider = new CustomJQLViewProvider();

        expect(registeredProviderObj).toBe(provider);
        expect(onDidChangeTreeDataFired).toBeTruthy();
    });

    it('getTreeItem is an identity function', () => {
        provider = new CustomJQLViewProvider();

        expect(provider.getTreeItem('hello' as any)).toEqual('hello');
        expect(provider.getTreeItem(10 as any)).toEqual(10);
        expect(provider.getTreeItem({ a: 'a' } as any)).toEqual({ a: 'a' });
    });

    describe('getChildren', () => {
        it('should return the list of custom JQLs as tree nodes', async () => {
            jest.spyOn(Container.jqlManager, 'enabledJQLEntries');

            provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.enabledJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(2);

            expect(children[0].label).toBe('Test JQL Entry');
            expect(children[1].label).toBe('Test JQL Entry 2');
        });

        it.each([[false], [true]])(
            'should return a the list of issues under a jql node (nestSubtasks %p)',
            async (nestSubtasks) => {
                Container.config.jira.explorer.nestSubtasks = nestSubtasks;

                const parentKey = 'AXON-123';
                const mockedIssue1 = getMockedIssue('AXON-1', 'To Do', parentKey);
                const mockedIssue2 = getMockedIssue('AXON-2', 'In Progress');
                const mockedIssue3 = getMockedIssue('AXON-3', 'Done', parentKey);

                executeJqlQueryMock.mockResolvedValue([mockedIssue1, mockedIssue2, mockedIssue3]);

                provider = new CustomJQLViewProvider();
                const children = await provider.getChildren();

                const jqlNode = children[0];
                expect(jqlNode).toBeDefined();

                const issues = await provider.getChildren(jqlNode);

                if (nestSubtasks) {
                    expect(issues).toHaveLength(2);

                    expect(issues[0].label).toBe(mockedIssue2.key);
                    expect(issues[0].description).toBe(mockedIssue2.summary);
                    expect(issues[0].contextValue).toBe('jiraIssue_inProgress');

                    expect(await provider.getChildren(issues[0])).toHaveLength(0);

                    expect(issues[1].label).toBe(parentKey);
                    expect(issues[1].contextValue).toBe('jiraIssue_todo');

                    const childrenIssues = await provider.getChildren(issues[1]);
                    expect(childrenIssues).toHaveLength(2);

                    expect(childrenIssues[0].label).toBe(mockedIssue1.key);
                    expect(childrenIssues[0].description).toBe(mockedIssue1.summary);
                    expect(childrenIssues[0].contextValue).toBe('jiraIssue_todo');

                    expect(childrenIssues[1].label).toBe(mockedIssue3.key);
                    expect(childrenIssues[1].description).toBe(mockedIssue3.summary);
                    expect(childrenIssues[1].contextValue).toBe('jiraIssue_done');
                } else {
                    expect(issues).toHaveLength(3);

                    expect(issues[0].label).toBe(mockedIssue1.key);
                    expect(issues[0].description).toBe(mockedIssue1.summary);
                    expect(issues[0].contextValue).toBe('jiraIssue_todo');

                    expect(await provider.getChildren(issues[0])).toHaveLength(0);

                    expect(issues[1].label).toBe(mockedIssue2.key);
                    expect(issues[1].description).toBe(mockedIssue2.summary);
                    expect(issues[1].contextValue).toBe('jiraIssue_inProgress');

                    expect(await provider.getChildren(issues[1])).toHaveLength(0);

                    expect(issues[2].label).toBe(mockedIssue3.key);
                    expect(issues[2].description).toBe(mockedIssue3.summary);
                    expect(issues[2].contextValue).toBe('jiraIssue_done');

                    expect(await provider.getChildren(issues[2])).toHaveLength(0);
                }
            },
        );

        it.each([[false], [true]])(
            "should return a 'No issues' node under a jql node without results (nestSubtasks %p)",
            async (nestSubtasks) => {
                Container.config.jira.explorer.nestSubtasks = nestSubtasks;

                provider = new CustomJQLViewProvider();
                const children = await provider.getChildren();

                const jqlNode = children[0];
                expect(jqlNode).toBeDefined();

                const issues = await provider.getChildren(jqlNode);
                expect(issues).toHaveLength(1);

                expect(issues[0].label).toEqual('No issues match this query');
                expect(issues[0].command).toBeUndefined();
            },
        );

        it.each([[false], [true]])(
            "should return a 'Configure JQL entries' node if no jql entries are enabled (nestSubtasks %p)",
            async () => {
                jest.spyOn(Container.jqlManager, 'enabledJQLEntries').mockReturnValue([]);
                provider = new CustomJQLViewProvider();
                const children = await provider.getChildren();

                expect(Container.jqlManager.enabledJQLEntries).toHaveBeenCalled();
                expect(children).toHaveLength(1);

                expect(children[0].label).toEqual('Configure JQL entries in settings to view Jira issues');
                expect(children[0].command).toBeDefined();
            },
        );

        it.each([[false], [true]])(
            'should return empty array if no sites are available (nestSubtasks %p)',
            async (nestSubtasks) => {
                Container.config.jira.explorer.nestSubtasks = nestSubtasks;

                jest.spyOn(Container.siteManager, 'productHasAtLeastOneSite').mockReturnValue(false);
                jest.spyOn(Container.jqlManager, 'enabledJQLEntries');
                provider = new CustomJQLViewProvider();
                const children = await provider.getChildren();

                expect(Container.jqlManager.enabledJQLEntries).toHaveBeenCalled();
                // Should return empty array to show viewsWelcome with login button
                expect(children).toHaveLength(0);
            },
        );
    });

    describe('onDidSitesAvailableChange', () => {
        it('onDidSitesAvailableChange is registered during construction', async () => {
            let onDidSitesAvailableChangeCallback = undefined;
            jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                (func: any, parent: any): any => {
                    onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                },
            );

            provider = new CustomJQLViewProvider();

            expect(onDidSitesAvailableChangeCallback).toBeDefined();
        });

        it.each([ProductJira, ProductBitbucket])(
            'onDidSitesAvailableChange callback refreshes only for Jira sites changes (%p)',
            async (product) => {
                let onDidSitesAvailableChangeCallback = undefined;
                jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                    (func: any, parent: any): any => {
                        onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                    },
                );

                provider = new CustomJQLViewProvider();

                const refreshCallback = jest.fn();
                provider.onDidChangeTreeData(refreshCallback);

                onDidSitesAvailableChangeCallback!({ product });
                await sleep(100);

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

            provider = new CustomJQLViewProvider();

            expect(mockedTreeView.onDidChangeVisibility).toHaveBeenCalled();
        });

        it('the onDidChangeVisibility callback sends telemetry if the panel is visible and there are Jira sites configured', async () => {
            let onDidChangeVisibilityCallback = undefined;
            jest.spyOn(mockedTreeView, 'onDidChangeVisibility').mockImplementation((func: any, parent: any): any => {
                onDidChangeVisibilityCallback = (...args: any[]) => func.apply(parent, args);
            });

            provider = new CustomJQLViewProvider();

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

            provider = new CustomJQLViewProvider();

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

            provider = new CustomJQLViewProvider();

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

            provider = new CustomJQLViewProvider();

            expect(Container.context.subscriptions).toHaveLength(1);
        });

        it.each([
            ['jira', false],
            ['jira.jqlList', true],
            ['jira.explorer', true],
            ['jira.explorer.enabled', true],
            ['jira.explorer.collapsed', false],
        ])(
            'onConfigurationChanged refreshes if one relevant config is changed (%p)',
            async (configName, expectedRefresh) => {
                jest.spyOn(configuration, 'changed').mockImplementation((e, name) => name === configName);
                jest.spyOn(Container.jqlManager, 'enabledJQLEntries').mockReturnValue([]);

                provider = new CustomJQLViewProvider();

                const refreshCallback = jest.fn();
                provider.onDidChangeTreeData(refreshCallback);

                const callbackObj = Container.context.subscriptions[0] as any;
                callbackObj.func.call(callbackObj.thisArg);

                await sleep(100);

                if (expectedRefresh) {
                    expect(refreshCallback).toHaveBeenCalledTimes(1);
                } else {
                    expect(refreshCallback).not.toHaveBeenCalled();
                }
            },
        );

        it.each([
            [[], true, false],
            [mockJqlEntries, true, true],
            [mockJqlEntries, false, false],
        ])(
            'onConfigurationChanged enabled or disables the panel depending on the presence of custom JQL queries (%#)',
            (jqlEntries, explorerEnabled, expectedContext) => {
                jest.spyOn(configuration, 'changed').mockReturnValue(true);
                jest.spyOn(Container.jqlManager, 'enabledJQLEntries').mockReturnValue(jqlEntries);
                Container.config.jira.explorer.enabled = explorerEnabled;

                provider = new CustomJQLViewProvider();

                jest.spyOn(commandContext, 'setCommandContext');

                const callbackObj = Container.context.subscriptions[0] as any;
                callbackObj.func.call(callbackObj.thisArg);

                expect(commandContext.setCommandContext).toHaveBeenCalledWith(
                    commandContext.CommandContext.CustomJQLExplorer,
                    expectedContext,
                );
            },
        );
    });
});
