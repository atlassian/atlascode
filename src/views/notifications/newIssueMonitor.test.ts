import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { format } from 'date-fns';
import pSettle from 'p-settle';
import { JQLEntry } from 'src/config/model';
import { expansionCastTo } from 'testsutil';
import { commands, window } from 'vscode';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import * as showIssueCommand from '../../commands/jira/showIssue';
import { Container } from '../../container';
import * as issuesForJQLModule from '../../jira/issuesForJql';
import { Logger } from '../../logger';
import { NewIssueMonitor } from './newIssueMonitor';

const mockSite = expansionCastTo<DetailedSiteInfo>({
    id: 'site-1',
});

function createIssue(key: string, summary: string, siteId: string, created?: Date): MinimalIssue<DetailedSiteInfo> {
    return expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key,
        summary,
        created: created || new Date(),
        siteDetails: expansionCastTo<DetailedSiteInfo>({ id: siteId }),
    });
}

function createJQLEntry(name: string, query: string, siteId: string): JQLEntry {
    return expansionCastTo<JQLEntry>({
        name,
        query,
        siteId,
        enabled: true,
        id: `jql-${name.toLowerCase()}`,
        monitor: true,
    });
}

// Mock dependencies
jest.mock('../../commands/jira/showIssue');
jest.mock('../../jira/issuesForJql');
jest.mock('../../container', () => ({
    Container: {
        config: {
            jira: {
                explorer: {
                    monitorEnabled: true,
                },
            },
        },
        siteManager: {
            productHasAtLeastOneSite: jest.fn().mockReturnValue(true),
            getSiteForId: jest.fn().mockImplementation(() => mockSite),
        },
        jqlManager: {
            notifiableJQLEntries: jest.fn().mockReturnValue([]),
        },
    },
}));
jest.mock('../../logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));
jest.mock('p-settle');

describe('NewIssueMonitor', () => {
    let showInformationMessageMock: jest.SpyInstance;
    let issuesForJQLMock: jest.SpyInstance;
    let pSettleMock: jest.SpyInstance;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock vscode functions
        showInformationMessageMock = jest.spyOn(window, 'showInformationMessage').mockResolvedValue(undefined);

        // Mock issuesForJQL
        issuesForJQLMock = jest.mocked(issuesForJQLModule.issuesForJQL);

        // Mock p-settle
        pSettleMock = jest.mocked(pSettle);

        // Mock Container
        (Container as any) = {
            config: {
                jira: {
                    explorer: {
                        monitorEnabled: true,
                    },
                },
            },
            siteManager: {
                productHasAtLeastOneSite: jest.fn().mockReturnValue(true),
                getSiteForId: jest.fn().mockReturnValue(mockSite),
            },
            jqlManager: {
                notifiableJQLEntries: jest.fn().mockReturnValue([]),
            },
        };
    });

    describe('constructor', () => {
        it('should create instance with default JQL fetcher', () => {
            const monitor = new NewIssueMonitor();
            expect(monitor).toBeInstanceOf(NewIssueMonitor);
        });

        it('should create instance with custom JQL fetcher', () => {
            const customFetcher = jest.fn().mockReturnValue([]);
            const monitor = new NewIssueMonitor(customFetcher);
            expect(monitor).toBeInstanceOf(NewIssueMonitor);
        });
    });

    describe('addCreatedTimeToQuery', () => {
        let monitor: NewIssueMonitor;

        beforeEach(() => {
            monitor = new NewIssueMonitor();
        });

        it('should add created time filter to query without ORDER BY', () => {
            const query = 'project = TEST AND assignee = currentUser()';
            const timestamp = '2023-06-22 10:00';

            // Use bracket notation to access private method
            const result = (monitor as any).addCreatedTimeToQuery(query, timestamp);

            expect(result).toBe('project = TEST AND assignee = currentUser() AND created > "2023-06-22 10:00"');
        });

        it('should add created time filter before ORDER BY clause', () => {
            const query = 'project = TEST ORDER BY created DESC';
            const timestamp = '2023-06-22 10:00';

            const result = (monitor as any).addCreatedTimeToQuery(query, timestamp);

            expect(result).toBe('project = TEST AND created > "2023-06-22 10:00" ORDER BY created DESC');
        });

        it('should handle case insensitive ORDER BY', () => {
            const query = 'project = TEST order by created DESC';
            const timestamp = '2023-06-22 10:00';

            const result = (monitor as any).addCreatedTimeToQuery(query, timestamp);

            expect(result).toBe('project = TEST AND created > "2023-06-22 10:00" order by created DESC');
        });
    });

    describe('checkForNewIssues', () => {
        let monitor: NewIssueMonitor;

        beforeEach(() => {
            monitor = new NewIssueMonitor();
        });

        it('should return early if monitoring is disabled', async () => {
            Container.config.jira.explorer.monitorEnabled = false;

            await monitor.checkForNewIssues();

            expect(Container.jqlManager.notifiableJQLEntries).not.toHaveBeenCalled();
            expect(showInformationMessageMock).not.toHaveBeenCalled();
        });

        it('should return early if no Jira sites are available', async () => {
            (Container.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(false);

            await monitor.checkForNewIssues();

            expect(Container.jqlManager.notifiableJQLEntries).not.toHaveBeenCalled();
            expect(showInformationMessageMock).not.toHaveBeenCalled();
        });

        it('should handle empty JQL entries', async () => {
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue([]);
            pSettleMock.mockImplementation(async (promises) => {
                return Promise.resolve([]);
            });

            await monitor.checkForNewIssues();

            expect(pSettleMock).toHaveBeenCalledWith([]);
            expect(showInformationMessageMock).not.toHaveBeenCalled();
        });

        it('should process JQL entries and check for new issues', async () => {
            const jqlEntries = [
                createJQLEntry('My Issues', 'assignee = currentUser()', 'site-1'),
                createJQLEntry('Team Issues', 'project = TEST', 'site-1'),
            ];
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue(jqlEntries);

            const issue1 = createIssue('TEST-1', 'Issue 1', 'site-1', new Date('2023-06-22T11:00:00Z'));
            const issue2 = createIssue('TEST-2', 'Issue 2', 'site-1', new Date('2023-06-22T11:30:00Z'));

            issuesForJQLMock.mockResolvedValue([issue1, issue2]);

            pSettleMock.mockImplementation(async (promises) => {
                return Promise.resolve([
                    { isFulfilled: true, value: { jqlName: 'My Issues', issues: [issue1] } },
                    { isFulfilled: true, value: { jqlName: 'Team Issues', issues: [issue2] } },
                ]);
            });

            await monitor.checkForNewIssues();

            expect(issuesForJQLMock).toHaveBeenCalledTimes(2);
            expect(pSettleMock).toHaveBeenCalled();
        });

        it('should handle JQL execution errors gracefully', async () => {
            const jqlEntries = [createJQLEntry('My Issues', 'assignee = currentUser()', 'site-1')];
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue(jqlEntries);

            pSettleMock.mockImplementation(async (promises) => {
                return Promise.resolve([{ isFulfilled: false, reason: 'JQL execution failed' }]);
            });

            await monitor.checkForNewIssues();

            expect(showInformationMessageMock).not.toHaveBeenCalled();
        });

        it('should handle missing site for JQL entry', async () => {
            const jqlEntries = [createJQLEntry('My Issues', 'assignee = currentUser()', 'nonexistent-site')];
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue(jqlEntries);

            // Return null for the specific site ID to trigger the error condition
            (Container.siteManager.getSiteForId as jest.Mock).mockImplementation((product: any, siteId: any) => {
                if (siteId === 'nonexistent-site') {
                    return null;
                }
                return mockSite;
            });

            // Mock p-settle to handle the actual promise rejection that would occur
            pSettleMock.mockImplementation(async (promises) => {
                // Wait for promises to settle and catch rejections
                const results = await Promise.allSettled(promises);
                return results.map((result) => {
                    if (result.status === 'fulfilled') {
                        return { isFulfilled: true, value: result.value };
                    } else {
                        return { isFulfilled: false, reason: result.reason };
                    }
                });
            });

            await monitor.checkForNewIssues();

            expect(issuesForJQLMock).not.toHaveBeenCalled();
            expect(showInformationMessageMock).not.toHaveBeenCalled();
        });

        it('should filter out duplicate issues across JQL queries', async () => {
            const jqlEntries = [
                createJQLEntry('My Issues', 'assignee = currentUser()', 'site-1'),
                createJQLEntry('Team Issues', 'project = TEST', 'site-1'),
            ];
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue(jqlEntries);

            const issue1 = createIssue('TEST-1', 'Issue 1', 'site-1', new Date('2023-06-22T11:00:00Z'));
            const issue1Duplicate = createIssue('TEST-1', 'Issue 1', 'site-1', new Date('2023-06-22T11:00:00Z'));

            // Set the monitor's timestamp to be earlier than the issues
            (monitor as any)._timestamp = new Date('2023-06-22T10:00:00Z');

            pSettleMock.mockImplementation(async (promises) => {
                return Promise.resolve([
                    { isFulfilled: true, value: { jqlName: 'My Issues', issues: [issue1] } },
                    { isFulfilled: true, value: { jqlName: 'Team Issues', issues: [issue1Duplicate] } },
                ]);
            });

            await monitor.checkForNewIssues();

            expect(showInformationMessageMock).toHaveBeenCalledTimes(1);
            const callArgs = showInformationMessageMock.mock.calls[0];
            expect(callArgs[0]).toContain('[TEST-1] "Issue 1" added to explorer');
        });

        it('should update timestamp when newer issues are found', async () => {
            const initialTime = new Date('2023-06-22T10:00:00Z');
            const newerTime = new Date('2023-06-22T11:00:00Z');

            // Set initial timestamp
            (monitor as any)._timestamp = initialTime;

            const jqlEntries = [createJQLEntry('My Issues', 'assignee = currentUser()', 'site-1')];
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue(jqlEntries);

            const newerIssue = createIssue('TEST-1', 'Issue 1', 'site-1', newerTime);

            pSettleMock.mockImplementation(async (promises) => {
                return Promise.resolve([{ isFulfilled: true, value: { jqlName: 'My Issues', issues: [newerIssue] } }]);
            });

            await monitor.checkForNewIssues();

            expect((monitor as any)._timestamp).toEqual(newerTime);
        });

        it('should log errors when checkForNewIssues fails', async () => {
            const error = new Error('Test error');
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockImplementation(() => {
                throw error;
            });

            await monitor.checkForNewIssues();

            expect(Logger.error).toHaveBeenCalledWith(error, 'Error checking for new issues');
        });
    });

    describe('showNotification', () => {
        let monitor: NewIssueMonitor;

        beforeEach(() => {
            monitor = new NewIssueMonitor();
            // Reset mocks for this test suite
            jest.clearAllMocks();
        });

        it('should not show notification for empty issues array', () => {
            (monitor as any).showNotification([]);

            expect(showInformationMessageMock).not.toHaveBeenCalled();
        });

        it('should show notification for single issue', () => {
            const issues = [createIssue('TEST-1', 'Issue 1', 'site-1')];

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1" added to explorer',
                'Open Issue',
            );
        });

        it('should show notification for two issues', () => {
            const issues = [createIssue('TEST-1', 'Issue 1', 'site-1'), createIssue('TEST-2', 'Issue 2', 'site-1')];

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1" and [TEST-2] "Issue 2" added to explorer',
                'View Atlassian Explorer',
            );
        });

        it('should show notification for three issues', () => {
            const issues = [
                createIssue('TEST-1', 'Issue 1', 'site-1'),
                createIssue('TEST-2', 'Issue 2', 'site-1'),
                createIssue('TEST-3', 'Issue 3', 'site-1'),
            ];

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1", [TEST-2] "Issue 2" and [TEST-3] "Issue 3" added to explorer',
                'View Atlassian Explorer',
            );
        });

        it('should show notification for more than three issues', () => {
            const issues = [
                createIssue('TEST-1', 'Issue 1', 'site-1'),
                createIssue('TEST-2', 'Issue 2', 'site-1'),
                createIssue('TEST-3', 'Issue 3', 'site-1'),
                createIssue('TEST-4', 'Issue 4', 'site-1'),
                createIssue('TEST-5', 'Issue 5', 'site-1'),
            ];

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1", [TEST-2] "Issue 2" and 3 other new issues added to explorer',
                'View Atlassian Explorer',
            );
        });

        it('should open single issue when "Open Issue" is selected', () => {
            const issues = [createIssue('TEST-1', 'Issue 1', 'site-1')];

            showInformationMessageMock.mockImplementation((message, action) => {
                // Simulate user clicking the action
                setTimeout(() => {
                    if (action === 'Open Issue') {
                        showIssueCommand.showIssue(issues[0]);
                    }
                }, 0);
                return Promise.resolve('Open Issue');
            });

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1" added to explorer',
                'Open Issue',
            );
        });

        it('should open Atlassian Explorer when "View Atlassian Explorer" is selected', () => {
            const issues = [createIssue('TEST-1', 'Issue 1', 'site-1'), createIssue('TEST-2', 'Issue 2', 'site-1')];

            showInformationMessageMock.mockImplementation((message, action) => {
                // Simulate user clicking the action
                setTimeout(() => {
                    if (action === 'View Atlassian Explorer') {
                        commands.executeCommand('workbench.view.extension.atlascode-drawer');
                    }
                }, 0);
                return Promise.resolve('View Atlassian Explorer');
            });

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1" and [TEST-2] "Issue 2" added to explorer',
                'View Atlassian Explorer',
            );
        });

        it('should do nothing when notification is dismissed', () => {
            const issues = [createIssue('TEST-1', 'Issue 1', 'site-1')];

            showInformationMessageMock.mockReturnValue(Promise.resolve(undefined));

            (monitor as any).showNotification(issues);

            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[TEST-1] "Issue 1" added to explorer',
                'Open Issue',
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete workflow with custom JQL fetcher', async () => {
            const customJQLEntries = [createJQLEntry('Custom Query', 'project = CUSTOM', 'site-1')];
            const customFetcher = jest.fn().mockReturnValue(customJQLEntries);
            const monitor = new NewIssueMonitor(customFetcher);

            // Set initial timestamp to be earlier than the issue
            (monitor as any)._timestamp = new Date('2023-06-22T10:00:00Z');

            const newIssue = createIssue('CUSTOM-1', 'Custom Issue', 'site-1', new Date('2023-06-22T11:00:00Z'));
            issuesForJQLMock.mockResolvedValue([newIssue]);

            pSettleMock.mockImplementation(async (promises) => {
                return Promise.resolve([{ isFulfilled: true, value: { jqlName: 'Custom Query', issues: [newIssue] } }]);
            });

            await monitor.checkForNewIssues();

            expect(customFetcher).toHaveBeenCalled();
            expect(showInformationMessageMock).toHaveBeenCalledWith(
                '[CUSTOM-1] "Custom Issue" added to explorer',
                'Open Issue',
            );
        });

        it('should handle timestamp formatting correctly', async () => {
            const monitor = new NewIssueMonitor();
            const testDate = new Date('2023-06-22T10:30:45Z');
            (monitor as any)._timestamp = testDate;

            const jqlEntries = [createJQLEntry('Test Query', 'project = TEST', 'site-1')];
            (Container.jqlManager.notifiableJQLEntries as jest.Mock).mockReturnValue(jqlEntries);

            const expectedTimestamp = format(testDate, 'yyyy-MM-dd HH:mm');

            pSettleMock.mockResolvedValue([]);

            await monitor.checkForNewIssues();

            expect(issuesForJQLMock).toHaveBeenCalledWith(
                expect.stringContaining(`AND created > "${expectedTimestamp}"`),
                mockSite,
            );
        });
    });
});
