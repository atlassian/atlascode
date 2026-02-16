// TODO: move this with other analytics stuff into a separate folder
// not doing it now to prevent too many import changes

import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';

/**
 * Names of the channels used for routing analytics events in UI
 */
export enum AnalyticsChannels {
    AtlascodeUiErrors = 'atlascode.ui.errors',
}

/**
 * Descriptions of the different pages that the extension can render as webviews.
 * These appear in error reports, so it's best if they are verbose and descriptive.
 *
 * Values typically follow the pattern of `<type>:<version>:[?product]:<view>`
 *
 * Versions so far:
 *  - v1: (legacy) Webviews based on AbstractReactWebview
 *  - v2: (legacy) Webviews based on the WebviewController/WebviewControllerFactory architecture
 */
export enum AnalyticsView {
    // v1

    CreateJiraIssuePage = 'page:v1:jira:createIssue',
    JiraIssuePage = 'page:v1:jira:issue',

    // v2

    SettingsPage = 'page:v2:settings',

    BitbucketIssuePage = 'page:v2:bitbucket:issue',

    PullRequestPage = 'page:v2:bitbucket:pullRequest',
    CreatePullRequestPage = 'page:v2:bitbucket:createPullRequest',

    PipelineSummaryPage = 'page:v2:bitbucket:pipeline',

    StartWorkPage = 'page:v3:jira:startWork',

    // Reserved for future use

    Other = 'other',
}

export type UIAnalyticsContext = {
    view: string;
};

export type UIErrorInfo = UIAnalyticsContext & {
    stack: string;
    errorName: string;
    errorMessage: string;
    errorCause: string;
    userDomain: string;
};

export enum CreatePrTerminalSelection {
    Yes = 'yes',
    Ignore = 'ignore',
    Disable = 'disable',
}

// in the future we may use this to classify where the error is coming from:
// e.g., Jira, Bitbucket, Authentication, Notifications, etc
export type ErrorProductArea = 'RovoDev' | 'Bitbucket' | undefined;

export type FeedbackSentEvent = {
    feature: 'issueSuggestions'; // | 'otherFeature' - this is generic
    feedbackType: 'positive' | 'negative';
};

/**
 * Source values for tracking where the Create Jira Issue page was opened from
 */
export type CreateIssueSource =
    | 'commandPalette' // Command Palette (Cmd+Shift+P)
    | 'sidebarButton' // Sidebar [+] button
    | 'todoComment' // TODO comment code lens
    | 'contextMenu' // File right-click context menu
    | 'issueContextMenu' // Issue right-click context menu
    | 'settingsPage' // Settings Explore page
    | 'explorer'; // Default/legacy fallback

/**
 * Exit reason for tracking why users abandon the Create Jira Issue page
 */
export type CreateIssueExitReason =
    | 'closed' // user closed the tab without creating issue
    | 'error'; // user left after getting an API error

export type AnalyticRequiredFieldInfo = Pick<FieldUI, 'name' | 'uiType' | 'advanced' | 'valueType' | 'isArray'>;
