export const ExtensionId = 'atlassian.atlascode';
export const ConfigNamespace = 'atlascode';
export const extensionOutputChannelName = 'Atlassian';
export const JiraCreateSiteAndProjectKey = 'jira.lastCreateSiteAndProject';
export const JiraEnabledKey = 'jira.enabled';
export const BitbucketEnabledKey = 'bitbucket.enabled';
export const JiraHoverProviderConfigurationKey = 'jira.hover.enabled';
export const AssignedJiraItemsViewId = 'atlascode.views.jira.assignedWorkItemsTreeView';
export const PullRequestTreeViewId = 'atlascode.views.bb.pullrequestsTreeView';
export const PipelinesTreeViewId = 'atlascode.views.bb.pipelinesTreeView';
export const BitbucketIssuesTreeViewId = 'atlascode.views.bb.issuesTreeView';
export const HelpTreeViewId = 'atlascode.views.helpTreeView';
export const GlobalStateVersionKey = 'atlascodeVersion';
export const AxiosUserAgent = 'atlascode/2.x axios/0.19.2';

export const bbAPIConnectivityError = new Error('cannot connect to bitbucket api');

export const enum Commands {
    BitbucketSelectContainer = 'atlascode.bb.selectContainer',
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketToggleFileNesting = 'atlascode.bb.toggleFileNesting',
    BitbucketOpenPullRequest = 'atlascode.bb.openPullRequest',
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
    RefreshAssignedWorkItemsExplorer = 'atlascode.jira.refreshAssignedWorkItemsExplorer',
    RefreshCustomJqlExplorer = 'atlascode.jira.refreshCustomJqlExplorer',
    AddJiraSite = 'atlascode.jira.addJiraSite',
    ShowJiraIssueSettings = 'atlascode.jira.showJiraIssueSettings',
    ShowPullRequestSettings = 'atlascode.bb.showPullRequestSettings',
    ShowPipelineSettings = 'atlascode.bb.showPipelineSettings',
    ShowExploreSettings = 'atlascode.showExploreSettings',
    ShowIssue = 'atlascode.jira.showIssue',
    ShowIssueForKey = 'atlascode.jira.showIssueForKey',
    ShowIssueForSiteIdAndKey = 'atlascode.jira.showIssueForSiteIdAndKey',
    ShowIssueForURL = 'atlascode.jira.showIssueForURL',
    ShowConfigPage = 'atlascode.showConfigPage',
    ShowConfigPageFromExtensionContext = 'atlascode.extensionContext.showConfigPage',
    ShowJiraAuth = 'atlascode.showJiraAuth',
    ShowBitbucketAuth = 'atlascode.showBitbucketAuth',
    ShowOnboardingPage = 'atlascode.showOnboardingPage',
    ShowPullRequestDetailsPage = 'atlascode.showPullRequestDetailsPage',
    AssignIssueToMe = 'atlascode.jira.assignIssueToMe',
    TransitionIssue = 'atlascode.jira.transitionIssue',
    StartWorkOnIssue = 'atlascode.jira.startWorkOnIssue',
    CreatePullRequest = 'atlascode.bb.createPullRequest',
    RerunPipeline = 'atlascode.bb.rerunPipeline',
    RunPipelineForBranch = 'atlascode.bb.runPipelineForBranch',
    RefreshPipelines = 'atlascode.bb.refreshPipelines',
    ShowPipeline = 'atlascode.bb.showPipeline',
    PipelinesNextPage = 'atlascode.bb.pipelinesNextPage',
    BitbucketIssuesNextPage = 'atlascode.bb.issuesNextPage',
    BBPRCancelAction = 'atlascode.bb.cancelCommentAction',
    BBPRSaveAction = 'atlascode.bb.saveCommentAction',
    ViewDiff = 'atlascode.viewDiff',
    DebugBitbucketSites = 'atlascode.debug.bitbucketSites',
    WorkbenchOpenRepository = 'atlascode.workbenchOpenRepository',
    WorkbenchOpenWorkspace = 'atlascode.workbenchOpenWorkspace',
    CloneRepository = 'atlascode.cloneRepository',
    DisableHelpExplorer = 'atlascode.disableHelpExplorer',
    CreateNewJql = 'atlascode.jira.createNewJql',
    ToDoIssue = 'atlascode.jira.todoIssue',
    RovodevAsk = 'atlascode.rovodev.askRovoDev',
    RovodevAskInteractive = 'atlascode.rovodev.askInteractive',
    RovodevAddToContext = 'atlascode.rovodev.addToContext',
    RovodevNewSession = 'atlascode.rovodev.newChatSession',
    InProgressIssue = 'atlascode.jira.inProgressIssue',
    DoneIssue = 'atlascode.jira.doneIssue',
    ShowOnboardingFlow = 'atlascode.showOnboardingFlow',
    OpenRovoDevConfig = 'atlascode.openRovoDevConfig',
    OpenRovoDevMcpJson = 'atlascode.openRovoDevMcpJson',
}

// Rovodev port mapping settings
export const rovodevInfo = {
    mappingKey: 'workspacePortMapping',
    envVars: {
        port: 'ROVODEV_PORT',
        host: 'ROVODEV_HOST',
    },
    portRange: {
        start: 40000,
        end: 41000,
    },
};
