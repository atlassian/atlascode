// TODO: move this with other analytics stuff into a separate folder
// not doing it now to prevent too many import changes

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
    OldStartWorkPage = 'page:v1:bitbucket:startWork',

    // v2

    OnboardingPage = 'page:v2:onboarding',
    SettingsPage = 'page:v2:settings',

    BitbucketIssuePage = 'page:v2:bitbucket:issue',

    PullRequestPage = 'page:v2:bitbucket:pullRequest',
    CreatePullRequestPage = 'page:v2:bitbucket:createPullRequest',

    PipelineSummaryPage = 'page:v2:bitbucket:pipeline',

    StartWorkPage = 'page:v2:jira:startWork',

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
};

export enum CreatePrTerminalSelection {
    Yes = 'yes',
    Ignore = 'ignore',
    Disable = 'disable',
}

// in the future we may use this to classify where the error is coming from:
// e.g., Jira, Bitbucket, Authentication, Notifications, etc
export type ErrorProductArea = 'RovoDev' | undefined;
