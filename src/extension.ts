import { ChildProcess, spawn } from 'child_process';
import { pid } from 'process';
import * as semver from 'semver';
import { commands, env, ExtensionContext, extensions, languages, Memento, window, workspace } from 'vscode';

import { installedEvent, launchedEvent, upgradedEvent } from './analytics';
import { DetailedSiteInfo, ProductBitbucket, ProductJira } from './atlclients/authInfo';
import { startListening } from './atlclients/negotiate';
import { BitbucketContext } from './bitbucket/bbContext';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { CommandContext, setCommandContext } from './commandContext';
import { registerCommands } from './commands';
import { Configuration, configuration, IConfig } from './config/configuration';
import { Commands, ExtensionId, GlobalStateVersionKey } from './constants';
import { Container } from './container';
import { registerAnalyticsClient, registerErrorReporting, unregisterErrorReporting } from './errorReporting';
import { provideCodeLenses } from './jira/todoObserver';
import { Logger } from './logger';
import { PipelinesYamlCompletionProvider } from './pipelines/yaml/pipelinesYamlCompletionProvider';
import {
    activateYamlExtension,
    addPipelinesSchemaToYamlConfig,
    BB_PIPELINES_FILENAME,
} from './pipelines/yaml/pipelinesYamlHelper';
import { registerResources } from './resources';
import { GitExtension } from './typings/git';
import { Experiments, FeatureFlagClient, Features } from './util/featureFlags';
import { NotificationManagerImpl } from './views/notifications/notificationManager';

const AnalyticDelay = 5000;

// Port mapping state key
const PORT_MAPPING_KEY = 'workspacePortMapping';
const PORT_RANGE_START = 40000;
const PORT_RANGE_END = 41000;

// Helper to get a unique port for a workspace
function getOrAssignPortForWorkspace(context: ExtensionContext, workspacePath: string): number {
    const mapping = context.globalState.get<{ [key: string]: number }>(PORT_MAPPING_KEY) || {};
    if (mapping[workspacePath]) {
        return mapping[workspacePath];
    }
    // Find an unused port
    const usedPorts = new Set(Object.values(mapping));
    let port = PORT_RANGE_START;
    while (usedPorts.has(port) && port <= PORT_RANGE_END) {
        port++;
    }
    mapping[workspacePath] = port;
    context.globalState.update(PORT_MAPPING_KEY, mapping);
    return port;
}

// In-memory process map (not persisted, but safe for per-window usage)
const workspaceProcessMap: { [workspacePath: string]: ChildProcess } = {};

// Helper to stop a process by terminal name
function stopWorkspaceProcess(workspacePath: string) {
    const proc = workspaceProcessMap[workspacePath];
    if (proc) {
        proc.kill();
        delete workspaceProcessMap[workspacePath];
    }
}

// Helper to start the background process
function startWorkspaceProcess(context: ExtensionContext, workspacePath: string, port: number) {
    stopWorkspaceProcess(workspacePath);
    const rovoDevPath = workspace.getConfiguration('atlascode.rovodev').get<string>('executablePath') || undefined;
    const userEmail = workspace.getConfiguration('atlascode.rovodev').get<string>('email') || undefined;
    const authToken = workspace.getConfiguration('atlascode.rovodev').get<string>('apiKey') || undefined;
    if (!rovoDevPath || !userEmail || !authToken) {
        window.showErrorMessage('Environment variables is not set for Rovo Dev. Cannot start the process.');
        return;
    }
    // Use 'yes' as a dummy process, replace with your real service as needed
    const proc = spawn(rovoDevPath, [`serve`, `${port}`], {
        cwd: workspacePath,
        stdio: 'ignore', // Don't clutter output
        detached: true,
        env: {
            // pass vars one  by one
            USER_EMAIL: userEmail,
            USER_API_TOKEN: authToken,
        },
    });
    proc.on('exit', (code, signal) => {
        window.showErrorMessage(
            `Process for workspace ${workspacePath} exited unexpectedly with code ${code} and signal ${signal}`,
        );
        delete workspaceProcessMap[workspacePath];
    });
    workspaceProcessMap[workspacePath] = proc;
}

function showWorkspaceLoadedMessageAndStartProcess(context: ExtensionContext) {
    const folders = workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        for (const folder of folders) {
            const port = getOrAssignPortForWorkspace(context, folder.uri.fsPath);
            window.showInformationMessage(`Workspace loaded: ${folder.name} (port ${port})`);
            startWorkspaceProcess(context, folder.uri.fsPath, port);
        }
    } else {
        window.showInformationMessage('No workspace folders loaded.');
    }
}

function showWorkspaceClosedMessageAndStopProcess(
    context: ExtensionContext,
    removedFolders: readonly { uri: { fsPath: string }; name: string }[],
) {
    for (const folder of removedFolders) {
        stopWorkspaceProcess(folder.uri.fsPath);
        window.showInformationMessage(`Workspace closed: ${folder.name}`);
    }
}

function showWorkspaceClosedMessage() {
    window.showInformationMessage('Workspace closed or extension deactivated.');
}

