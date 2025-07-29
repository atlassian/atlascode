// Mock problematic modules before any imports
jest.mock('turndown', () => {
    const mockTurndownService = jest.fn().mockImplementation(() => ({
        addRule: jest.fn(),
        turndown: jest.fn(),
    }));
    return {
        __esModule: true,
        default: mockTurndownService,
    };
});

jest.mock('slash', () => ({
    __esModule: true,
    default: jest.fn((path) => path.replace(/\\/g, '/')),
}));

import { pid } from 'process';
import { gt as semver_gt } from 'semver';
import { commands, env, ExtensionContext, extensions, languages, Memento, window } from 'vscode';

import { installedEvent, launchedEvent, upgradedEvent } from './analytics';
import { startListening } from './atlclients/negotiate';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { CommandContext, setCommandContext } from './commandContext';
import { registerCommands, registerRovoDevCommands } from './commands';
import { Configuration } from './config/configuration';
import { Commands, ExtensionId } from './constants';
import { Container } from './container';
import { registerAnalyticsClient, registerErrorReporting, unregisterErrorReporting } from './errorReporting';
import { activate, deactivate } from './extension';
import { provideCodeLenses } from './jira/todoObserver';
import { Logger } from './logger';
import { PipelinesYamlCompletionProvider } from './pipelines/yaml/pipelinesYamlCompletionProvider';
import {
    activateYamlExtension,
    addPipelinesSchemaToYamlConfig,
    BB_PIPELINES_FILENAME,
} from './pipelines/yaml/pipelinesYamlHelper';
import { registerResources } from './resources';
import { deactivateRovoDevProcessManager, initializeRovoDevProcessManager } from './rovo-dev/rovoDevProcessManager';
import { FeatureFlagClient } from './util/featureFlags';
import { NotificationManagerImpl } from './views/notifications/notificationManager';

// Mock all external dependencies
jest.mock('./analytics');
jest.mock('./atlclients/negotiate');
jest.mock('./bitbucket/bbContext');
jest.mock('./codebucket/command/registerCommands');
jest.mock('./commandContext');
jest.mock('./commands');
jest.mock('./config/configuration');
jest.mock('./container');
jest.mock('./errorReporting');
jest.mock('./jira/todoObserver');
jest.mock('./logger');
jest.mock('./pipelines/yaml/pipelinesYamlCompletionProvider');
jest.mock('./pipelines/yaml/pipelinesYamlHelper');
jest.mock('./resources');
jest.mock('./rovo-dev/rovoDevProcessManager');
jest.mock('./util/featureFlags');
jest.mock('./views/notifications/notificationManager');
jest.mock('./views/pullrequest/prCommentController');
jest.mock('semver');

// Mock process.hrtime
const mockHrtime = jest.fn();
Object.defineProperty(process, 'hrtime', {
    value: mockHrtime,
    writable: true,
});

// Mock setTimeout
jest.useFakeTimers();

