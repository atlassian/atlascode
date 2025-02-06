'use strict';

import * as semver from 'semver';
import { commands, env, ExtensionContext, extensions, languages, Memento, window, l10n } from 'vscode';
import { installedEvent, launchedEvent, upgradedEvent } from './analytics';
import { DetailedSiteInfo, ProductBitbucket, ProductJira } from './atlclients/authInfo';
import { BitbucketContext } from './bitbucket/bbContext';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { Commands, registerCommands } from './commands';
import { configuration, Configuration, IConfig } from './config/configuration';
import { GlobalStateVersionKey } from './constants';
import { CommandContext, setCommandContext } from './commandContext';
import { Container } from './container';
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
import { pid } from 'process';
import { startListening } from './atlclients/negotiate';

const AnalyticDelay = 5000;

export async function activate(context: ExtensionContext) {
    const start = process.hrtime();
    const atlascode = extensions.getExtension('atlassian.atlascode')!;
    const atlascodeVersion = atlascode.packageJSON.version;
    const previousVersion = context.globalState.get<string>(GlobalStateVersionKey);

    registerResources(context);

    Configuration.configure(context);
    Logger.configure(context);

    // Mark ourselves as the PID in charge of refreshing credentials and start listening for pings.
    context.globalState.update('rulingPid', pid);

    try {
        Container.initialize(context, configuration.get<IConfig>(), atlascodeVersion);

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
    } catch (e) {
        Logger.error(e, 'Error initializing atlascode!');
    }

    startListening((site: DetailedSiteInfo) => {
        Container.clientManager.requestSite(site);
    });

    if (previousVersion === undefined && window.state.focused) {
        commands.executeCommand(Commands.ShowOnboardingPage); //This is shown to users who have never opened our extension before
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

    Logger.info(
        `Atlassian for VS Code (v${atlascodeVersion}) activated in ${
            duration[0] * 1000 + Math.floor(duration[1] / 1000000)
        } ms`,
    );
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
            l10n.t('Activating Bitbucket features failed. There was an issue activating vscode.git extension.'),
        );
        return;
    }

    try {
        const gitApi = gitExt.getAPI(1);
        const bbContext = new BitbucketContext(gitApi);
        Container.initializeBitbucket(bbContext);
    } catch (e) {
        Logger.error(e, 'Activating Bitbucket features failed');
        window.showWarningMessage(l10n.t('Activating Bitbucket features failed'));
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
        const choice = l10n.t('Release notes');
        window
            .showInformationMessage(l10n.t('Jira and Bitbucket (Official) has been updated to v{0}', version), choice)
            .then((userChoice) => {
                if (userChoice === choice) {
                    commands.executeCommand(Commands.ShowWelcomePage);
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

    launchedEvent(env.remoteName ? env.remoteName : 'local').then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
