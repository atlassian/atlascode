import { commands, ConfigurationTarget, extensions, Uri, window, workspace } from 'vscode';

import { activateYamlExtension, addPipelinesSchemaToYamlConfig, BB_PIPELINES_FILENAME } from './pipelinesYamlHelper';

// Mock vscode modules
jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn(),
    },
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
    },
    extensions: {
        getExtension: jest.fn(),
    },
    Uri: {
        file: jest.fn(),
    },
    window: {
        showWarningMessage: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(),
    },
}));

// Mock Resources
jest.mock('../../resources', () => ({
    Resources: {
        pipelinesSchemaPath: '/path/to/schema.json',
    },
}));

describe('pipelinesYamlHelper', () => {
    const mockConfiguration = {
        inspect: jest.fn(),
        update: jest.fn(),
    };

    const mockWorkspaceConfig = workspace.getConfiguration as jest.Mock;
    const mockExtensionsGetExtension = extensions.getExtension as jest.Mock;
    const mockCommandsExecuteCommand = commands.executeCommand as jest.Mock;
    const mockWindowShowWarningMessage = window.showWarningMessage as jest.Mock;
    const mockUriFile = Uri.file as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockWorkspaceConfig.mockReturnValue(mockConfiguration);
        mockUriFile.mockReturnValue({ toString: () => 'file:///path/to/schema.json' });
    });

    describe('addPipelinesSchemaToYamlConfig', () => {
        it('should add schema configuration when no existing config', async () => {
            const mockInspectResult = {
                globalValue: undefined,
            };
            mockConfiguration.inspect.mockReturnValue(mockInspectResult);

            await addPipelinesSchemaToYamlConfig();

            expect(mockConfiguration.inspect).toHaveBeenCalledWith('yaml.schemas');
            expect(mockConfiguration.update).toHaveBeenCalledWith(
                'yaml.schemas',
                { 'file:///path/to/schema.json': BB_PIPELINES_FILENAME },
                ConfigurationTarget.Global,
            );
        });

        it('should add schema configuration when existing config exists', async () => {
            const existingConfig = {
                'file:///other/schema.json': 'other-file.yml',
            };
            const mockInspectResult = {
                globalValue: existingConfig,
            };
            mockConfiguration.inspect.mockReturnValue(mockInspectResult);

            await addPipelinesSchemaToYamlConfig();

            expect(mockConfiguration.update).toHaveBeenCalledWith(
                'yaml.schemas',
                {
                    'file:///other/schema.json': 'other-file.yml',
                    'file:///path/to/schema.json': BB_PIPELINES_FILENAME,
                },
                ConfigurationTarget.Global,
            );
        });

        it('should replace existing schema configuration for same filename', async () => {
            const existingConfig = {
                'file:///old/schema.json': BB_PIPELINES_FILENAME,
                'file:///other/schema.json': 'other-file.yml',
            };
            const mockInspectResult = {
                globalValue: existingConfig,
            };
            mockConfiguration.inspect.mockReturnValue(mockInspectResult);

            await addPipelinesSchemaToYamlConfig();

            expect(mockConfiguration.update).toHaveBeenCalledWith(
                'yaml.schemas',
                {
                    'file:///other/schema.json': 'other-file.yml',
                    'file:///path/to/schema.json': BB_PIPELINES_FILENAME,
                },
                ConfigurationTarget.Global,
            );
        });

        it('should handle null config gracefully', async () => {
            const mockInspectResult = {
                globalValue: null,
            };
            mockConfiguration.inspect.mockReturnValue(mockInspectResult);

            await addPipelinesSchemaToYamlConfig();

            expect(mockConfiguration.update).toHaveBeenCalledWith(
                'yaml.schemas',
                { 'file:///path/to/schema.json': BB_PIPELINES_FILENAME },
                ConfigurationTarget.Global,
            );
        });
    });

    describe('activateYamlExtension', () => {
        const YAML_EXTENSION_ID = 'redhat.vscode-yaml';

        it('should activate YAML extension when extension exists and has registerContributor', async () => {
            const mockYamlPlugin = {
                registerContributor: jest.fn(),
            };
            const mockExtension = {
                activate: jest.fn().mockResolvedValue(mockYamlPlugin),
            };
            mockExtensionsGetExtension.mockReturnValue(mockExtension);

            const result = await activateYamlExtension();

            expect(mockExtensionsGetExtension).toHaveBeenCalledWith(YAML_EXTENSION_ID);
            expect(mockExtension.activate).toHaveBeenCalled();
            expect(result).toBe(mockYamlPlugin);
        });

        it('should show warning and prompt installation when extension is not found', async () => {
            mockExtensionsGetExtension.mockReturnValue(undefined);
            const mockThen = jest.fn();
            mockWindowShowWarningMessage.mockReturnValue({ then: mockThen });

            const result = await activateYamlExtension();

            expect(mockExtensionsGetExtension).toHaveBeenCalledWith(YAML_EXTENSION_ID);
            expect(mockWindowShowWarningMessage).toHaveBeenCalledWith(
                "Please install 'YAML Support by Red Hat' via the Extensions pane.",
                'install yaml extension',
            );
            expect(result).toBeUndefined();
        });

        it('should execute install command when user clicks install button', async () => {
            mockExtensionsGetExtension.mockReturnValue(undefined);
            const mockThen = jest.fn((callback) => {
                callback('install yaml extension');
            });
            mockWindowShowWarningMessage.mockReturnValue({ then: mockThen });

            await activateYamlExtension();

            expect(mockCommandsExecuteCommand).toHaveBeenCalledWith(
                'workbench.extensions.installExtension',
                YAML_EXTENSION_ID,
            );
        });

        it('should show warning when extension exists but does not support registerContributor', async () => {
            const mockYamlPlugin = {}; // No registerContributor method
            const mockExtension = {
                activate: jest.fn().mockResolvedValue(mockYamlPlugin),
            };
            mockExtensionsGetExtension.mockReturnValue(mockExtension);

            const result = await activateYamlExtension();

            expect(mockExtension.activate).toHaveBeenCalled();
            expect(mockWindowShowWarningMessage).toHaveBeenCalledWith(
                "The installed Red Hat YAML extension doesn't support Intellisense. Please upgrade 'YAML Support by Red Hat' via the Extensions pane.",
            );
            expect(result).toBeUndefined();
        });

        it('should show warning when extension activation returns null', async () => {
            const mockExtension = {
                activate: jest.fn().mockResolvedValue(null),
            };
            mockExtensionsGetExtension.mockReturnValue(mockExtension);

            const result = await activateYamlExtension();

            expect(mockExtension.activate).toHaveBeenCalled();
            expect(mockWindowShowWarningMessage).toHaveBeenCalledWith(
                "The installed Red Hat YAML extension doesn't support Intellisense. Please upgrade 'YAML Support by Red Hat' via the Extensions pane.",
            );
            expect(result).toBeUndefined();
        });

        it('should show warning when extension activation returns undefined', async () => {
            const mockExtension = {
                activate: jest.fn().mockResolvedValue(undefined),
            };
            mockExtensionsGetExtension.mockReturnValue(mockExtension);

            const result = await activateYamlExtension();

            expect(mockExtension.activate).toHaveBeenCalled();
            expect(mockWindowShowWarningMessage).toHaveBeenCalledWith(
                "The installed Red Hat YAML extension doesn't support Intellisense. Please upgrade 'YAML Support by Red Hat' via the Extensions pane.",
            );
            expect(result).toBeUndefined();
        });
    });

    describe('constants', () => {
        it('should export BB_PIPELINES_FILENAME constant', () => {
            expect(BB_PIPELINES_FILENAME).toBe('bitbucket-pipelines.yml');
        });
    });
});
