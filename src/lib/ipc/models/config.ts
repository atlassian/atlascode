export enum ConfigTarget {
    User = 'user',
    Workspace = 'workspace',
    WorkspaceFolder = 'workspacefolder',
}

export enum ConfigSection {
    Jira = 'jira',
    Bitbucket = 'bitbucket',
    General = 'general',
    Explore = 'explore',
}

export enum ConfigV3Section {
    Auth = 'generalAuth', // For UI
    AdvancedConfig = 'advancedConfigs', // For UI
    Explore = 'explore', // UI and functionality
}

export enum ConfigSubSection {
    Auth = 'auth',
    Issues = 'issues',
    Hovers = 'hovers',
    Triggers = 'triggers',
    Status = 'status',
    PR = 'pullRequests',
    Pipelines = 'pipelines',
    ContextMenus = 'contextMenus',
    PreferredRemotes = 'preferredRemotes',
    Misc = 'misc',
    Connectivity = 'connect',
    Debug = 'debug',
    JiraFeatures = 'jiraFeatures',
    BitbucketFeatures = 'bitbucketFeatures',
    StartWork = 'startWork',
}

export enum ConfigV3SubSection {
    BbAuth = 'bitbucketAuth',
    JiraAuth = 'jiraAuth',
    StartWork = 'startWork',
    Issues = 'issues',
    Misc = 'misc',
    Debug = 'debug',
}

export type FlattenedConfig = { [key: string]: any };
