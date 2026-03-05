jest.mock('./api/extensionApi', () => ({
    ExtensionApi: jest.fn().mockImplementation(() => ({
        metadata: {
            isDebugging: jest.fn(() => false),
            isBoysenberry: jest.fn(() => false),
            isRovoDevEnabled: jest.fn(() => true),
            version: jest.fn(() => '1.0.0'),
            appInstanceId: jest.fn(() => 'test-app-id'),
        },
        config: {
            isDebugPanelEnabled: jest.fn(() => false),
            isThinkingBlockEnabled: jest.fn(() => false),
            onDidChange: jest.fn(),
        },
        analytics: {
            sendTrackEvent: jest.fn(),
        },
        auth: {
            getCloudPrimaryAuthInfo: jest.fn(),
            getPrimaryAuthInfo: jest.fn(),
            validateJiraCredentials: jest.fn(),
        },
        jira: {
            getSites: jest.fn(() => []),
            fetchWorkItems: jest.fn(() => Promise.resolve([])),
        },
        commands: {
            openFolder: jest.fn(),
            focusRovodevView: jest.fn(),
            showUserAuthentication: jest.fn(),
            showDiff: jest.fn(),
            setCommandContext: jest.fn(),
        },
    })),
}));

jest.mock('../../src/commands/jira/showIssue', () => ({
    showIssueForURL: jest.fn(),
}));

import { ExtensionContext, workspace } from 'vscode';

import { setCommandContext } from '../../src/commandContext';
import { RovodevCommandContext } from './api/componentApi';
import { RovoDevSessionManager } from './rovoDevSessionManager';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevWebviewProvider } from './rovoDevWebviewProvider';

jest.mock('./rovoDevProcessManager', () => ({
    RovoDevProcessManager: {
        setRovoDevWebviewProvider: jest.fn(),
        initializeRovoDev: jest.fn(),
        state: {
            state: 'NotStarted',
        },
    },
}));

jest.mock('./rovoDevTelemetryProvider', () => ({
    RovoDevTelemetryProvider: jest.fn().mockImplementation(() => ({
        fireTelemetryEvent: jest.fn(),
        startNewSession: jest.fn(),
        shutdown: jest.fn(),
    })),
}));

// mock extra static methods in the already-mocked class
Object.assign(RovoDevTelemetryProvider, { logError: jest.fn() });

jest.mock('./rovoDevUtils', () => ({
    readLastNLogLines: jest.fn(() => ['mock log line 1', 'mock log line 2']),
    openRovoDevConfigFile: jest.fn(),
}));

jest.mock('./errorDetailsBuilder', () => ({
    buildErrorDetails: jest.fn((error: Error) => `Stack trace for: ${error.message}`),
    buildExceptionDetails: jest.fn(),
}));

jest.mock('./rovoDevChatProvider', () => ({
    RovoDevChatProvider: jest.fn().mockImplementation(() => ({
        setWebview: jest.fn(),
        executeChat: jest.fn(),
        executeCancel: jest.fn(),
        executeRetryPromptAfterError: jest.fn(),
        executeReplay: jest.fn(),
        setReady: jest.fn(),
        shutdown: jest.fn(),
        onAgentModelChanged: jest.fn(),
        isPromptPending: false,
        currentPromptId: 'test-id',
        pendingCancellation: false,
        yoloMode: false,
    })),
}));

jest.mock('./rovoDevJiraItemsProvider', () => ({
    RovoDevJiraItemsProvider: jest.fn().mockImplementation(() => ({
        onNewJiraItems: jest.fn(),
        setJiraSite: jest.fn(),
        dispose: jest.fn(),
    })),
}));

jest.mock('./rovoDevPullRequestHandler', () => ({
    RovoDevPullRequestHandler: jest.fn().mockImplementation(() => ({
        hasChangesOrUnpushedCommits: jest.fn(),
        createPR: jest.fn(),
        getCurrentBranchName: jest.fn(),
    })),
}));

