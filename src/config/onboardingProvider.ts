// import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
// import { Container } from 'src/container';
import { Commands } from 'src/commands';
import { commands, QuickInputButton, QuickPick, QuickPickItem, ThemeIcon, window } from 'vscode';

class OnboardingProvider {
    // private _analyticsClient: AnalyticsClient;
    private _quickPick: QuickPick<OnboardingQuickPickItem>;
    private _jiraItems: OnboardingQuickPickItem[] = [];
    private _bitbucketItems: OnboardingQuickPickItem[] = [];

    constructor() {
        // this._analyticsClient = Container.analyticsClient;
        this._quickPick = window.createQuickPick<OnboardingQuickPickItem>();
        this._initialize();
    }

    private _initialize() {
        this._quickPick.title = 'Welcome to Atlascode';
        this._quickPick.step = 1;
        this._quickPick.totalSteps = 2;
        this._quickPick.ignoreFocusOut = true;

        this._quickPick.buttons = [
            {
                iconPath: new ThemeIcon('gear'),
                tooltip: 'Configure in settings',
            },
        ];

        this._quickPick.onDidTriggerButton(this._quickPickOnDidTriggerSettingsButton.bind(this));
        this._quickPick.onDidAccept(() => {
            if (this._quickPick.step === 1) {
                // this._analyticsClient.sendUIEvent(e[0].onboardingId);
                // commands.executeCommand(Commands.ShowJiraAuth);
                this._quickPick.step = 2;
                this.show();
            }
            if (this._quickPick.step === 2) {
                // this._quickPick.hide();
            }
        });
        this._initializeJiraItems();
        this._initializeBitbucketItems();
    }

    private _quickPickOnDidTriggerSettingsButton(e: QuickInputButton) {
        if (e.tooltip === 'Configure in settings') {
            // Open settings
            if (this._quickPick.step === 1) {
                // this._analyticsClient.sendUIEvent('onboarding:jira-settings');
                commands.executeCommand(Commands.ShowJiraAuth);
            } else if (this._quickPick.step === 2) {
                // this._analyticsClient.sendUIEvent('onboarding:bitbucket-settings');
                commands.executeCommand(Commands.ShowBitbucketAuth);
            }

            this._quickPick.hide();
        }
    }

    private _initializeJiraItems() {
        this._jiraItems = [
            {
                iconPath: new ThemeIcon('cloud'),
                label: 'Sign in to Jira Cloud',
                description: 'For most of our users.',
                detail: 'The URL for accessing your site will typically be in the format mysite.atlassian.net.',
                onboardingId: 'onboarding:jira-cloud',
            },
            {
                iconPath: new ThemeIcon('server'),
                label: 'Sign in to Jira Server',
                description: 'For users with a custom site.',
                detail: 'The URL is usually a custom domain or IP address set up by your organization.',
                onboardingId: 'onboarding:jira-server',
            },
            {
                iconPath: new ThemeIcon('chevron-right'),
                label: "I don't have Jira",
                description: 'Skip this step',
                detail: 'You can always set up a new Jira account later.',
                onboardingId: 'onboarding:jira-skip',
            },
        ];
    }

    private _initializeBitbucketItems() {
        this._bitbucketItems = [
            {
                iconPath: new ThemeIcon('cloud'),
                label: 'Sign in to Bitbucket Cloud',
                description: 'For most of our users.',
                detail: 'The URL for accessing your site will typically be in the format mysite.atlassian.net.',
                onboardingId: 'onboarding:bitbucket-cloud',
            },
            {
                iconPath: new ThemeIcon('server'),
                label: 'Sign in to Bitbucket Server',
                description: 'For users with a custom site.',
                detail: 'The URL is usually a custom domain or IP address set up by your organization.',
                onboardingId: 'onboarding:bitbucket-server',
            },
            {
                iconPath: new ThemeIcon('chevron-right'),
                label: "I don't have Bitbucket",
                description: 'Skip this step',
                detail: 'You can always set up a new Bitbucket account later.',
                onboardingId: 'onboarding:bitbucket-skip',
            },
        ];
    }

    show() {
        if (this._quickPick.step === 1) {
            this._quickPick.items = this._jiraItems;
            this._quickPick.activeItems = [this._jiraItems[0]];
            this._quickPick.placeholder = 'Select your Jira site type';
        } else if (this._quickPick.step === 2) {
            this._quickPick.items = this._bitbucketItems;
            this._quickPick.activeItems = [this._bitbucketItems[0]];
            this._quickPick.placeholder = 'Select your Bitbucket site type';
        }

        this._quickPick.show();
    }
}

interface OnboardingQuickPickItem extends QuickPickItem {
    onboardingId: string;
}

export const onboardingProvider = new OnboardingProvider();
