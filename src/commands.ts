import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { commands, env, ExtensionContext, TextEditor, Uri, window } from 'vscode';

import {
    cloneRepositoryButtonEvent,
    openWorkbenchRepositoryButtonEvent,
    openWorkbenchWorkspaceButtonEvent,
    Registry,
    viewScreenEvent,
} from './analytics';
import { DetailedSiteInfo, ProductBitbucket, ProductJira } from './atlclients/authInfo';
import { showBitbucketDebugInfo } from './bitbucket/bbDebug';
import { rerunPipeline } from './commands/bitbucket/rerunPipeline';
import { runPipeline } from './commands/bitbucket/runPipeline';
import { assignIssue } from './commands/jira/assignIssue';
import { createIssue } from './commands/jira/createIssue';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey, showIssueForURL } from './commands/jira/showIssue';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { configuration } from './config/configuration';
import { Commands, HelpTreeViewId } from './constants';
import { Container } from './container';
import { transitionIssue } from './jira/transitionIssue';
import { knownLinkIdMap } from './lib/ipc/models/common';
import { ConfigSection, ConfigSubSection } from './lib/ipc/models/config';
import { Logger } from './logger';
import { RovoDevProcessManager } from './rovo-dev/rovoDevProcessManager';
import { RovoDevContext } from './rovo-dev/rovoDevTypes';
import { AbstractBaseNode } from './views/nodes/abstractBaseNode';
import { IssueNode } from './views/nodes/issueNode';
import { PipelineNode } from './views/pipelines/PipelinesTree';

export function registerCommands(vscodeContext: ExtensionContext) {
    vscodeContext.subscriptions.push(
        commands.registerCommand(Commands.AddJiraSite, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Auth,
            }),
        ),
        commands.registerCommand(Commands.CreateNewJql, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Issues,
            }),
        ),
        commands.registerCommand(Commands.ShowConfigPage, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Auth,
            }),
        ),
        commands.registerCommand(Commands.ShowConfigPageFromExtensionContext, () => {
            Container.analyticsApi.fireOpenSettingsButtonEvent('extensionContext');
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Auth,
            });
        }),
        commands.registerCommand(Commands.ShowJiraAuth, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Auth,
            }),
        ),
        commands.registerCommand(Commands.ShowBitbucketAuth, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Bitbucket,
                subSection: ConfigSubSection.Auth,
            }),
        ),
        commands.registerCommand(Commands.ShowJiraIssueSettings, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Issues,
            }),
        ),
        commands.registerCommand(Commands.ShowPullRequestSettings, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Bitbucket,
                subSection: ConfigSubSection.PR,
            }),
        ),
        commands.registerCommand(Commands.ShowPipelineSettings, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Bitbucket,
                subSection: ConfigSubSection.Pipelines,
            }),
        ),
        commands.registerCommand(Commands.ShowExploreSettings, () => {
            Container.analyticsApi.fireExploreFeaturesButtonEvent(HelpTreeViewId);
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Explore,
                subSection: undefined,
            });
        }),
        commands.registerCommand(
            Commands.ViewInWebBrowser,
            async (prNode: AbstractBaseNode, source?: string, linkId?: string) => {
                if (source && linkId && knownLinkIdMap.has(linkId)) {
                    Container.analyticsApi.fireExternalLinkEvent(source, linkId);
                }
                const uri = (await prNode.getTreeItem()).resourceUri;
                if (uri) {
                    env.openExternal(uri);
                }
            },
        ),
        commands.registerCommand(Commands.CreateIssue, (data: any, source?: string) => createIssue(data, source)),
        commands.registerCommand(
            Commands.ShowIssue,
            async (issueOrKeyAndSite: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => await showIssue(issueOrKeyAndSite),
        ),
        commands.registerCommand(
            Commands.ShowIssueForKey,
            async (issueKey?: string) => await showIssueForKey(issueKey),
        ),
        commands.registerCommand(
            Commands.ShowIssueForSiteIdAndKey,
            async (siteId: string, issueKey: string) => await showIssueForSiteIdAndKey(siteId, issueKey),
        ),
        commands.registerCommand(Commands.ShowIssueForURL, async (issueURL: string) => await showIssueForURL(issueURL)),
        commands.registerCommand(Commands.ToDoIssue, (issueNode) =>
            commands.executeCommand(Commands.ShowIssue, issueNode.issue),
        ),
        commands.registerCommand(Commands.InProgressIssue, (issueNode) =>
            commands.executeCommand(Commands.ShowIssue, issueNode.issue),
        ),
        commands.registerCommand(Commands.DoneIssue, (issueNode) =>
            commands.executeCommand(Commands.ShowIssue, issueNode.issue),
        ),
        commands.registerCommand(Commands.AssignIssueToMe, (issueNode: IssueNode) => assignIssue(issueNode)),
        commands.registerCommand(Commands.TransitionIssue, async (issueNode: IssueNode) => {
            if (!isMinimalIssue(issueNode.issue)) {
                // Should be unreachable, but let's fail gracefully
                return;
            }

            const issue = issueNode.issue as MinimalIssue<DetailedSiteInfo>;
            Container.analyticsApi.fireViewScreenEvent('atlascodeTransitionQuickPick', issue.siteDetails, ProductJira);
            window
                .showQuickPick(
                    issue.transitions.map((x) => ({
                        label: x.name,
                        detail: x.name !== x.to.name ? `${x.to.name}` : '',
                    })),
                    {
                        placeHolder: `Select a transition for ${issue.key}`,
                    },
                )
                .then(async (transition) => {
                    if (!transition) {
                        return;
                    }

                    const target = issue.transitions.find((x) => x.name === transition.label);
                    if (!target) {
                        window.showErrorMessage(`Transition ${transition.label} not found`);
                        Logger.error(new Error('Transition not found'));
                        return;
                    }

                    await transitionIssue(issue, target, { source: 'quickPick' });
                });
        }),
        commands.registerCommand(
            Commands.StartWorkOnIssue,
            (issueNodeOrMinimalIssue: IssueNode | MinimalIssue<DetailedSiteInfo>) =>
                startWorkOnIssue(
                    isMinimalIssue(issueNodeOrMinimalIssue) ? issueNodeOrMinimalIssue : issueNodeOrMinimalIssue.issue,
                ),
        ),
        commands.registerCommand(Commands.ViewDiff, async (...diffArgs: [() => {}, Uri, Uri, string]) => {
            viewScreenEvent(Registry.screen.pullRequestDiffScreen, undefined, ProductBitbucket).then((e) => {
                Container.analyticsClient.sendScreenEvent(e);
            });
            diffArgs[0]();
            commands.executeCommand('vscode.diff', ...diffArgs.slice(1));
        }),
        commands.registerCommand(Commands.RerunPipeline, (node: PipelineNode) => {
            rerunPipeline(node.pipeline);
        }),
        commands.registerCommand(Commands.RunPipelineForBranch, () => {
            runPipeline();
        }),
        commands.registerCommand(Commands.ShowPipeline, (pipelineInfo: any) => {
            Container.pipelinesSummaryWebview.createOrShow(pipelineInfo.uuid, pipelineInfo);
        }),
        commands.registerCommand(Commands.DebugBitbucketSites, showBitbucketDebugInfo),
        commands.registerCommand(Commands.WorkbenchOpenRepository, (source: string) => {
            openWorkbenchRepositoryButtonEvent(source).then((event) => Container.analyticsClient.sendUIEvent(event));
            commands.executeCommand('workbench.action.addRootFolder');
        }),
        commands.registerCommand(Commands.WorkbenchOpenWorkspace, (source: string) => {
            openWorkbenchWorkspaceButtonEvent(source).then((event) => Container.analyticsClient.sendUIEvent(event));
            commands.executeCommand('workbench.action.openWorkspace');
        }),
        commands.registerCommand(Commands.CloneRepository, async (source: string, repoUrl?: string) => {
            cloneRepositoryButtonEvent(source).then((event) => Container.analyticsClient.sendUIEvent(event));
            await commands.executeCommand('git.clone', repoUrl);
        }),
        commands.registerCommand(Commands.DisableHelpExplorer, () => {
            configuration.updateEffective('helpExplorerEnabled', false, null, true);
        }),
        commands.registerCommand(Commands.BitbucketOpenPullRequest, (data: { pullRequestUrl: string }) => {
            Container.openPullRequestHandler(data.pullRequestUrl);
        }),
        commands.registerCommand(Commands.ShowOnboardingFlow, () => Container.onboardingProvider.start()),
    );
}

