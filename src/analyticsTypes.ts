// TODO: move this with other analytics stuff into a separate folder
// not doing it now to prevent too many import changes

/**
 * Names of the channels used for routing analytics events in UI
 */
export enum AnalyticsChannels {
    AtlascodeUiErrors = 'atlascode.ui.errors',
}

export enum AnalyticsView {
    OnboardingPage = 'onboarding',
    SettingsPage = 'settings',
    WelcomePage = 'welcome',

    BitbucketIssuePage = 'bitbucketIssue',
    PullRequestPage = 'pullRequest',

    CreateBitbucketIssuePage = 'createBitbucketIssue',
    CreatePullRequestPage = 'createPullRequest',

    PipelineSummaryPage = 'pipelineSummary',

    StartWorkPage = 'startWork',

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