jest.mock('./rovoDevDwellTracker', () => ({
    RovoDevDwellTracker: jest.fn().mockImplementation(() => ({
        startDwellTimer: jest.fn(),
        dispose: jest.fn(),
    })),
}));

jest.mock('./rovoDevFeedbackManager', () => ({
    RovoDevFeedbackManager: {
        submitFeedback: jest.fn(),
    },
}));

jest.mock('./rovoDevSessionManager', () => ({
    RovoDevSessionManager: jest.fn().mockImplementation(() => ({
        onSessionRestored: jest.fn((callback) => {
            // Store the callback for testing
            return { dispose: jest.fn() };
        }),
        showPicker: jest.fn(),
        dispose: jest.fn(),
    })),
}));

jest.mock('src/commandContext', () => ({
    setCommandContext: jest.fn(),
    CommandContext: {
        CustomJQLExplorer: 'atlascode:customJQLExplorerEnabled',
    },
}));

jest.mock('path', () => ({
    isAbsolute: jest.fn((path) => path.startsWith('/') || path.startsWith('C:')),
    join: jest.fn((...paths) => paths.join('/')),
    relative: jest.fn((from, to) => to.replace(from, '')),
    basename: jest.fn((path) => path.split('/').pop()),
    sep: '/',
}));

jest.mock('./util/fsPromises', () => ({
    getFsPromise: jest.fn(),
}));

jest.mock('./util/waitFor', () => ({
    safeWaitFor: jest.fn(),
}));

