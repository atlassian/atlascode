import { commands, ConfigurationChangeEvent, TextEditor, window } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import * as fetchIssue from '../../jira/fetchIssue';
import * as issueForKeyModule from '../../jira/issueForKey';
import * as issueKeyParser from '../../jira/issueKeyParser';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { JiraActiveIssueStatusBar } from './activeIssueStatusBar';

// Mock constants
jest.mock('../../constants', () => ({
    AssignedJiraItemsViewId: 'assignedJiraItemsView',
    JiraEnabledKey: 'jira.enabled',
}));

// Mock Container
jest.mock('../../container', () => ({
    Container: {
        context: {
            subscriptions: [],
        },
        config: {
            jira: {
                enabled: true,
                statusbar: {
                    enabled: true,
                    showActiveIssue: true,
                },
            },
        },
        bitbucketContext: {
            getAllRepositoriesRaw: jest.fn(),
        },
        analyticsClient: {
            sendUIEvent: jest.fn(),
        },
    },
}));

// Mock configuration
jest.mock('../../config/configuration', () => ({
    configuration: {
        onDidChange: jest.fn().mockReturnValue({
            dispose: jest.fn(),
        }),
        initializingChangeEvent: {},
        initializing: jest.fn(),
        changed: jest.fn(),
    },
}));

// Mock fs
jest.mock('fs', () => ({
    realpathSync: jest.fn().mockReturnValue('/path/to/repo/file.ts'),
}));

// Mock issue fetching modules
jest.mock('../../jira/fetchIssue', () => ({
    getCachedIssue: jest.fn(),
}));

jest.mock('../../jira/issueForKey', () => ({
    issueForKey: jest.fn(),
}));

// Mock analytics
jest.mock('../../analytics', () => ({
    openActiveIssueEvent: jest.fn().mockResolvedValue({ name: 'open-active-issue' }),
}));

// Mock issue key parser
jest.mock('../../jira/issueKeyParser', () => ({
    parseJiraIssueKeys: jest.fn(),
}));

// Mock showIssue command
jest.mock('../../commands/jira/showIssue', () => ({
    showIssue: jest.fn(),
}));

// Mock isMinimalIssue function
jest.mock('@atlassianlabs/jira-pi-common-models', () => ({
    isMinimalIssue: jest.fn().mockReturnValue(true),
}));

