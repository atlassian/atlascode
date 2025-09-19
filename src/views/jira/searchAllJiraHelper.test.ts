import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Commands } from 'src/constants';
import * as vscode from 'vscode';

import { Container } from '../../container';
import { SearchAllJiraHelper } from './searchAllJiraHelper';
jest.mock('../../container', () => ({
    Container: {
        siteManager: {
            getSitesAvailable: jest.fn(),
        },
    },
}));

const createMockSite = (id: string, host: string): DetailedSiteInfo => ({
    id,
    host,
    name: `Site ${id}`,
    avatarUrl: `https://${host}/avatar.png`,
    baseLinkUrl: `https://${host}`,
    baseApiUrl: `https://${host}/rest/api/3`,
    isCloud: true,
    credentialId: `cred-${id}`,
    userId: `user-${id}`,
    product: ProductJira,
});
const createMockIssue = (key: string, summary: string, site: DetailedSiteInfo): MinimalIssue<DetailedSiteInfo> => ({
    key,
    summary,
    id: key,
    self: `${site.baseApiUrl}/issue/${key}`,
    created: new Date(),
    updated: new Date(),
    description: '',
    descriptionHtml: '',
    siteDetails: site,
    status: { name: 'To Do' } as any,
    priority: { name: 'High' } as any,
    issuetype: { name: 'Bug' } as any,
    subtasks: [],
    issuelinks: [],
    transitions: [],
    isEpic: false,
    epicLink: '',
    epicName: '',
    epicChildren: [],
});
const createMockQuickPick = () => ({
    placeholder: '',
    title: '',
    busy: false,
    items: [] as any[],
    activeItems: [] as any[],
    selectedItems: [] as any[],
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    onDidChangeValue: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
});

const mockSite1 = createMockSite('1', 'test1.atlassian.net');
const mockSite2 = createMockSite('2', 'test2.atlassian.net');
const mockIssue1 = createMockIssue('TEST-1', 'Test Issue 1', mockSite1);
const mockIssue2 = createMockIssue('TEST-2', 'Test Issue 2', mockSite2);

describe('SearchAllJiraHelper', () => {
    let registeredCallback: Function;
    let mockQuickPick: ReturnType<typeof createMockQuickPick>;
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(vscode.commands, 'executeCommand').mockImplementation();
        jest.spyOn(vscode.commands, 'registerCommand').mockImplementation((command, callback) => {
            if (command === Commands.JiraSearchAllIssues) {
                registeredCallback = callback;
            }
            return { dispose: jest.fn() };
        });
        mockQuickPick = createMockQuickPick();
        jest.spyOn(vscode.window, 'createQuickPick').mockReturnValue(mockQuickPick as any);
        jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([mockSite1, mockSite2]);
        SearchAllJiraHelper.initialize();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('registers the JiraSearchAllIssues command on initialize', () => {
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            Commands.JiraSearchAllIssues,
            expect.any(Function),
        );
    });
    describe('createAllIssuesQuickPick', () => {
        it('shows QuickPick when command is executed', async () => {
            await registeredCallback();
            expect(vscode.window.createQuickPick).toHaveBeenCalled();
            expect(mockQuickPick.show).toHaveBeenCalled();
        });

        it('shows info message if no Jira sites are available', async () => {
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([]);
            jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation();
            await registeredCallback();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'No Jira sites connected. Please connect to a Jira site first.',
            );
            expect(vscode.window.createQuickPick).not.toHaveBeenCalled();
        });

        it('executes command with selected issue on accept', async () => {
            await registeredCallback();
            mockQuickPick.selectedItems = [{ label: 'TEST-1', description: 'Test Issue 1', issue: mockIssue1 }];
            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(Commands.ShowIssue, mockIssue1);
        });
    });

    describe('buildJqlQuery', () => {
        it('builds query for normal input', () => {
            const query = SearchAllJiraHelper['buildJqlQuery']('test query');
            expect(query).toBe('(summary ~ "test query*" OR key = "test query") ORDER BY updated DESC');
        });
        it('handles empty input', () => {
            const query = SearchAllJiraHelper['buildJqlQuery']('');
            expect(query).toBe('(summary ~ "*" OR key = "") ORDER BY updated DESC');
        });
        it('does not escape special characters (documented bug)', () => {
            const query = SearchAllJiraHelper['buildJqlQuery']('test "quoted"');
            expect(query).toContain('test "quoted"');
        });
    });

    describe('mapToQuickPickItems', () => {
        it('maps issues correctly', () => {
            const items = SearchAllJiraHelper['mapToQuickPickItems']([mockIssue1, mockIssue2]);
            expect(items).toHaveLength(2);
            expect(items[0].label).toBe('TEST-1');
            expect(items[1].label).toBe('TEST-2');
        });
        it('handles missing summary gracefully', () => {
            const issueNoSummary = createMockIssue('TEST-3', '', mockSite1);
            const items = SearchAllJiraHelper['mapToQuickPickItems']([issueNoSummary]);
            expect(items[0].detail).toBe('');
        });
        it('returns empty array if no issues', () => {
            const items = SearchAllJiraHelper['mapToQuickPickItems']([]);
            expect(items).toEqual([]);
        });
    });
});
