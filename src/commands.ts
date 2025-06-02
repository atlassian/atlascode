import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { commands, env, ExtensionContext, Uri } from 'vscode';

import {
    cloneRepositoryButtonEvent,
    openWorkbenchRepositoryButtonEvent,
    openWorkbenchWorkspaceButtonEvent,
    Registry,
    viewScreenEvent,
} from './analytics';
import { DetailedSiteInfo, ProductBitbucket } from './atlclients/authInfo';
import { showBitbucketDebugInfo } from './bitbucket/bbDebug';
import { rerunPipeline } from './commands/bitbucket/rerunPipeline';
import { runPipeline } from './commands/bitbucket/runPipeline';
import { assignIssue } from './commands/jira/assignIssue';
import { createIssue } from './commands/jira/createIssue';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey } from './commands/jira/showIssue';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { configuration } from './config/configuration';
import { Commands, HelpTreeViewId } from './constants';
import { Container } from './container';
import { knownLinkIdMap } from './lib/ipc/models/common';
import { ConfigSection, ConfigSubSection } from './lib/ipc/models/config';
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
        commands.registerCommand(Commands.ShowOnboardingPage, () => Container.onboardingWebviewFactory.createOrShow()),
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
