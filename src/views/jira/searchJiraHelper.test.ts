import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { AssignedJiraItemsViewId, Commands } from 'src/constants';
import { forceCastTo } from 'testsutil';
import * as vscode from 'vscode';

import { searchIssuesEvent } from '../../analytics';
import { Container } from '../../container';
import { SearchJiraHelper } from './searchJiraHelper';

jest.mock('@atlassianlabs/jira-pi-common-models');
jest.mock('../../analytics', () => ({
    searchIssuesEvent: jest.fn(() => Promise.resolve({ eventName: 'searchIssues' })),
}));
jest.mock('../../commands');
jest.mock('../../container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));
jest.mock('../../atlclients/authInfo');

const issue1 = forceCastTo<MinimalORIssueLink<DetailedSiteInfo>>({
    key: 'ISSUE-1',
    summary: 'Test Issue',
    siteDetails: { id: 'site1' },
    status: { name: 'To Do' },
});

const issue2 = forceCastTo<MinimalORIssueLink<DetailedSiteInfo>>({
    key: 'ISSUE-2',
    summary: 'Another Issue',
    siteDetails: { id: 'site2' },
    status: { name: 'In Progress' },
});

const createMockQuickPick = () => ({
    items: [] as any[],
    value: '',
    placeholder: '',
    matchOnDescription: true,
    matchOnDetail: false,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    onDidChangeValue: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    selectedItems: [] as any[],
    activeItems: [] as any[],
    busy: false,
    title: '',
});

describe('SearchJiraHelper', () => {
    let mockQuickPick: ReturnType<typeof createMockQuickPick>;

    beforeEach(() => {
        jest.spyOn(vscode.commands, 'registerCommand').mockImplementation();
        jest.spyOn(vscode.commands, 'executeCommand').mockImplementation();
        jest.spyOn(vscode.window, 'showQuickPick').mockImplementation();

        mockQuickPick = createMockQuickPick();
        jest.spyOn(vscode.window, 'createQuickPick').mockReturnValue(mockQuickPick as any);
    });

    afterEach(() => {
        SearchJiraHelper.clearIssues();
        jest.restoreAllMocks();
    });

    it('initialize should register the JiraSearchIssues command', () => {
        SearchJiraHelper.initialize();
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            'atlascode.jira.searchIssues',
            expect.any(Function),
        );
    });

    it('findIssue finds issues after setIssues', () => {
        SearchJiraHelper.setIssues([issue1, issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
        expect(SearchJiraHelper.findIssue('NONE-1')).toBeUndefined();
    });

    it('clearIssues clears all the issues', () => {
        SearchJiraHelper.setIssues([issue1, issue2], 'provider1');
        SearchJiraHelper.clearIssues();

        expect(SearchJiraHelper.findIssue(issue1.key)).toBeUndefined();
        expect(SearchJiraHelper.findIssue(issue2.key)).toBeUndefined();
    });

    it('clearIssues clears all the issues for provider1', () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.setIssues([issue2], 'provider2');
        SearchJiraHelper.clearIssues('provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBeUndefined();
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it("setIssues replaces the provider's issues", () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.setIssues([issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBeUndefined();
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('setIssues stores different providers separately', () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.setIssues([issue2], 'provider2');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('appendIssues append issues for the same provider', () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.appendIssues([issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('appendIssues works standalone', () => {
        SearchJiraHelper.appendIssues([issue1, issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('returns issues for provided siteId', () => {
        SearchJiraHelper.setIssues([issue1, issue2], AssignedJiraItemsViewId);

        expect(SearchJiraHelper.getAssignedIssuesPerSite('site1')).toStrictEqual([issue1]);
        expect(SearchJiraHelper.getAssignedIssuesPerSite('site2')).toStrictEqual([issue2]);
    });

    describe('createIssueQuickPick', () => {
        let registeredCallback: Function;

        beforeEach(() => {
            // Clear all mocks
            jest.clearAllMocks();

            // Capture the registered callback function
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((command, callback) => {
                if (command === Commands.JiraSearchIssues) {
                    registeredCallback = callback;
                }
            });
            SearchJiraHelper.initialize();
        });

        it('should send analytics event when called', async () => {
            SearchJiraHelper.setIssues([issue1], 'provider1');

            // Call the registered callback
            await registeredCallback();

            expect(searchIssuesEvent).toHaveBeenCalled();
            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith({ eventName: 'searchIssues' });
        });

        it('should create quick pick items from all issues', async () => {
            SearchJiraHelper.setIssues([issue1], 'provider1');
            SearchJiraHelper.setIssues([issue2], 'provider2');

            await registeredCallback();

            expect(vscode.window.createQuickPick).toHaveBeenCalled();
            expect(mockQuickPick.items).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        label: issue1.key,
                        description: issue1.status.name,
                        issue: issue1,
                    }),
                    expect.objectContaining({
                        label: issue2.key,
                        description: issue2.status.name,
                        issue: issue2,
                    }),
                    expect.objectContaining({
                        description: 'Search all Jira work items',
                        issue: null,
                    }),
                ]),
            );
        });

        it('should deduplicate issues with same key', async () => {
            // Add same issue to different providers
            SearchJiraHelper.setIssues([issue1], 'provider1');
            SearchJiraHelper.setIssues([issue1], 'provider2');

            await registeredCallback();

            const issue1Items = mockQuickPick.items.filter((item: any) => item.label === issue1.key);

            expect(issue1Items).toHaveLength(1);
            expect(mockQuickPick.items).toHaveLength(2);
        });

        it('should execute ShowIssue command when issue is selected', async () => {
            SearchJiraHelper.setIssues([issue1], 'provider1');

            let onDidAcceptCallback: Function | undefined;
            mockQuickPick.onDidAccept.mockImplementation((callback: Function) => {
                onDidAcceptCallback = callback;
            });

            await registeredCallback();

            mockQuickPick.selectedItems = [
                {
                    label: issue1.key,
                    description: issue1.summary,
                    issue: issue1,
                },
            ];

            if (onDidAcceptCallback) {
                onDidAcceptCallback();
            }

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(Commands.ShowIssue, issue1);
        });

        it('should not execute command when no issue is selected', async () => {
            SearchJiraHelper.setIssues([issue1], 'provider1');

            // Clear previous calls
            (vscode.commands.executeCommand as jest.Mock).mockClear();

            let onDidAcceptCallback: Function | undefined;
            mockQuickPick.onDidAccept.mockImplementation((callback: Function) => {
                onDidAcceptCallback = callback;
            });

            await registeredCallback();

            mockQuickPick.selectedItems = [];
            if (onDidAcceptCallback) {
                onDidAcceptCallback();
            }

            expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(Commands.ShowIssue, expect.anything());
        });

        it('should handle empty issue list', async () => {
            SearchJiraHelper.clearIssues();

            await registeredCallback();

            expect(vscode.window.createQuickPick).toHaveBeenCalled();
            expect(mockQuickPick.items).toHaveLength(1);
            expect(mockQuickPick.items[0]).toEqual(
                expect.objectContaining({
                    description: 'Search all Jira work items',
                    issue: null,
                    searchTerm: '',
                }),
            );
        });
    });
});
