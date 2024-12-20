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
import { BitbucketIssue } from './bitbucket/model';
import { rerunPipeline } from './commands/bitbucket/rerunPipeline';
import { runPipeline } from './commands/bitbucket/runPipeline';
import { assignIssue } from './commands/jira/assignIssue';
import { createIssue } from './commands/jira/createIssue';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey } from './commands/jira/showIssue';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { configuration } from './config/configuration';
import { HelpTreeViewId } from './constants';
import { Container } from './container';
import { knownLinkIdMap } from './lib/ipc/models/common';
import { ConfigSection, ConfigSubSection } from './lib/ipc/models/config';
import { AbstractBaseNode } from './views/nodes/abstractBaseNode';
import { IssueNode } from './views/nodes/issueNode';
import { PipelineNode } from './views/pipelines/PipelinesTree';

export enum Commands {
    BitbucketSelectContainer = 'atlascode.bb.selectContainer',
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketToggleFileNesting = 'atlascode.bb.toggleFileNesting',
    BitbucketShowOpenPullRequests = 'atlascode.bb.showOpenPullRequests',
    BitbucketShowPullRequestsToReview = 'atlascode.bb.showPullRequestsToReview',
    BitbucketShowPullRequestsCreatedByMe = 'atlascode.bb.showOpenPullRequestsCreatedByMe',
    BitbucketShowMergedPullRequests = 'atlascode.bb.showMergedPullRequests',
    BitbucketShowDeclinedPullRequests = 'atlascode.bb.showDeclinedPullRequests',
    BitbucketPullRequestFilters = 'atlascode.bb.showPullRequestFilters',
    JiraSearchIssues = 'atlascode.jira.searchIssues',
    BitbucketShowPullRequestDetails = 'atlascode.bb.showPullRequestDetails',
    BitbucketPullRequestsNextPage = 'atlascode.bb.pullReqeustsNextPage',
    RefreshPullRequestExplorerNode = 'atlascode.bb.refreshPullRequest',
    ViewInWebBrowser = 'atlascode.viewInWebBrowser',
    BitbucketAddComment = 'atlascode.bb.addComment',
    BitbucketAddReply = 'atlascode.bb.addReply',
    BitbucketDeleteComment = 'atlascode.bb.deleteComment',
    BitbucketEditComment = 'atlascode.bb.editComment',
    BitbucketDeleteTask = 'atlascode.bb.deleteTask',
    BitbucketAddTask = 'atlascode.bb.addTask',
    BitbucketEditTask = 'atlascode.bb.editTask',
    BitbucketMarkTaskComplete = 'atlascode.bb.markTaskComplete',
    BitbucketMarkTaskIncomplete = 'atlascode.bb.markTaskIncomplete',
    BitbucketToggleCommentsVisibility = 'atlascode.bb.toggleCommentsVisibility',
    EditThisFile = 'atlascode.bb.editThisFile',
    CreateIssue = 'atlascode.jira.createIssue',
    RefreshJiraExplorer = 'atlascode.jira.refreshExplorer',
    ShowJiraIssueSettings = 'atlascode.jira.showJiraIssueSettings',
    ShowPullRequestSettings = 'atlascode.bb.showPullRequestSettings',
    ShowPipelineSettings = 'atlascode.bb.showPipelineSettings',
    ShowBitbucketIssueSettings = 'atlascode.bb.showBitbucketIssueSettings',
    ShowExploreSettings = 'atlascode.showExploreSettings',
    ShowIssue = 'atlascode.jira.showIssue',
    ShowIssueForKey = 'atlascode.jira.showIssueForKey',
    ShowIssueForSiteIdAndKey = 'atlascode.jira.showIssueForSiteIdAndKey',
    ShowConfigPage = 'atlascode.showConfigPage',
    ShowConfigPageFromExtensionContext = 'atlascode.extensionContext.showConfigPage',
    ShowJiraAuth = 'atlascode.showJiraAuth',
    ShowBitbucketAuth = 'atlascode.showBitbucketAuth',
    ShowWelcomePage = 'atlascode.showWelcomePage',
    ShowOnboardingPage = 'atlascode.showOnboardingPage',
    TestLogin = 'atlascode.testLogin',
    TestLogout = 'atlascode.testLogout',
    ShowPullRequestDetailsPage = 'atlascode.showPullRequestDetailsPage',
    AssignIssueToMe = 'atlascode.jira.assignIssueToMe',
    StartWorkOnIssue = 'atlascode.jira.startWorkOnIssue',
    CreatePullRequest = 'atlascode.bb.createPullRequest',
    RerunPipeline = 'atlascode.bb.rerunPipeline',
    RunPipelineForBranch = 'atlascode.bb.runPipelineForBranch',
    RefreshPipelines = 'atlascode.bb.refreshPipelines',
    ShowPipeline = 'atlascode.bb.showPipeline',
    PipelinesNextPage = 'atlascode.bb.pipelinesNextPage',
    BitbucketIssuesNextPage = 'atlascode.bb.issuesNextPage',
    BitbucketIssuesRefresh = 'atlascode.bb.refreshIssues',
    CreateBitbucketIssue = 'atlascode.bb.createIssue',
    ShowBitbucketIssue = 'atlascode.bb.showIssue',
    StartWorkOnBitbucketIssue = 'atlascode.bb.startWorkOnIssue',
    BBPRCancelAction = 'atlascode.bb.cancelCommentAction',
    BBPRSaveAction = 'atlascode.bb.saveCommentAction',
    ViewDiff = 'atlascode.viewDiff',
    DebugBitbucketSites = 'atlascode.debug.bitbucketSites',
    WorkbenchOpenRepository = 'atlascode.workbenchOpenRepository',
    WorkbenchOpenWorkspace = 'atlascode.workbenchOpenWorkspace',
    CloneRepository = 'atlascode.cloneRepository',
    DisableHelpExplorer = 'atlascode.disableHelpExplorer',
}