export async function activate(context: ExtensionContext) {
    const start = process.hrtime();

    registerErrorReporting();

    const atlascode = extensions.getExtension(ExtensionId)!;
    const atlascodeVersion = atlascode.packageJSON.version;
    const previousVersion = context.globalState.get<string>(GlobalStateVersionKey);

    registerResources(context);

    Configuration.configure(context);
    Logger.configure(context);

    // Mark ourselves as the PID in charge of refreshing credentials and start listening for pings.
    context.globalState.update('rulingPid', pid);

    try {
        await Container.initialize(context, configuration.get<IConfig>(), atlascodeVersion);

        activateErrorReporting();
        registerCommands(context);
        activateCodebucket(context);

        setCommandContext(
            CommandContext.IsJiraAuthenticated,
            Container.siteManager.productHasAtLeastOneSite(ProductJira),
        );
        setCommandContext(
            CommandContext.IsBBAuthenticated,
            Container.siteManager.productHasAtLeastOneSite(ProductBitbucket),
        );

        NotificationManagerImpl.getInstance().listen();
    } catch (e) {
        Logger.error(e, 'Error initializing atlascode!');
    }

    startListening((site: DetailedSiteInfo) => {
        Container.clientManager.requestSite(site);
    });

    // new user for auth exp
    if (previousVersion === undefined) {
        const expVal = FeatureFlagClient.checkExperimentValue(Experiments.AtlascodeOnboardingExperiment);
        if (expVal) {
            commands.executeCommand(Commands.ShowOnboardingFlow);
        } else {
            commands.executeCommand(Commands.ShowOnboardingPage);
        }
    } else {
        showWelcomePage(atlascodeVersion, previousVersion);
    }

    const delay = Math.floor(Math.random() * Math.floor(AnalyticDelay));
    setTimeout(() => {
        sendAnalytics(atlascodeVersion, context.globalState);
    }, delay);

    const duration = process.hrtime(start);
    context.subscriptions.push(languages.registerCodeLensProvider({ scheme: 'file' }, { provideCodeLenses }));

    // Following are async functions called without await so that they are run
    // in the background and do not slow down the time taken for the extension
    // icon to appear in the activity bar
    activateBitbucketFeatures();
    activateYamlFeatures(context);

    showWorkspaceLoadedMessageAndStartProcess(context);

    // Listen for workspace folder changes
    context.subscriptions.push(
        workspace.onDidChangeWorkspaceFolders((event) => {
            if (event.added.length > 0) {
                showWorkspaceLoadedMessageAndStartProcess(context);
            }
            if (event.removed.length > 0) {
                showWorkspaceClosedMessageAndStopProcess(context, event.removed);
            }
        }),
    );

    Logger.info(
        `Atlassian for VS Code (v${atlascodeVersion}) activated in ${
            duration[0] * 1000 + Math.floor(duration[1] / 1000000)
        } ms`,
    );
}

function activateErrorReporting(): void {
    if (FeatureFlagClient.checkGate(Features.EnableErrorTelemetry)) {
        registerAnalyticsClient(Container.analyticsClient);
    } else {
        unregisterErrorReporting();
    }
}

async function activateBitbucketFeatures() {
    let gitExt: GitExtension;
    try {
        const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
        if (!gitExtension) {
            throw new Error('vscode.git extension not found');
        }
        gitExt = await gitExtension.activate();
    } catch (e) {
        Logger.error(e, 'Error activating vscode.git extension');
        window.showWarningMessage(
            'Activating Bitbucket features failed. There was an issue activating vscode.git extension.',
        );
        return;
    }

    try {
        const gitApi = gitExt.getAPI(1);
        const bbContext = new BitbucketContext(gitApi);
        Container.initializeBitbucket(bbContext);
    } catch (e) {
        Logger.error(e, 'Activating Bitbucket features failed');
        window.showWarningMessage('Activating Bitbucket features failed');
    }
}

async function activateYamlFeatures(context: ExtensionContext) {
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'yaml', pattern: `**/*${BB_PIPELINES_FILENAME}` },
            new PipelinesYamlCompletionProvider(),
        ),
    );
    await addPipelinesSchemaToYamlConfig();
    await activateYamlExtension();
}

async function showWelcomePage(version: string, previousVersion: string | undefined) {
    if (
        (previousVersion === undefined || semver.gt(version, previousVersion)) &&
        Container.config.showWelcomeOnInstall &&
        window.state.focused
    ) {
        window
            .showInformationMessage(`Jira and Bitbucket (Official) has been updated to v${version}`, 'Release notes')
            .then((userChoice) => {
                if (userChoice === 'Release notes') {
                    commands.executeCommand('extension.open', ExtensionId, 'changelog');
                }
            });
    }
}

async function sendAnalytics(version: string, globalState: Memento) {
    const previousVersion = globalState.get<string>(GlobalStateVersionKey);
    globalState.update(GlobalStateVersionKey, version);

    if (previousVersion === undefined) {
        installedEvent(version).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
        return;
    }

    if (semver.gt(version, previousVersion)) {
        Logger.info(`Atlassian for VS Code upgraded from v${previousVersion} to v${version}`);
        upgradedEvent(version, previousVersion).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    }

    launchedEvent(
        env.remoteName ? env.remoteName : 'local',
        Container.siteManager.numberOfAuthedSites(ProductJira, true),
        Container.siteManager.numberOfAuthedSites(ProductJira, false),
        Container.siteManager.numberOfAuthedSites(ProductBitbucket, true),
        Container.siteManager.numberOfAuthedSites(ProductBitbucket, false),
    ).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    // On deactivate, stop all workspace processes
    if (workspace.workspaceFolders) {
        for (const folder of workspace.workspaceFolders) {
            stopWorkspaceProcess(folder.uri.fsPath);
        }
    }
    showWorkspaceClosedMessage();
    unregisterErrorReporting();
    FeatureFlagClient.dispose();
    NotificationManagerImpl.getInstance().stopListening();
}
