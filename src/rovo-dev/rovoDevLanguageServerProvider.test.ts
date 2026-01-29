import { ExtensionContext } from 'vscode';

import { RovoDevLanguageServerProvider } from './rovoDevLanguageServerProvider';
import { RovoDevProcessState } from './rovoDevProcessManager';

// Mock vscode-languageclient/node
jest.mock('vscode-languageclient/node', () => ({
    LanguageClient: jest.fn().mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
    })),
    TransportKind: {
        stdio: 0,
    },
}));

// Mock fs
jest.mock('fs', () => ({
    access: jest.fn((path, mode, callback) => callback(null)), // Binary exists by default
    constants: {
        X_OK: 1,
    },
}));

// Mock child_process.spawn to capture the environment variables
const mockSpawn = jest.fn().mockReturnValue({
    on: jest.fn(),
    kill: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    stdin: { on: jest.fn() },
});
jest.mock('child_process', () => ({
    spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock the ExtensionApi
jest.mock('./api/extensionApi', () => {
    return {
        ExtensionApi: jest.fn().mockImplementation(() => ({
            auth: {
                getCloudPrimaryAuthSite: jest.fn().mockResolvedValue({
                    host: 'test.atlassian.net',
                    isValid: true,
                    authInfo: {
                        username: 'test@example.com',
                        password: 'test-api-token',
                        user: { id: '123', displayName: 'Test User', email: 'test@example.com', avatarUrl: '' },
                    },
                }),
            },
            metadata: {
                appInstanceId: jest.fn().mockReturnValue('test-sandbox-id'),
            },
        })),
    };
});

// Mock the process manager
const mockStateChangedHandlers: ((state: RovoDevProcessState) => void)[] = [];
let mockCurrentState: RovoDevProcessState = { state: 'NotStarted' };

jest.mock('./rovoDevProcessManager', () => {
    return {
        GetRovoDevURIs: jest.fn().mockReturnValue({
            RovoDevBaseDir: '/mock/base/dir',
            RovoDevVersionDir: '/mock/version/dir',
            RovoDevBinPath: '/mock/bin/path/atlassian_cli_rovodev',
            RovoDevZipUrl: 'https://example.com/rovodev.zip',
        }),
        RovoDevProcessManager: {
            get state() {
                return mockCurrentState;
            },
            onStateChanged: jest.fn((handler: (state: RovoDevProcessState) => void) => {
                mockStateChangedHandlers.push(handler);
                return { dispose: jest.fn() };
            }),
        },
    };
});

// Helper to simulate state changes
function setMockProcessState(newState: RovoDevProcessState) {
    mockCurrentState = newState;
    mockStateChangedHandlers.forEach((h) => h(newState));
}

function resetMockProcessManager() {
    mockCurrentState = { state: 'NotStarted' };
    mockStateChangedHandlers.length = 0;
}

// Mock RovoDevLogger
jest.mock('./util/rovoDevLogger', () => ({
    RovoDevLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock vscode
jest.mock('vscode', () => {
    // Create a proper Disposable class that can be extended
    class MockDisposable {
        private callOnDispose: () => void;
        constructor(callOnDispose: () => void) {
            this.callOnDispose = callOnDispose;
        }
        dispose() {
            this.callOnDispose();
        }
        static from(...disposables: { dispose: () => void }[]) {
            return new MockDisposable(() => disposables.forEach((d) => d.dispose?.()));
        }
    }

    return {
        Disposable: MockDisposable,
        workspace: {
            createFileSystemWatcher: jest.fn().mockReturnValue({
                dispose: jest.fn(),
            }),
            workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
        },
        window: {
            createOutputChannel: jest.fn().mockReturnValue({
                appendLine: jest.fn(),
                dispose: jest.fn(),
            }),
            showErrorMessage: jest.fn(),
            showInformationMessage: jest.fn(),
        },
        commands: {
            registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        },
    };
});

describe('RovoDevLanguageServerProvider', () => {
    let mockContext: ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        resetMockProcessManager();
        mockSpawn.mockClear();

        mockContext = {
            storageUri: { fsPath: '/mock/storage' },
            subscriptions: [],
        } as unknown as ExtensionContext;

        // Default to Started state so LSP can start
        mockCurrentState = {
            state: 'Started',
            jiraSiteUserInfo: { id: '123', displayName: 'Test User', email: 'test@example.com', avatarUrl: '' },
            pid: 12345,
            hostname: '127.0.0.1',
            httpPort: 40000,
            sessionToken: 'test-token',
            timeStarted: Date.now(),
        };
    });

    it('should start language server when process state is Started', async () => {
        const { LanguageClient } = require('vscode-languageclient/node');

        new RovoDevLanguageServerProvider(mockContext);

        // Give room for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(LanguageClient).toHaveBeenCalledWith(
            'rovoDevLanguageServer',
            'Rovo Dev Language Server',
            expect.any(Function), // serverOptions is now a function that spawns the process
            expect.objectContaining({
                documentSelector: [{ scheme: 'file' }, { scheme: 'untitled' }],
            }),
        );
    });

    it('should start language server when process state changes to Started', async () => {
        const { LanguageClient } = require('vscode-languageclient/node');

        // Start with NotStarted state
        mockCurrentState = { state: 'NotStarted' };

        new RovoDevLanguageServerProvider(mockContext);

        // Give room for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        // LSP should not have started yet
        expect(LanguageClient).not.toHaveBeenCalled();

        // Simulate state change to Started
        setMockProcessState({
            state: 'Started',
            jiraSiteUserInfo: { id: '123', displayName: 'Test User', email: 'test@example.com', avatarUrl: '' },
            pid: 12345,
            hostname: '127.0.0.1',
            httpPort: 40000,
            sessionToken: 'test-token',
            timeStarted: Date.now(),
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        // Now LSP should have started
        expect(LanguageClient).toHaveBeenCalled();
    });

    it('should not start language server when process state is NotStarted', async () => {
        const { LanguageClient } = require('vscode-languageclient/node');

        // Set to NotStarted state
        mockCurrentState = { state: 'NotStarted' };

        new RovoDevLanguageServerProvider(mockContext);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(LanguageClient).not.toHaveBeenCalled();
    });

    it('should register the restart command on construction', () => {
        const { commands } = require('vscode');

        new RovoDevLanguageServerProvider(mockContext);

        expect(commands.registerCommand).toHaveBeenCalledWith('atlascode.rovodev.restartLsp', expect.any(Function));
    });

    it('should create an output channel on construction', () => {
        const { window } = require('vscode');

        new RovoDevLanguageServerProvider(mockContext);

        expect(window.createOutputChannel).toHaveBeenCalledWith('Rovo Dev Language Server');
    });

    it('should not start language server if binary does not exist', async () => {
        const { LanguageClient } = require('vscode-languageclient/node');
        const fs = require('fs');
        const { RovoDevLogger } = require('./util/rovoDevLogger');

        // Make binary check fail
        fs.access.mockImplementation((path: string, mode: number, callback: (err: Error | null) => void) =>
            callback(new Error('File not found')),
        );

        new RovoDevLanguageServerProvider(mockContext);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(LanguageClient).not.toHaveBeenCalled();
        expect(RovoDevLogger.warn).toHaveBeenCalledWith(
            'Rovo Dev LSP: Binary at /mock/bin/path/atlassian_cli_rovodev is not found, skipping language server start',
        );
    });

    it('should stop language server when disposed', async () => {
        // Reset fs mock to allow binary check to pass
        const fs = require('fs');
        fs.access.mockImplementation((path: string, mode: number, callback: (err: Error | null) => void) =>
            callback(null),
        );

        const { LanguageClient } = require('vscode-languageclient/node');
        const mockStop = jest.fn().mockResolvedValue(undefined);
        const mockStart = jest.fn().mockResolvedValue(undefined);
        const mockIsRunning = jest.fn().mockReturnValue(true);
        LanguageClient.mockImplementation(() => ({
            start: mockStart,
            stop: mockStop,
            isRunning: mockIsRunning,
        }));

        const provider = new RovoDevLanguageServerProvider(mockContext);

        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify the client was created and started
        expect(LanguageClient).toHaveBeenCalled();
        expect(mockStart).toHaveBeenCalled();

        // Dispose the provider
        provider.dispose();

        // The stop should be called - wait a bit longer since stopLanguageServer is async
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockStop).toHaveBeenCalled();
    });

    it('should restart language server when restart command is invoked', async () => {
        // Reset fs mock to allow binary check to pass
        const fs = require('fs');
        fs.access.mockImplementation((path: string, mode: number, callback: (err: Error | null) => void) =>
            callback(null),
        );

        const { LanguageClient } = require('vscode-languageclient/node');
        const mockStop = jest.fn().mockResolvedValue(undefined);
        const mockStart = jest.fn().mockResolvedValue(undefined);
        const mockIsRunning = jest.fn().mockReturnValue(true);
        LanguageClient.mockImplementation(() => ({
            start: mockStart,
            stop: mockStop,
            isRunning: mockIsRunning,
        }));

        const provider = new RovoDevLanguageServerProvider(mockContext);

        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify the client was started once
        expect(mockStart).toHaveBeenCalledTimes(1);

        // Call the restart method
        await provider.restartLanguageServer();

        // Should have stopped and started again
        expect(mockStop).toHaveBeenCalledTimes(1);
        expect(mockStart).toHaveBeenCalledTimes(2);
    });

    it('should pass correct environment variables to the spawned LSP process', async () => {
        const { LanguageClient } = require('vscode-languageclient/node');

        // Capture the serverOptions function when LanguageClient is created
        let capturedServerOptions: (() => Promise<unknown>) | undefined;
        LanguageClient.mockImplementation(
            (id: string, name: string, serverOptions: () => Promise<unknown>, clientOptions: unknown) => {
                capturedServerOptions = serverOptions;
                return {
                    start: jest.fn().mockResolvedValue(undefined),
                    stop: jest.fn().mockResolvedValue(undefined),
                    isRunning: jest.fn().mockReturnValue(true),
                };
            },
        );

        new RovoDevLanguageServerProvider(mockContext);

        // Wait for the LSP to start
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify serverOptions was captured
        expect(capturedServerOptions).toBeDefined();

        // Call the serverOptions function to trigger spawn
        await capturedServerOptions!();

        // Verify spawn was called with correct arguments
        expect(mockSpawn).toHaveBeenCalledTimes(1);
        expect(mockSpawn).toHaveBeenCalledWith(
            '/mock/bin/path/atlassian_cli_rovodev',
            ['lsp'],
            expect.objectContaining({
                cwd: '/mock/workspace',
                env: expect.objectContaining({
                    ROVODEV_SANDBOX_ID: 'test-sandbox-id',
                    USER_EMAIL: 'test@example.com',
                    USER_API_TOKEN: 'test-api-token',
                }),
            }),
        );
    });
});