export function registerCommands(vscodeContext: ExtensionContext) {
    vscodeContext.subscriptions.push(
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
        commands.registerCommand(Commands.ShowBitbucketIssueSettings, () =>
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Bitbucket,
                subSection: ConfigSubSection.Issues,
            }),
        ),
        commands.registerCommand(Commands.ShowExploreSettings, () => {
            Container.analyticsApi.fireExploreFeaturesButtonEvent(HelpTreeViewId);
            Container.settingsWebviewFactory.createOrShow({
                section: ConfigSection.Explore,
                subSection: undefined,
            });
        }),
        commands.registerCommand(Commands.ShowWelcomePage, () => Container.welcomeWebviewFactory.createOrShow()),
        commands.registerCommand(Commands.ShowOnboardingPage, () => Container.onboardingWebviewFactory.createOrShow()),
        commands.registerCommand(Commands.TestLogin, () => Container.testLogin()),
        commands.registerCommand(Commands.TestLogout, () => Container.testLogout()),
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
        commands.registerCommand(Commands.AssignIssueToMe, (issueNode: IssueNode) => assignIssue(issueNode)),
        commands.registerCommand(
            Commands.StartWorkOnIssue,
            (issueNodeOrMinimalIssue: IssueNode | MinimalIssue<DetailedSiteInfo>) =>
                startWorkOnIssue(
                    isMinimalIssue(issueNodeOrMinimalIssue) ? issueNodeOrMinimalIssue : issueNodeOrMinimalIssue.issue,
                ),
        ),
        commands.registerCommand(Commands.StartWorkOnBitbucketIssue, (issue: BitbucketIssue) =>
            Container.startWorkOnBitbucketIssueWebview.createOrShowIssue(issue),
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
        commands.registerCommand(Commands.ShowBitbucketIssue, (issue: BitbucketIssue) =>
            Container.bitbucketIssueWebviewFactory.createOrShow(issue.data.links?.self?.href, issue),
        ),
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
    );
}