const buildContext = (editor?: TextEditor, vscodeContext?: ExtensionContext): RovoDevContext | undefined => {
    if (!editor || !vscodeContext) {
        return undefined;
    }

    const document = editor.document;
    const workspaceFolder =
        vscodeContext.workspaceState.get('workspaceFolder') || (vscodeContext as any).workspaceFolder || undefined;
    const baseName = document.fileName.split(require('path').sep).pop() || '';
    const fileInfo = {
        name: baseName,
        absolutePath: document.uri.fsPath,
        relativePath: workspaceFolder
            ? require('path').relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
            : document.fileName,
    };
    const selections = editor.selections && editor.selections.length > 0 ? editor.selections : [editor.selection];
    return {
        contextItems: selections.map((selection) => ({
            file: fileInfo,
            selection: selection ? { start: selection.start.line, end: selection.end.line } : undefined,
            enabled: true,
        })),
    };
};

export function registerRovoDevCommands(vscodeContext: ExtensionContext) {
    vscodeContext.subscriptions.push(
        commands.registerCommand(Commands.RovodevAskInteractive, async () => {
            const context = buildContext(window.activeTextEditor, vscodeContext);

            const prompt = await window.showInputBox({
                placeHolder: 'Type your RovoDev command',
                prompt: 'Send a command to RovoDev for the selected code',
            });

            if (!prompt?.trim()) {
                return;
            }
            Container.rovodevWebviewProvider.invokeRovoDevAskCommand(prompt, context);
        }),
    );
    vscodeContext.subscriptions.push(
        commands.registerCommand(Commands.RovodevAsk, (prompt: string, context?: RovoDevContext) => {
            Container.rovodevWebviewProvider.invokeRovoDevAskCommand(prompt, context);
        }),
        commands.registerCommand(Commands.RovodevNewSession, () => {
            Container.rovodevWebviewProvider.executeReset();
        }),
        commands.registerCommand(Commands.RovodevShowTerminal, () => RovoDevProcessManager.showTerminal()),
    );
    vscodeContext.subscriptions.push(
        commands.registerCommand(Commands.RovodevAddToContext, async () => {
            const context = buildContext(window.activeTextEditor, vscodeContext);
            if (!context || !context.contextItems || context.contextItems.length === 0) {
                // Do nothing, this should only have effect in editor context
                return;
            }
            commands.executeCommand('atlascode.views.rovoDev.webView.focus');
            context.contextItems.forEach((item) => {
                Container.rovodevWebviewProvider.addToContext(item);
            });
        }),
    );
}