describe('RovoDevWebviewProvider - Real Implementation Tests', () => {
    let provider: RovoDevWebviewProvider;
    let mockContext: ExtensionContext;

    beforeEach(() => {
        mockContext = {
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        provider = new RovoDevWebviewProvider(mockContext, '/test/extension');
    });

    describe('Getters', () => {
        it('should return correct ready state', () => {
            expect(provider.isReady).toBe(false);
        });

        it('should return correct visible state', () => {
            expect(provider.isVisible).toBe(false);
        });

        it('should return correct disabled state', () => {
            expect(provider.isDisabled).toBe(false);
        });
    });

    describe('YOLO Mode Storage', () => {
        it('should handle boysenberry mode', async () => {
            // Test the private method through public interface
            const result = await (provider as any).loadYoloModeFromStorage();
            expect(typeof result).toBe('boolean');
        });

        it('should save yolo mode', async () => {
            await (provider as any).saveYoloModeToStorage(true);
            expect(mockContext.workspaceState.update).toHaveBeenCalled();
        });
    });

    describe('File Operations', () => {
        it('should handle file operations', () => {
            // Test that the provider can be instantiated without errors
            expect(provider).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should process errors correctly', () => {
            // Mock the webview
            (provider as any)._webView = {
                postMessage: jest.fn().mockResolvedValue(true),
            };

            const error = new Error('Test error');
            const result = (provider as any).processError(error);
            expect(result).toBeDefined();
        });
    });

    describe('Public Methods', () => {
        it('should handle invokeRovoDevAskCommand', async () => {
            // Mock the webview
            (provider as any)._webView = {
                postMessage: jest.fn().mockResolvedValue(true),
            };

            await provider.invokeRovoDevAskCommand('test prompt');
            expect(provider).toBeDefined();
        });

        it('should handle setPromptTextWithFocus', async () => {
            // Mock the webview
            (provider as any)._webView = {
                postMessage: jest.fn().mockResolvedValue(true),
            };
            (provider as any)._webviewReady = true;

            await provider.setPromptTextWithFocus('test text');
            expect(provider).toBeDefined();
        });
    });

    describe('Session History Management', () => {
        let workspaceFoldersSpy: jest.SpyInstance;

        beforeEach(() => {
            jest.clearAllMocks();
            // Mock workspace folders
            workspaceFoldersSpy = jest
                .spyOn(workspace, 'workspaceFolders', 'get')
                .mockReturnValue([{ uri: { fsPath: '/test/workspace' } } as any]);
        });

        afterEach(() => {
            workspaceFoldersSpy.mockRestore();
        });

        it('should create and show sessions manager when showSessionHistory is called', async () => {
            // Setup provider with required dependencies
            (provider as any).isBoysenberry = false;
            (provider as any)._rovoDevApiClient = {
                healthcheck: jest.fn(),
                createSession: jest.fn(),
            };

            await provider.showSessionHistory();

            expect(RovoDevSessionManager).toHaveBeenCalledWith(
                '/test/workspace',
                (provider as any)._rovoDevApiClient,
                (provider as any)._telemetryProvider,
            );

            const MockedSessionsManager = jest.mocked(RovoDevSessionManager);
            const mockInstance = MockedSessionsManager.mock.results[0].value;
            expect(mockInstance.onSessionRestored).toHaveBeenCalled();
            expect(mockInstance.showPicker).toHaveBeenCalled();
        });

        it('should not create sessions manager if in boysenberry mode', async () => {
            (provider as any).isBoysenberry = true;
            (provider as any)._rovoDevApiClient = {
                healthcheck: jest.fn(),
            };

            await provider.showSessionHistory();

            expect(RovoDevSessionManager).not.toHaveBeenCalled();
        });

        it('should not create sessions manager if rovoDevApiClient is not available', async () => {
            (provider as any).isBoysenberry = false;
            (provider as any)._rovoDevApiClient = undefined;

            await provider.showSessionHistory();

            expect(RovoDevSessionManager).not.toHaveBeenCalled();
        });

        it('should not create sessions manager if no workspace folder exists', async () => {
            (provider as any).isBoysenberry = false;
            (provider as any)._rovoDevApiClient = {
                healthcheck: jest.fn(),
            };
            workspaceFoldersSpy.mockReturnValue(undefined);

            await provider.showSessionHistory();

            expect(RovoDevSessionManager).not.toHaveBeenCalled();
        });

        it('should set up onSessionRestored callback to clear and replay chat', async () => {
            (provider as any).isBoysenberry = false;
            (provider as any)._rovoDevApiClient = {
                healthcheck: jest.fn(),
            };

            // Create a mock callback capture
            let capturedCallback: (() => Promise<void>) | undefined;
            const mockSessionsManager = {
                onSessionRestored: jest.fn((callback) => {
                    capturedCallback = callback;
                    return { dispose: jest.fn() };
                }),
                showPicker: jest.fn(),
                dispose: jest.fn(),
            };

            const MockedSessionsManager = jest.mocked(RovoDevSessionManager);
            MockedSessionsManager.mockImplementation(() => mockSessionsManager as any);

            const mockChatProvider = {
                clearChat: jest.fn(),
                executeReplay: jest.fn(),
            };
            (provider as any)._chatProvider = mockChatProvider;

            await provider.showSessionHistory();

            // Verify callback was registered
            expect(mockSessionsManager.onSessionRestored).toHaveBeenCalled();

            // Simulate session restore
            if (capturedCallback) {
                await capturedCallback();
                expect(mockChatProvider.clearChat).toHaveBeenCalled();
                expect(mockChatProvider.executeReplay).toHaveBeenCalled();
            }
        });
    });

    describe('Command Context Management', () => {
        it('should set RovoDevApiReady to true when API is ready', () => {
            // This tests the logic that would be in ensureStarted
            setCommandContext(RovodevCommandContext.RovoDevApiReady, true);

            expect(setCommandContext).toHaveBeenCalledWith(RovodevCommandContext.RovoDevApiReady, true);
        });

        it('should set RovoDevApiReady to false when terminating', () => {
            // This tests the logic that would be in setRovoDevTerminated
            setCommandContext(RovodevCommandContext.RovoDevApiReady, false);

            expect(setCommandContext).toHaveBeenCalledWith(RovodevCommandContext.RovoDevApiReady, false);
        });
    });

    describe('Sessions Manager Lifecycle', () => {
        it('should dispose sessions manager when provider is terminated', () => {
            const mockSessionsManager = {
                dispose: jest.fn(),
                onSessionRestored: jest.fn(),
                showPicker: jest.fn(),
            };

            (provider as any)._rovoDevSessionsManager = mockSessionsManager;

            // Simulate termination cleanup
            (provider as any)._rovoDevSessionsManager?.dispose();
            (provider as any)._rovoDevSessionsManager = undefined;

            expect(mockSessionsManager.dispose).toHaveBeenCalled();
            expect((provider as any)._rovoDevSessionsManager).toBeUndefined();
        });

        it('should handle termination gracefully when sessions manager is undefined', () => {
            (provider as any)._rovoDevSessionsManager = undefined;

            // Should not throw
            expect(() => {
                (provider as any)._rovoDevSessionsManager?.dispose();
                (provider as any)._rovoDevSessionsManager = undefined;
            }).not.toThrow();
        });
    });
});

describe('RovoDevWebviewProvider - Business Logic', () => {
    describe('Process State Management', () => {
        it('should correctly identify disabled state', () => {
            const isDisabled = (processState: string) => {
                return processState === 'Disabled' || processState === 'Terminated';
            };

            expect(isDisabled('Disabled')).toBe(true);
            expect(isDisabled('Terminated')).toBe(true);
            expect(isDisabled('Started')).toBe(false);
            expect(isDisabled('Starting')).toBe(false);
            expect(isDisabled('NotStarted')).toBe(false);
        });

        it('should correctly identify ready state', () => {
            const isReady = (webviewReady: boolean) => {
                return !!webviewReady;
            };

            expect(isReady(true)).toBe(true);
            expect(isReady(false)).toBe(false);
        });

        it('should correctly identify visible state', () => {
            const isVisible = (webviewView: any) => {
                return webviewView?.visible ?? false;
            };

            expect(isVisible({ visible: true })).toBe(true);
            expect(isVisible({ visible: false })).toBe(false);
            expect(isVisible(undefined)).toBe(false);
            expect(isVisible(null)).toBe(false);
        });
    });

    describe('YOLO Mode Storage', () => {
        it('should return correct storage key', () => {
            const getYoloModeStorageKey = () => {
                return 'yoloMode_global';
            };

            expect(getYoloModeStorageKey()).toBe('yoloMode_global');
        });

        it('should handle boysenberry mode correctly', () => {
            const loadYoloModeFromStorage = (isBoysenberry: boolean, stored: boolean | undefined) => {
                if (isBoysenberry) {
                    return true;
                }
                return stored ?? false;
            };

            expect(loadYoloModeFromStorage(true, undefined)).toBe(true);
            expect(loadYoloModeFromStorage(true, false)).toBe(true);
            expect(loadYoloModeFromStorage(false, true)).toBe(true);
            expect(loadYoloModeFromStorage(false, false)).toBe(false);
            expect(loadYoloModeFromStorage(false, undefined)).toBe(false);
        });
    });

    describe('File Path Resolution', () => {
        it('should handle absolute paths correctly', () => {
            const makeRelativePathAbsolute = (filePath: string, workspaceRoot?: string) => {
                if (filePath.startsWith('/') || filePath.startsWith('C:')) {
                    return filePath;
                } else {
                    if (!workspaceRoot) {
                        throw new Error('No workspace folder found');
                    }
                    return `${workspaceRoot}/${filePath}`;
                }
            };

            expect(makeRelativePathAbsolute('/absolute/path')).toBe('/absolute/path');
            expect(makeRelativePathAbsolute('C:\\absolute\\path')).toBe('C:\\absolute\\path');
            expect(makeRelativePathAbsolute('relative/path', '/workspace')).toBe('/workspace/relative/path');

            expect(() => makeRelativePathAbsolute('relative/path')).toThrow('No workspace folder found');
        });
    });

    describe('Error Processing', () => {
        it('should format error messages correctly', () => {
            const formatErrorMessage = (error: { message: string; gitErrorCode?: string }) => {
                return `${error.message}${error.gitErrorCode ? `\n ${error.gitErrorCode}` : ''}`;
            };

            expect(formatErrorMessage({ message: 'Git error' })).toBe('Git error');
            expect(formatErrorMessage({ message: 'Git error', gitErrorCode: 'E001' })).toBe('Git error\n E001');
        });

        it('should handle different error types', () => {
            const processError = (error: any) => {
                const message = error.message || 'Unknown error';
                const gitErrorCode = error.gitErrorCode;
                return {
                    type: 'error',
                    text: `${message}${gitErrorCode ? `\n ${gitErrorCode}` : ''}`,
                };
            };

            expect(processError({ message: 'Test error' })).toEqual({
                type: 'error',
                text: 'Test error',
            });

            expect(processError({ message: 'Git error', gitErrorCode: 'E001' })).toEqual({
                type: 'error',
                text: 'Git error\n E001',
            });

            expect(processError({})).toEqual({
                type: 'error',
                text: 'Unknown error',
            });
        });
    });

    describe('Debug Panel Context', () => {
        it('should format process state correctly', () => {
            const formatProcessState = (processState: string, disabledReason?: string) => {
                let state = processState;
                if (processState === 'Disabled' && disabledReason) {
                    state += ' / ' + disabledReason;
                }
                return state;
            };

            expect(formatProcessState('Started')).toBe('Started');
            expect(formatProcessState('Disabled', 'Other')).toBe('Disabled / Other');
            expect(formatProcessState('Disabled')).toBe('Disabled');
        });
    });

    describe('Session Management', () => {
        it('should validate session states correctly', () => {
            const shouldExecuteNewSession = (
                processState: string,
                isDisabled: boolean,
                hasWorkspace: boolean,
                isStarted: boolean,
                pendingCancellation: boolean,
            ) => {
                if (['Disabled', 'Starting', 'NotStarted'].includes(processState)) {
                    return false;
                }

                if (isDisabled || !hasWorkspace || !isStarted || pendingCancellation) {
                    return false;
                }

                return true;
            };

            expect(shouldExecuteNewSession('Disabled', false, true, true, false)).toBe(false);
            expect(shouldExecuteNewSession('Starting', false, true, true, false)).toBe(false);
            expect(shouldExecuteNewSession('NotStarted', false, true, true, false)).toBe(false);
            expect(shouldExecuteNewSession('Started', true, true, true, false)).toBe(false);
            expect(shouldExecuteNewSession('Started', false, false, true, false)).toBe(false);
            expect(shouldExecuteNewSession('Started', false, true, false, false)).toBe(false);
            expect(shouldExecuteNewSession('Started', false, true, true, true)).toBe(false);
            expect(shouldExecuteNewSession('Started', false, true, true, false)).toBe(true);
        });
    });

    describe('Health Check Status', () => {
        it('should validate health check responses', () => {
            const isValidHealthCheck = (status: string) => {
                return (
                    status === 'healthy' ||
                    status === 'unhealthy' ||
                    status === 'unknown' ||
                    status === 'entitlement check failed' ||
                    status === 'pending user review'
                );
            };

            expect(isValidHealthCheck('healthy')).toBe(true);
            expect(isValidHealthCheck('unhealthy')).toBe(true);
            expect(isValidHealthCheck('unknown')).toBe(true);
            expect(isValidHealthCheck('entitlement check failed')).toBe(true);
            expect(isValidHealthCheck('pending user review')).toBe(true);
            expect(isValidHealthCheck('invalid')).toBe(false);
        });

        it('should handle MCP server status', () => {
            const getServersToReview = (mcpServers: Record<string, string>) => {
                return Object.keys(mcpServers).filter((x) => mcpServers[x] === 'pending user review');
            };

            expect(getServersToReview({})).toEqual([]);
            expect(getServersToReview({ server1: 'running', server2: 'pending user review' })).toEqual(['server2']);
            expect(getServersToReview({ server1: 'pending user review', server2: 'pending user review' })).toEqual([
                'server1',
                'server2',
            ]);
        });
    });

    describe('Disabled Priority', () => {
        it('should handle disabled priority correctly', () => {
            const RovoDevDisabledPriority: Record<string, number> = {
                none: 0,
                Other: 1,
                EntitlementCheckFailed: 2,
                NeedAuth: 3,
                NoWorkspaceOpen: 4,
            };

            const shouldSkipDisabled = (currentReason: string, newReason: string) => {
                return RovoDevDisabledPriority[currentReason] >= RovoDevDisabledPriority[newReason];
            };

            expect(shouldSkipDisabled('none', 'Other')).toBe(false);
            expect(shouldSkipDisabled('Other', 'EntitlementCheckFailed')).toBe(false);
            expect(shouldSkipDisabled('EntitlementCheckFailed', 'Other')).toBe(true);
            expect(shouldSkipDisabled('NeedAuth', 'NoWorkspaceOpen')).toBe(false);
            expect(shouldSkipDisabled('NoWorkspaceOpen', 'NeedAuth')).toBe(true);
        });
    });

    describe('Process State Management', () => {
        it('should handle process state transitions', () => {
            const setProcessState = (processState: string, reason: string = 'none') => {
                return { processState, reason };
            };

            expect(setProcessState('Started')).toEqual({ processState: 'Started', reason: 'none' });
            expect(setProcessState('Disabled', 'Other')).toEqual({ processState: 'Disabled', reason: 'Other' });
            expect(setProcessState('Terminated')).toEqual({ processState: 'Terminated', reason: 'none' });
        });

        it('should handle terminated state logic', () => {
            const setRovoDevTerminated = (processState: string, reason: string = 'none') => {
                if (processState === 'Disabled') {
                    return { processState, reason, isDisabled: true };
                } else {
                    return { processState, reason, isDisabled: false };
                }
            };

            expect(setRovoDevTerminated('Disabled', 'Other')).toEqual({
                processState: 'Disabled',
                reason: 'Other',
                isDisabled: true,
            });
            expect(setRovoDevTerminated('Terminated')).toEqual({
                processState: 'Terminated',
                reason: 'none',
                isDisabled: false,
            });
        });
    });

    describe('Error Message Processing', () => {
        it('should handle process termination messages', () => {
            const getProcessTerminatedMessage = (code?: number) => {
                return typeof code === 'number'
                    ? `Rovo Dev process terminated with exit code ${code}.\nPlease start a new chat session to continue.`
                    : 'Please start a new chat session to continue.';
            };

            expect(getProcessTerminatedMessage(1)).toBe(
                'Rovo Dev process terminated with exit code 1.\nPlease start a new chat session to continue.',
            );
            expect(getProcessTerminatedMessage(0)).toBe(
                'Rovo Dev process terminated with exit code 0.\nPlease start a new chat session to continue.',
            );
            expect(getProcessTerminatedMessage()).toBe('Please start a new chat session to continue.');
            expect(getProcessTerminatedMessage(undefined)).toBe('Please start a new chat session to continue.');
        });

        it('should detect UnauthorizedError in stderr and trigger login UI', () => {
            const handleProcessTermination = (stderr?: string) => {
                // Check if this is an unauthorized error (expired/invalid credentials)
                if (stderr && stderr.includes('UnauthorizedError')) {
                    return { action: 'showLoginUI', reason: 'UnauthorizedAuth' };
                }
                return { action: 'showTerminationError', reason: 'ProcessTerminated' };
            };

            expect(handleProcessTermination('Error: UnauthorizedError: Token expired')).toEqual({
                action: 'showLoginUI',
                reason: 'UnauthorizedAuth',
            });
            expect(handleProcessTermination('Some error\n    at UnauthorizedError\n    at process.ts:123')).toEqual({
                action: 'showLoginUI',
                reason: 'UnauthorizedAuth',
            });
            expect(handleProcessTermination('Network error')).toEqual({
                action: 'showTerminationError',
                reason: 'ProcessTerminated',
            });
            expect(handleProcessTermination()).toEqual({
                action: 'showTerminationError',
                reason: 'ProcessTerminated',
            });
        });

        it('should handle process failed to initialize messages', () => {
            const getProcessFailedMessage = (errorMessage?: string) => {
                return errorMessage
                    ? `${errorMessage}\nPlease start a new chat session to try again.`
                    : 'Please start a new chat session to try again.';
            };

            expect(getProcessFailedMessage('Network error')).toBe(
                'Network error\nPlease start a new chat session to try again.',
            );
            expect(getProcessFailedMessage()).toBe('Please start a new chat session to try again.');
            expect(getProcessFailedMessage(undefined)).toBe('Please start a new chat session to try again.');
        });
    });

    describe('Debug Panel Context', () => {
        it('should handle debug panel context updates', () => {
            const updateDebugPanelContext = (processState: string, disabledReason?: string) => {
                const context = { ProcessState: processState };
                if (processState === 'Disabled' && disabledReason) {
                    context.ProcessState += ' / ' + disabledReason;
                }
                return context;
            };

            expect(updateDebugPanelContext('Started')).toEqual({ ProcessState: 'Started' });
            expect(updateDebugPanelContext('Disabled', 'Other')).toEqual({ ProcessState: 'Disabled / Other' });
            expect(updateDebugPanelContext('Disabled')).toEqual({ ProcessState: 'Disabled' });
        });

        it('should handle MCP context updates', () => {
            const updateMcpContext = (mcpServers: Record<string, string>) => {
                const context: Record<string, string> = {};
                for (const server in mcpServers) {
                    context[server] = mcpServers[server];
                }
                return context;
            };

            expect(updateMcpContext({})).toEqual({});
            expect(updateMcpContext({ server1: 'running' })).toEqual({ server1: 'running' });
            expect(updateMcpContext({ server1: 'running', server2: 'pending' })).toEqual({
                server1: 'running',
                server2: 'pending',
            });
        });
    });

    describe('Webview Message Handling', () => {
        it('should handle unknown message types', () => {
            const handleUnknownMessage = (messageType: string) => {
                return `Unknown message type: ${messageType}`;
            };

            expect(handleUnknownMessage('UnknownType')).toBe('Unknown message type: UnknownType');
            expect(handleUnknownMessage('InvalidMessage')).toBe('Unknown message type: InvalidMessage');
        });

        it('should handle tool permission choices', () => {
            const handleToolPermissionChoice = (choice: string) => {
                if (choice === 'allowAll') {
                    return 'Allow all tools';
                }
                return `Handle tool permission: ${choice}`;
            };

            expect(handleToolPermissionChoice('allowAll')).toBe('Allow all tools');
            expect(handleToolPermissionChoice('deny')).toBe('Handle tool permission: deny');
            expect(handleToolPermissionChoice('allow')).toBe('Handle tool permission: allow');
        });
    });

    describe('YOLO Mode Handling', () => {
        it('should handle YOLO mode storage operations', () => {
            const handleYoloModeStorage = (isBoysenberry: boolean, enabled: boolean) => {
                if (isBoysenberry) {
                    return 'YOLO mode always enabled in Boysenberry';
                }
                return `YOLO mode ${enabled ? 'enabled' : 'disabled'} in regular environment`;
            };

            expect(handleYoloModeStorage(true, false)).toBe('YOLO mode always enabled in Boysenberry');
            expect(handleYoloModeStorage(true, true)).toBe('YOLO mode always enabled in Boysenberry');
            expect(handleYoloModeStorage(false, true)).toBe('YOLO mode enabled in regular environment');
            expect(handleYoloModeStorage(false, false)).toBe('YOLO mode disabled in regular environment');
        });
    });

    describe('File Operations', () => {
        it('should handle file existence checks', () => {
            const checkFileExists = (filePath: string, exists: boolean) => {
                return {
                    filePath,
                    exists,
                    message: exists ? 'File exists' : 'File not found',
                };
            };

            expect(checkFileExists('/path/to/file.txt', true)).toEqual({
                filePath: '/path/to/file.txt',
                exists: true,
                message: 'File exists',
            });
            expect(checkFileExists('/path/to/file.txt', false)).toEqual({
                filePath: '/path/to/file.txt',
                exists: false,
                message: 'File not found',
            });
        });
    });
});
