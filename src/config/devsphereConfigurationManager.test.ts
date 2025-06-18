import * as vscode from 'vscode';

import {
    DevsphereConfigurationManager,
    executeVSCodeCommand,
    getDefaultLifecycleFns,
    LifecycleFns,
    updateConfig,
    View,
} from './devsphere-config/devsphereConfigurationManager';

// Mock vscode module
jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(),
    },
}));

describe('executeVSCodeCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should execute command successfully', async () => {
        const mockExecuteCommand = vscode.commands.executeCommand as jest.Mock;
        mockExecuteCommand.mockResolvedValue(undefined);

        await executeVSCodeCommand('test.command');

        expect(mockExecuteCommand).toHaveBeenCalledWith('test.command');
    });

    it('should handle command execution error and log it', async () => {
        const mockExecuteCommand = vscode.commands.executeCommand as jest.Mock;
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const error = new Error('Command failed');
        mockExecuteCommand.mockRejectedValue(error);

        await executeVSCodeCommand('test.command');

        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to execute VS Code command: test.command', error);

        consoleErrorSpy.mockRestore();
    });
});

describe('updateConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update config when value is different', async () => {
        const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;
        const mockGet = jest.fn().mockReturnValue('oldValue');
        const mockUpdate = jest.fn().mockResolvedValue(undefined);

        mockGetConfiguration.mockReturnValue({
            get: mockGet,
            update: mockUpdate,
        });

        await updateConfig('testSection', 'testKey', 'newValue');

        expect(mockGetConfiguration).toHaveBeenCalledWith('testSection');
        expect(mockGet).toHaveBeenCalledWith('testKey');
        expect(mockUpdate).toHaveBeenCalledWith('testKey', 'newValue', true);
    });

    it('should not update config when value is the same', async () => {
        const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;
        const mockGet = jest.fn().mockReturnValue('sameValue');
        const mockUpdate = jest.fn();

        mockGetConfiguration.mockReturnValue({
            get: mockGet,
            update: mockUpdate,
        });

        await updateConfig('testSection', 'testKey', 'sameValue');

        expect(mockGetConfiguration).toHaveBeenCalledWith('testSection');
        expect(mockGet).toHaveBeenCalledWith('testKey');
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});

describe('getDefaultLifecycleFns', () => {
    it('should return default lifecycle functions', () => {
        const lifecycle = getDefaultLifecycleFns();

        expect(lifecycle).toHaveProperty('setup');
        expect(lifecycle).toHaveProperty('shutdown');
        expect(typeof lifecycle.setup).toBe('function');
        expect(typeof lifecycle.shutdown).toBe('function');
    });

    it('should have setup function that resolves', async () => {
        const lifecycle = getDefaultLifecycleFns();
        await expect(lifecycle.setup()).resolves.toBeUndefined();
    });

    it('should have shutdown function that resolves', async () => {
        const lifecycle = getDefaultLifecycleFns();
        await expect(lifecycle.shutdown()).resolves.toBeUndefined();
    });
});

describe('DevsphereConfigurationManager', () => {
    let manager: DevsphereConfigurationManager;
    let mockLifecycleFns: Record<View, LifecycleFns>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLifecycleFns = {
            [View.Noop]: {
                setup: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
            },
            [View.Review]: {
                setup: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
            },
        };

        manager = new DevsphereConfigurationManager(mockLifecycleFns);
    });

    describe('constructor', () => {
        it('should create instance successfully', () => {
            expect(manager).toBeInstanceOf(DevsphereConfigurationManager);
        });
    });

    describe('dispose', () => {
        it('should dispose and reset lifecycle functions', () => {
            manager.dispose();

            // After dispose, the manager should work but with default lifecycle functions
            expect(manager).toBeInstanceOf(DevsphereConfigurationManager);
        });
    });

    describe('setupView', () => {
        it('should setup new view and shutdown old one', async () => {
            await manager.setupView(View.Review);

            expect(mockLifecycleFns[View.Noop].shutdown).toHaveBeenCalled();
            expect(mockLifecycleFns[View.Review].setup).toHaveBeenCalled();
        });

        it('should not change view if same view is requested', async () => {
            await manager.setupView(View.Noop);

            expect(mockLifecycleFns[View.Noop].shutdown).not.toHaveBeenCalled();
            expect(mockLifecycleFns[View.Noop].setup).not.toHaveBeenCalled();
        });

        it('should handle shutdown error gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const shutdownError = new Error('Shutdown failed');
            (mockLifecycleFns[View.Noop].shutdown as jest.Mock).mockRejectedValue(shutdownError);

            await manager.setupView(View.Review);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to shutdown view: noop', shutdownError);
            expect(mockLifecycleFns[View.Review].setup).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should handle setup error gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const setupError = new Error('Setup failed');
            (mockLifecycleFns[View.Review].setup as jest.Mock).mockRejectedValue(setupError);

            await manager.setupView(View.Review);

            expect(mockLifecycleFns[View.Noop].shutdown).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to setup view: review', setupError);

            consoleErrorSpy.mockRestore();
        });
    });
});