describe('JiraActiveIssueStatusBar', () => {
    let activeIssueStatusBar: JiraActiveIssueStatusBar;
    let mockBitbucketContext: BitbucketContext;
    let mockStatusBarItem: any;
    let mockRepo: any;
    const mockJiraIssue = {
        key: 'TEST-123',
        summary: 'Test Issue',
        id: '10001',
        site: {
            id: 'test-site',
            name: 'Test Site',
            host: 'test.atlassian.net',
            product: ProductJira,
            userId: 'user123',
        } as DetailedSiteInfo,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock status bar item
        mockStatusBarItem = {
            text: '',
            command: undefined,
            tooltip: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        };

        // Mock window.createStatusBarItem to return our mock
        (window.createStatusBarItem as jest.Mock) = jest.fn().mockReturnValue(mockStatusBarItem);

        // Setup mock BitbucketContext
        mockBitbucketContext = {
            onDidChangeBitbucketContext: jest.fn().mockReturnValue({
                dispose: jest.fn(),
            }),
        } as unknown as BitbucketContext;

        // Mock repository
        mockRepo = {
            rootUri: { fsPath: '/path/to/repo' },
            state: {
                HEAD: { name: 'feature/TEST-123-implement-feature' },
                onDidChange: jest.fn().mockReturnValue({
                    dispose: jest.fn(),
                }),
            },
        };

        // Set up Container mock returns
        Container.bitbucketContext.getAllRepositoriesRaw = jest.fn().mockReturnValue([mockRepo]);

        // Set up commands.registerCommand mock
        (commands.registerCommand as jest.Mock) = jest.fn().mockReturnValue({
            dispose: jest.fn(),
        });

        // Mock parseJiraIssueKeys to return TEST-123 by default
        (issueKeyParser.parseJiraIssueKeys as jest.Mock).mockReturnValue(['TEST-123']);

        // Mock getCachedIssue and issueForKey
        (fetchIssue.getCachedIssue as jest.Mock).mockResolvedValue(mockJiraIssue);
        (issueForKeyModule.issueForKey as jest.Mock).mockResolvedValue(mockJiraIssue);

        // No need to mock fs.realpathSync here, it's already mocked globally
    });

    afterEach(() => {
        if (activeIssueStatusBar) {
            activeIssueStatusBar.dispose();
        }
    });

    describe('constructor', () => {
        it('should initialize and set up event listeners', () => {
            activeIssueStatusBar = new JiraActiveIssueStatusBar(mockBitbucketContext);

            expect(Container.context.subscriptions.length).toBe(2);
            expect(configuration.onDidChange).toHaveBeenCalled();
            expect(mockBitbucketContext.onDidChangeBitbucketContext).toHaveBeenCalled();
        });
    });

    describe('handleConfigurationChange', () => {
        it('should update status when jira configuration changes', () => {
            activeIssueStatusBar = new JiraActiveIssueStatusBar(mockBitbucketContext);

            // Mock configuration.changed to return true for jira.enabled
            (configuration.changed as jest.Mock).mockReturnValueOnce(true);

            // Get the handler function passed to onDidChange
            const handler = (configuration.onDidChange as jest.Mock).mock.calls[0][0];

            // Create a mock event
            const mockEvent = {} as ConfigurationChangeEvent;

            // Spy on handleActiveIssueChange
            const spy = jest.spyOn(activeIssueStatusBar as any, 'handleActiveIssueChange');

            // Call the handler
            handler(mockEvent);

            // Verify handleActiveIssueChange was called
            expect(spy).toHaveBeenCalledWith(undefined);
        });
    });

    describe('handleRepoChange', () => {
        it('should set up repository state change listeners', () => {
            activeIssueStatusBar = new JiraActiveIssueStatusBar(mockBitbucketContext);

            // Get the handler function passed to onDidChangeBitbucketContext
            const handler = (mockBitbucketContext.onDidChangeBitbucketContext as jest.Mock).mock.calls[0][0];

            // Call the handler
            handler();

            // Verify onDidChange was set up for the repo state
            expect(mockRepo.state.onDidChange).toHaveBeenCalled();
        });
    });

    describe('handleActiveIssueChange', () => {
        beforeEach(() => {
            // Mock window.activeTextEditor
            Object.defineProperty(window, 'activeTextEditor', {
                get: jest.fn().mockReturnValue({
                    document: { uri: { fsPath: '/path/to/repo/file.ts' } },
                    viewColumn: 1,
                }),
                configurable: true,
            });

            activeIssueStatusBar = new JiraActiveIssueStatusBar(mockBitbucketContext);
        });

        it('should dispose if Jira is disabled', async () => {
            // Mock Jira as disabled
            Container.config.jira.enabled = false;

            // Spy on dispose method
            const spy = jest.spyOn(activeIssueStatusBar, 'dispose');

            await activeIssueStatusBar.handleActiveIssueChange();

            expect(spy).toHaveBeenCalled();

            // Reset for other tests
            Container.config.jira.enabled = true;
        });

        it('should update status bar with issue from branch name', async () => {
            await activeIssueStatusBar.handleActiveIssueChange();

            expect(mockStatusBarItem.text).toBe('$(chevron-right)TEST-123');
            expect(mockStatusBarItem.tooltip).toContain('TEST-123');
            expect(mockStatusBarItem.tooltip).toContain('Test Issue');
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        it('should show empty state if no issue key is found', async () => {
            // Mock parseJiraIssueKeys to return no keys
            (issueKeyParser.parseJiraIssueKeys as jest.Mock).mockReturnValueOnce([]);

            // Reset any previous state
            Object.defineProperty(window, 'activeTextEditor', {
                get: jest.fn().mockReturnValue({
                    document: { uri: { fsPath: '/path/to/repo/file.ts' } },
                    viewColumn: 1,
                }),
                configurable: true,
            });

            // Remove any active issue
            (activeIssueStatusBar as any).activeIssue = undefined;

            await activeIssueStatusBar.handleActiveIssueChange();

            // Force showEmptyStateStatusBarItem to be called
            (activeIssueStatusBar as any).showEmptyStateStatusBarItem();

            expect(mockStatusBarItem.text).toBe('$(chevron-right) No active issue');
            expect(mockStatusBarItem.tooltip).toContain('No active Jira issue');
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        it('should handle PR diff view', async () => {
            const mockPREditor = {
                viewColumn: 1,
                document: {
                    uri: {
                        scheme: PullRequestNodeDataProvider.SCHEME,
                        query: JSON.stringify({ branchName: 'feature/TEST-123-pr-branch' }),
                    },
                },
            } as unknown as TextEditor;

            await activeIssueStatusBar.handleActiveIssueChange(mockPREditor);

            expect(issueKeyParser.parseJiraIssueKeys).toHaveBeenCalledWith('feature/TEST-123-pr-branch');
            expect(mockStatusBarItem.text).toBe('$(chevron-right)TEST-123');
        });

        it('should handle string input', async () => {
            await activeIssueStatusBar.handleActiveIssueChange('PROJ-456');

            expect(issueKeyParser.parseJiraIssueKeys).toHaveBeenCalledWith('PROJ-456');
        });

        it('should handle errors in issue fetching', async () => {
            // Mock getCachedIssue and issueForKey to throw errors
            (fetchIssue.getCachedIssue as jest.Mock).mockRejectedValueOnce(new Error('Not found'));
            (issueForKeyModule.issueForKey as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

            // This should not throw
            await expect(activeIssueStatusBar.handleActiveIssueChange()).resolves.not.toThrow();
        });
    });

    describe('command handling', () => {
        it('should register and handle open issue command', async () => {
            activeIssueStatusBar = new JiraActiveIssueStatusBar(mockBitbucketContext);

            // Force status bar initialization
            await activeIssueStatusBar.handleActiveIssueChange();

            // Find command registration for openActiveJiraIssue
            const commandRegistration = (commands.registerCommand as jest.Mock).mock.calls.find(
                (call) => call[0] === 'openActiveJiraIssue',
            );

            expect(commandRegistration).toBeTruthy();

            // Get the command handler and call it
            const commandHandler = commandRegistration[1];
            await commandHandler();

            // Import the showIssue function to verify it was called
            const { showIssue } = require('../../commands/jira/showIssue');
            expect(showIssue).toHaveBeenCalledWith(expect.objectContaining({ key: 'TEST-123' }));

            // Verify analytics were sent
            expect(Container.analyticsClient.sendUIEvent).toHaveBeenCalledWith({ name: 'open-active-issue' });
        });
    });
});