describe('extension', () => {
    let mockContext: Partial<ExtensionContext>;
    let mockGlobalState: jest.Mocked<Memento>;
    let mockExtension: any;
    let mockAnalyticsClient: any;
    let mockSiteManager: any;
    let mockNotificationManager: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();

        // Reset environment variables
        delete process.env.ROVODEV_BBY;
        delete process.env.ROVODEV_ENABLED;

        // Mock global state
        mockGlobalState = {
            get: jest.fn(),
            update: jest.fn(),
            keys: jest.fn(),
        } as jest.Mocked<Memento>;

        // Mock extension context
        mockContext = {
            subscriptions: [],
            globalState: {
                ...mockGlobalState,
                setKeysForSync: jest.fn(),
            },
        };

        // Mock extension
        mockExtension = {
            packageJSON: {
                version: '1.0.0',
            },
        };

        // Mock analytics client
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        };

        // Mock site manager
        mockSiteManager = {
            productHasAtLeastOneSite: jest.fn(),
            numberOfAuthedSites: jest.fn(),
        };

        // Mock notification manager
        mockNotificationManager = {
            listen: jest.fn(),
            stopListening: jest.fn(),
        };

        // Setup mocks
        const mockGetExtension = jest.fn().mockReturnValue(mockExtension);
        (extensions as any).getExtension = mockGetExtension;
        (Container.initialize as jest.Mock).mockResolvedValue(undefined);
        (Container as any).analyticsClient = mockAnalyticsClient;
        (Container as any).siteManager = mockSiteManager;
        (NotificationManagerImpl.getInstance as jest.Mock).mockReturnValue(mockNotificationManager);
        (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(false);
        (FeatureFlagClient.checkGate as jest.Mock).mockReturnValue(false);
        (installedEvent as jest.Mock).mockResolvedValue({ type: 'track' });
        (upgradedEvent as jest.Mock).mockResolvedValue({ type: 'track' });
        (launchedEvent as jest.Mock).mockResolvedValue({ type: 'track' });
        (addPipelinesSchemaToYamlConfig as jest.Mock).mockResolvedValue(undefined);
        (activateYamlExtension as jest.Mock).mockResolvedValue(undefined);
        mockHrtime.mockReturnValue([1, 500000000]); // 1.5 seconds
        (window.state as any) = { focused: true };
        (env as any).remoteName = 'origin';
        (env as any).uriScheme = 'vscode';
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('activate', () => {
        it('should activate extension successfully', async () => {
            await activate(mockContext as ExtensionContext);

            expect(registerErrorReporting).toHaveBeenCalled();
            expect(extensions.getExtension).toHaveBeenCalledWith(ExtensionId);
            expect(registerResources).toHaveBeenCalledWith(mockContext);
            expect(Configuration.configure).toHaveBeenCalledWith(mockContext);
            expect(Logger.configure).toHaveBeenCalledWith(mockContext);
            expect(mockContext.globalState!.update).toHaveBeenCalledWith('rulingPid', pid);
            expect(Container.initialize).toHaveBeenCalledWith(mockContext, '1.0.0');
        });

        it('should set command context for BBY environment when ROVODEV_BBY is set', async () => {
            process.env.ROVODEV_BBY = 'true';

            await activate(mockContext as ExtensionContext);

            expect(setCommandContext).toHaveBeenCalledWith(CommandContext.BbyEnvironmentActive, true);
        });

        it('should set command context for Rovo Dev when ROVODEV_ENABLED is set', async () => {
            process.env.ROVODEV_ENABLED = 'true';

            await activate(mockContext as ExtensionContext);

            expect(setCommandContext).toHaveBeenCalledWith(CommandContext.RovoDevEnabled, true);
        });

        it('should register commands and activate features when not in BBY environment', async () => {
            mockSiteManager.productHasAtLeastOneSite.mockReturnValue(true);

            await activate(mockContext as ExtensionContext);

            expect(registerRovoDevCommands).toHaveBeenCalledWith(mockContext);
            expect(registerCommands).toHaveBeenCalledWith(mockContext);
            expect(activateCodebucket).toHaveBeenCalledWith(mockContext);
            expect(setCommandContext).toHaveBeenCalledWith(CommandContext.IsJiraAuthenticated, true);
            expect(setCommandContext).toHaveBeenCalledWith(CommandContext.IsBBAuthenticated, true);
            expect(mockNotificationManager.listen).toHaveBeenCalled();
        });

        it('should not register main commands when in BBY environment', async () => {
            process.env.ROVODEV_BBY = 'true';

            await activate(mockContext as ExtensionContext);

            expect(registerCommands).not.toHaveBeenCalled();
            expect(activateCodebucket).not.toHaveBeenCalled();
            expect(mockNotificationManager.listen).not.toHaveBeenCalled();
        });

        it('should handle Container initialization error gracefully', async () => {
            const error = new Error('Container initialization failed');
            (Container.initialize as jest.Mock).mockRejectedValue(error);

            await activate(mockContext as ExtensionContext);

            expect(Logger.error).toHaveBeenCalledWith(error, 'Error initializing atlascode!');
        });

        it('should start listening for site requests', async () => {
            const mockCallback = jest.fn();
            (startListening as jest.Mock).mockImplementation((callback) => {
                mockCallback.mockImplementation(callback);
            });

            await activate(mockContext as ExtensionContext);

            expect(startListening).toHaveBeenCalled();
        });

        it('should show onboarding flow for new users with experiment enabled', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue(undefined); // New user
            (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            await activate(mockContext as ExtensionContext);

            expect(commands.executeCommand).toHaveBeenCalledWith(Commands.ShowOnboardingFlow);
        });

        it('should show onboarding page for new users with experiment disabled', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue(undefined); // New user
            (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(false);

            await activate(mockContext as ExtensionContext);

            expect(commands.executeCommand).toHaveBeenCalledWith(Commands.ShowOnboardingPage);
        });

        it('should show welcome page for existing users with version upgrade', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue('0.9.0'); // Previous version
            (semver_gt as jest.Mock).mockReturnValue(true);
            (Container.config as any) = { showWelcomeOnInstall: true };

            await activate(mockContext as ExtensionContext);

            expect(window.showInformationMessage).toHaveBeenCalledWith(
                'Jira and Bitbucket (Official) has been updated to v1.0.0',
                'Release notes',
            );
        });

        it('should not show welcome page when showWelcomeOnInstall is false', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue('0.9.0');
            (semver_gt as jest.Mock).mockReturnValue(true);
            (Container.config as any) = { showWelcomeOnInstall: false };

            await activate(mockContext as ExtensionContext);

            expect(window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should not show welcome page when window is not focused', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue('0.9.0');
            (semver_gt as jest.Mock).mockReturnValue(true);
            (Container.config as any) = { showWelcomeOnInstall: true };
            (window.state as any).focused = false;

            await activate(mockContext as ExtensionContext);

            expect(window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should send analytics after delay', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue(undefined); // New user
            mockSiteManager.numberOfAuthedSites.mockReturnValue(2);

            await activate(mockContext as ExtensionContext);

            // Fast-forward timers
            jest.runAllTimers();

            expect(installedEvent).toHaveBeenCalledWith('1.0.0');
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should send upgrade analytics for existing users', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue('0.9.0');
            (semver_gt as jest.Mock).mockReturnValue(true);
            mockSiteManager.numberOfAuthedSites.mockReturnValue(1);

            await activate(mockContext as ExtensionContext);

            jest.runAllTimers();

            expect(upgradedEvent).toHaveBeenCalledWith('1.0.0', '0.9.0');
            expect(launchedEvent).toHaveBeenCalledWith('origin', 'vscode', 1, 1, 1, 1);
        });

        it('should register code lens provider when not in BBY environment', async () => {
            await activate(mockContext as ExtensionContext);

            expect(languages.registerCodeLensProvider).toHaveBeenCalledWith({ scheme: 'file' }, { provideCodeLenses });
        });

        it('should not register code lens provider when in BBY environment', async () => {
            process.env.ROVODEV_BBY = 'true';

            await activate(mockContext as ExtensionContext);

            expect(languages.registerCodeLensProvider).not.toHaveBeenCalled();
        });

        it('should activate YAML features when not in BBY environment', async () => {
            await activate(mockContext as ExtensionContext);

            expect(languages.registerCompletionItemProvider).toHaveBeenCalledWith(
                { scheme: 'file', language: 'yaml', pattern: `**/*${BB_PIPELINES_FILENAME}` },
                expect.any(PipelinesYamlCompletionProvider),
            );
            expect(addPipelinesSchemaToYamlConfig).toHaveBeenCalled();
            expect(activateYamlExtension).toHaveBeenCalled();
        });

        it('should initialize Rovo Dev when ROVODEV_ENABLED is set', async () => {
            process.env.ROVODEV_ENABLED = 'true';

            await activate(mockContext as ExtensionContext);

            expect(initializeRovoDevProcessManager).toHaveBeenCalledWith(mockContext);
        });

        it('should open Rovo Dev view when in BBY environment with Rovo Dev enabled', async () => {
            process.env.ROVODEV_ENABLED = 'true';
            process.env.ROVODEV_BBY = 'true';

            await activate(mockContext as ExtensionContext);

            expect(commands.executeCommand).toHaveBeenCalledWith('workbench.view.extension.atlascode-rovo-dev');
        });

        it('should log activation time', async () => {
            await activate(mockContext as ExtensionContext);

            expect(Logger.info).toHaveBeenCalledWith('Atlassian for VS Code (v1.0.0) activated in 1500 ms');
        });

        it('should activate error reporting when feature flag is enabled', async () => {
            (FeatureFlagClient.checkGate as jest.Mock).mockReturnValue(true);

            await activate(mockContext as ExtensionContext);

            expect(registerAnalyticsClient).toHaveBeenCalledWith(mockAnalyticsClient);
        });

        it('should unregister error reporting when feature flag is disabled', async () => {
            (FeatureFlagClient.checkGate as jest.Mock).mockReturnValue(false);

            await activate(mockContext as ExtensionContext);

            expect(unregisterErrorReporting).toHaveBeenCalled();
        });

        it('should handle git extension activation failure gracefully', async () => {
            const gitExtension = {
                activate: jest.fn().mockRejectedValue(new Error('Git activation failed')),
            };
            (extensions.getExtension as jest.Mock).mockImplementation((id) => {
                if (id === 'vscode.git') {
                    return gitExtension;
                }
                return mockExtension;
            });

            await activate(mockContext as ExtensionContext);

            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Error activating vscode.git extension');
            expect(window.showWarningMessage).toHaveBeenCalledWith(
                'Activating Bitbucket features failed. There was an issue activating vscode.git extension.',
            );
        });

        it('should handle missing git extension gracefully', async () => {
            (extensions.getExtension as jest.Mock).mockImplementation((id) => {
                if (id === 'vscode.git') {
                    return undefined;
                }
                return mockExtension;
            });

            await activate(mockContext as ExtensionContext);

            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Error activating vscode.git extension');
        });
    });

    describe('deactivate', () => {
        it('should deactivate extension successfully', () => {
            deactivate();

            expect(unregisterErrorReporting).toHaveBeenCalled();
            expect(FeatureFlagClient.dispose).toHaveBeenCalled();
            expect(mockNotificationManager.stopListening).toHaveBeenCalled();
        });

        it('should deactivate Rovo Dev when ROVODEV_ENABLED is set', () => {
            process.env.ROVODEV_ENABLED = 'true';

            deactivate();

            expect(deactivateRovoDevProcessManager).toHaveBeenCalled();
        });

        it('should not deactivate Rovo Dev when ROVODEV_ENABLED is not set', () => {
            deactivate();

            expect(deactivateRovoDevProcessManager).not.toHaveBeenCalled();
        });
    });

    describe('analytics timing', () => {
        it('should use random delay for analytics', async () => {
            const originalMathRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0.5);

            await activate(mockContext as ExtensionContext);

            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2500); // 0.5 * 5000

            Math.random = originalMathRandom;
        });
    });

    describe('welcome page interaction', () => {
        it('should open changelog when user clicks Release notes', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue('0.9.0');
            (semver_gt as jest.Mock).mockReturnValue(true);
            (Container.config as any) = { showWelcomeOnInstall: true };

            const mockShowInformationMessage = window.showInformationMessage as jest.Mock;
            mockShowInformationMessage.mockResolvedValue('Release notes');

            await activate(mockContext as ExtensionContext);

            // Wait for the promise chain to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(commands.executeCommand).toHaveBeenCalledWith('extension.open', ExtensionId, 'changelog');
        });

        it('should not open changelog when user dismisses welcome message', async () => {
            mockContext.globalState!.get = jest.fn().mockReturnValue('0.9.0');
            (semver_gt as jest.Mock).mockReturnValue(true);
            (Container.config as any) = { showWelcomeOnInstall: true };

            const mockShowInformationMessage = window.showInformationMessage as jest.Mock;
            mockShowInformationMessage.mockResolvedValue(undefined);

            await activate(mockContext as ExtensionContext);

            // Wait for the promise chain to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(commands.executeCommand).not.toHaveBeenCalledWith('extension.open', ExtensionId, 'changelog');
        });
    });
});
