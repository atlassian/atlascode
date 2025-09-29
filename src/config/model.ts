export enum OutputLevel {
    Silent = 'silent',
    Errors = 'errors',
    Info = 'info',
    Debug = 'debug',
}

export enum IssueSuggestionContextLevel {
    TodoOnly = 'todoOnly',
    CodeContext = 'codeContext',
}

export type IssueSuggestionSettings = {
    isAvailable: boolean;
    isEnabled: boolean;
    level: IssueSuggestionContextLevel;
};

// Simplified representation of a TODO, used in IPC
export type SimplifiedTodoIssueData = {
    summary: string;
    context: string;
    position: {
        line: number;
        character: number;
    };
    uri: string;
};

export interface IConfig {
    issueSuggestionContextLevel: IssueSuggestionContextLevel;
    outputLevel: OutputLevel;
    enableCharles: boolean;
    charlesCertPath: string;
    charlesDebugOnly: boolean;
    showWelcomeOnInstall: boolean;
    jira: JiraConfig;
    bitbucket: BitbucketConfig;
    enableUIWS: boolean;
    enableCurlLogging: boolean;
    enableHttpsTunnel: boolean;
    helpExplorerEnabled: boolean;
    rovodev: RovoDevConfig;
}

export interface RovoDevConfig {
    showKeybinding: boolean;
    debugPanelEnabled: boolean;
}

export interface JiraConfig {
    enabled: boolean;
    lastCreateSiteAndProject: SiteIdAndProjectKey;
    explorer: JiraExplorer;
    issueMonitor: JiraIssueMonitor;
    statusbar: JiraStatusBar;
    hover: JiraHover;
    jqlList: JQLEntry[];
    todoIssues: TodoIssues;
    startWorkBranchTemplate: StartWorkBranchTemplate;
    showCreateIssueProblems: boolean;
}

export type SiteIdAndProjectKey = {
    siteId: string;
    projectKey: string;
};

export interface JiraStatusBar {
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showLogin: boolean;
    showActiveIssue: boolean;
}

export interface JiraIssueMonitor {
    refreshInterval: number;
}

export interface JiraExplorer {
    enabled: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
    nestSubtasks: boolean;
    fetchAllQueryResults: boolean;
}

export interface StartWorkBranchTemplate {
    customPrefixes: string[];
    customTemplate: string;
}

export interface JiraHover {
    enabled: boolean;
}

export interface TodoIssues {
    enabled: boolean;
    triggers: string[];
}

export interface JQLEntry {
    id: string;
    enabled: boolean;
    name: string;
    query: string;
    siteId: string;
    monitor: boolean;
    filterId?: string;
}

export interface BitbucketConfig {
    enabled: boolean;
    explorer: BitbucketExplorer;
    statusbar: BitbucketStatusBar;
    contextMenus: BitbucketContextMenus;
    pipelines: BitbucketPipelinesConfig;
    issues: BitbucketIssuesConfig;
    preferredRemotes: string[];
    showTerminalLinkPanel: boolean;
}

export interface BitbucketPipelinesConfig {
    explorerEnabled: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
    hideEmpty: boolean;
    hideFiltered: boolean;
    branchFilters: string[];
}

export interface BitbucketIssuesConfig {
    explorerEnabled: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
    createJiraEnabled: boolean;
}

export interface BitbucketExplorer {
    enabled: boolean;
    nestFilesEnabled: boolean;
    refreshInterval: number;
    relatedJiraIssues: BitbucketRelatedJiraIssues;
    notifications: BitbucketNotifications;
}

export interface BitbucketRelatedJiraIssues {
    enabled: boolean;
}

export interface BitbucketRelatedBitbucketIssues {
    enabled: boolean;
}

export interface BitbucketNotifications {
    refreshInterval: number;
    pullRequestCreated: boolean;
}

export interface BitbucketStatusBar {
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showLogin: boolean;
}

export interface BitbucketContextMenus {
    enabled: boolean;
}

const emptyJiraExplorer: JiraExplorer = {
    enabled: true,
    monitorEnabled: true,
    refreshInterval: 5,
    nestSubtasks: true,
    fetchAllQueryResults: false,
};

const emtpyIssueMonitor: JiraIssueMonitor = {
    refreshInterval: 5,
};

const emptyJiraStatusBar: JiraStatusBar = {
    enabled: true,
    showProduct: true,
    showUser: true,
    showLogin: true,
    showActiveIssue: true,
};

const emptyJiraHover: JiraHover = {
    enabled: true,
};

const emptyTodoIssues: TodoIssues = {
    enabled: true,
    triggers: [],
};

const emptyStartWorkBranchTemplate: StartWorkBranchTemplate = {
    customPrefixes: [],
    customTemplate: '{{prefix}}/{{issueKey}}-{{summary}}',
};

const emptyJiraConfig: JiraConfig = {
    enabled: true,
    lastCreateSiteAndProject: { siteId: '', projectKey: '' },
    explorer: emptyJiraExplorer,
    issueMonitor: emtpyIssueMonitor,
    statusbar: emptyJiraStatusBar,
    hover: emptyJiraHover,
    jqlList: [],
    todoIssues: emptyTodoIssues,
    startWorkBranchTemplate: emptyStartWorkBranchTemplate,
    showCreateIssueProblems: false,
};

const emptyRovoDevConfig: RovoDevConfig = {
    showKeybinding: false,
    debugPanelEnabled: false,
};

const emptyRelatedJiraIssues: BitbucketRelatedJiraIssues = {
    enabled: true,
};

const emptyBitbucketNotfications: BitbucketNotifications = {
    refreshInterval: 10,
    pullRequestCreated: true,
};

const emptyBitbucketExplorer: BitbucketExplorer = {
    enabled: true,
    nestFilesEnabled: true,
    refreshInterval: 5,
    relatedJiraIssues: emptyRelatedJiraIssues,
    notifications: emptyBitbucketNotfications,
};

const emptyBitbucketStatusBar: BitbucketStatusBar = {
    enabled: true,
    showProduct: true,
    showUser: true,
    showLogin: true,
};

const emptyBitbucketContextMenus: BitbucketContextMenus = {
    enabled: true,
};

const emptyPipelinesConfig: BitbucketPipelinesConfig = {
    explorerEnabled: true,
    monitorEnabled: true,
    refreshInterval: 5,
    hideEmpty: true,
    hideFiltered: false,
    branchFilters: [],
};

const emptyIssuesConfig: BitbucketIssuesConfig = {
    explorerEnabled: true,
    monitorEnabled: true,
    refreshInterval: 15,
    createJiraEnabled: false,
};

const emptyBitbucketConfig: BitbucketConfig = {
    enabled: true,
    explorer: emptyBitbucketExplorer,
    statusbar: emptyBitbucketStatusBar,
    contextMenus: emptyBitbucketContextMenus,
    pipelines: emptyPipelinesConfig,
    issues: emptyIssuesConfig,
    preferredRemotes: ['upstream', 'origin'],
    showTerminalLinkPanel: true,
};

export const emptyConfig: IConfig = {
    issueSuggestionContextLevel: IssueSuggestionContextLevel.CodeContext,
    outputLevel: OutputLevel.Silent,
    enableCharles: false,
    charlesCertPath: '',
    charlesDebugOnly: false,
    showWelcomeOnInstall: true,
    jira: emptyJiraConfig,
    bitbucket: emptyBitbucketConfig,
    enableUIWS: false,
    enableCurlLogging: false,
    enableHttpsTunnel: false,
    helpExplorerEnabled: true,
    rovodev: emptyRovoDevConfig,
};
