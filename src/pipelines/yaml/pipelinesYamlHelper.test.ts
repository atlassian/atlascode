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
        parse: jest.fn(),
    },
    window: {
        showWarningMessage: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(),
    },
}));

jest.mock('../../resources', () => ({
    Resources: {
        pipelinesSchemaPath: '/path/to/schema.json',
    },
}));

jest.mock('../../logger', () => ({
    Logger: {
        error: jest.fn(),
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
    const mockUriParse = Uri.parse as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockWorkspaceConfig.mockReturnValue(mockConfiguration);
        mockUriFile.mockReturnValue({ toString: () => 'file:///path/to/schema.json' });
        mockUriParse.mockImplementation((uri: string) => {
            // Parse the URI manually to preserve case in scheme
            const colonIndex = uri.indexOf(':');
            const scheme = colonIndex >= 0 ? uri.substring(0, colonIndex) : '';
            const rest = colonIndex >= 0 ? uri.substring(colonIndex + 1) : '';

            // Extract path from the rest (after //)
            let path = '';
            if (rest.startsWith('//')) {
                const doubleSlashRemoved = rest.substring(2);
                const firstSlashIndex = doubleSlashRemoved.indexOf('/');
                path = firstSlashIndex >= 0 ? doubleSlashRemoved.substring(firstSlashIndex) : '';
            }

            return {
                scheme,
                path,
            };
        });
    });

    describe('addPipelinesSchemaToYamlConfig', () => {
        it('should do nothing when no existing config', async () => {
            const mockInspectResult = {
                globalValue: undefined,
            };
            mockConfiguration.inspect.mockReturnValue(mockInspectResult);

            await addPipelinesSchemaToYamlConfig();

            expect(mockConfiguration.inspect).toHaveBeenCalledWith('yaml.schemas');
            expect(mockConfiguration.update).not.toHaveBeenCalled();
        });

        it('should remove schema configuration when config exists', async () => {
            const existingConfig = {
                'file:///atlascode/schema.json': BB_PIPELINES_FILENAME,
            };
            const mockInspectResult = {
                globalValue: existingConfig,
            };
            mockConfiguration.inspect.mockReturnValue(mockInspectResult);

            await addPipelinesSchemaToYamlConfig();

            expect(mockConfiguration.update).toHaveBeenCalledWith(
                'yaml.schemas',
                undefined,
                ConfigurationTarget.Global,
            );
        });

        it('should save existing props in configuration if they exist', async () => {
            const existingConfig = {
                'file:///old-atlascode/schema.json': BB_PIPELINES_FILENAME,
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

            expect(mockConfiguration.update).not.toHaveBeenCalledWith();
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

        it('should call registerContributor with correct schema name and callback functions', async () => {
            const mockYamlPlugin = {
                registerContributor: jest.fn(),
            };
            const mockExtension = {
                activate: jest.fn().mockResolvedValue(mockYamlPlugin),
            };
            mockExtensionsGetExtension.mockReturnValue(mockExtension);

            await activateYamlExtension();

            expect(mockYamlPlugin.registerContributor).toHaveBeenCalledTimes(1);
            const [schemaName, onRequestSchemaURI, onRequestSchemaContent] =
                mockYamlPlugin.registerContributor.mock.calls[0];

            expect(schemaName).toBe('BitbucketPipelinesAtlascode');
            expect(typeof onRequestSchemaURI).toBe('function');
            expect(typeof onRequestSchemaContent).toBe('function');
        });

        describe('registerContributor callbacks', () => {
            let onRequestSchemaURI: (resource: string) => string | undefined;
            let onRequestSchemaContent: (schemaUri: string) => string | undefined;

            beforeEach(async () => {
                const mockYamlPlugin = {
                    registerContributor: jest.fn(),
                };
                const mockExtension = {
                    activate: jest.fn().mockResolvedValue(mockYamlPlugin),
                };
                mockExtensionsGetExtension.mockReturnValue(mockExtension);

                await activateYamlExtension();

                const [, uriCallback, contentCallback] = mockYamlPlugin.registerContributor.mock.calls[0];
                onRequestSchemaURI = uriCallback;
                onRequestSchemaContent = contentCallback;
            });

            describe('onRequestSchemaURI', () => {
                it('should return schema URI for bitbucket-pipelines.yml files', () => {
                    const result = onRequestSchemaURI('path/to/bitbucket-pipelines.yml');
                    expect(result).toBe('BitbucketPipelinesAtlascode://schema/porter');
                });

                it('should return schema URI for nested bitbucket-pipelines.yml files', () => {
                    const result = onRequestSchemaURI('/absolute/path/to/bitbucket-pipelines.yml');
                    expect(result).toBe('BitbucketPipelinesAtlascode://schema/porter');
                });

                it('should return undefined for non-bitbucket-pipelines.yml files', () => {
                    const result = onRequestSchemaURI('path/to/other-file.yml');
                    expect(result).toBeUndefined();
                });

                it('should return undefined for files with similar names but not exact match', () => {
                    const result = onRequestSchemaURI('path/to/bitbucket-pipelines-dev.yml');
                    expect(result).toBeUndefined();
                });

                it('should return undefined for empty resource path', () => {
                    const result = onRequestSchemaURI('');
                    expect(result).toBeUndefined();
                });
            });

            describe('onRequestSchemaContent', () => {
                it('should return schema content for correct schema URI', () => {
                    const result = onRequestSchemaContent('BitbucketPipelinesAtlascode://schema/porter');

                    expect(result).toBeDefined();
                    expect(() => JSON.parse(result!)).not.toThrow();
                });

                it('should return undefined for incorrect schema name', () => {
                    const result = onRequestSchemaContent('WrongSchema://schema/porter');
                    expect(result).toBeUndefined();
                });

                it('should return undefined for missing path', () => {
                    const result = onRequestSchemaContent('BitbucketPipelinesAtlascode://');
                    expect(result).toBeUndefined();
                });

                it('should return undefined for path not starting with slash', () => {
                    const result = onRequestSchemaContent('BitbucketPipelinesAtlascode:schema/porter');
                    expect(result).toBeUndefined();
                });

                it('should return undefined for empty schema URI', () => {
                    const result = onRequestSchemaContent('');
                    expect(result).toBeUndefined();
                });

                it('should return undefined for malformed URI', () => {
                    const result = onRequestSchemaContent('not-a-valid-uri');
                    expect(result).toBeUndefined();
                });
            });
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
