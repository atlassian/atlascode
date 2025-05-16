// import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
import { Product, ProductBitbucket, ProductJira } from 'src/atlclients/authInfo';
import { Commands } from 'src/commands';
import { Container } from 'src/container';
import { EXTENSION_URL } from 'src/uriHandler/atlascodeUriHandler';
import {
    commands,
    env,
    QuickInputButton,
    QuickInputButtons,
    QuickPick,
    QuickPickItem,
    ThemeIcon,
    window,
} from 'vscode';

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

        this._quickPick.onDidTriggerButton(this._quickPickOnDidTriggerButton.bind(this));
        this._quickPick.onDidAccept(this._quickPickOnDidAccept.bind(this));
        this._initializeJiraItems();
        this._initializeBitbucketItems();
    }

    private _quickPickOnDidTriggerButton(e: QuickInputButton) {
        if (e.tooltip === 'Configure in settings') {
            if (!this._quickPick.step || this._quickPick.step < 0 || this._quickPick.step > 2) {
                return;
            }
            // Open settings
            if (this._quickPick.step === 1) {
                // this._analyticsClient.sendUIEvent('onboarding:jira-settings');
                commands.executeCommand(Commands.ShowJiraAuth);
            } else if (this._quickPick.step === 2) {
                // this._analyticsClient.sendUIEvent('onboarding:bitbucket-settings');
                commands.executeCommand(Commands.ShowBitbucketAuth);
            }

            this._quickPick.hide();
        } else if (e === QuickInputButtons.Back) {
            if (!this._quickPick.step || this._quickPick.step < 0 || this._quickPick.step > 2) {
                return;
            }

            if (this._quickPick.step === 2) {
                this._quickPick.step = 1;
                this._quickPick.hide();
                this.show();
            }
        }
    }

    private async _quickPickOnDidAccept() {
        switch (this._quickPick.activeItems[0].onboardingId) {
            case 'onboarding:jira-cloud':
                this.getIsRemote()
                    ? this.handleRemoteLogin()
                    : this.handleCloudLogin(ProductJira).then(() => {
                          this.handleNext();
                      });
                // this._analyticsClient.sendUIEvent('onboarding:jira-cloud');
                break;
            case 'onboarding:jira-server':
                // this._analyticsClient.sendUIEvent('onboarding:jira-server');
                this.handleServerLogin();
                break;
            case 'onboarding:jira-skip':
                // this._analyticsClient.sendUIEvent('onboarding:jira-skip');
                this.handleNext();
                break;
            case 'onboarding:bitbucket-cloud':
                this.getIsRemote()
                    ? this.handleRemoteLogin()
                    : this.handleCloudLogin(ProductBitbucket).then(() => {
                          this.handleNext();
                      });
                // this._analyticsClient.sendUIEvent('onboarding:bitbucket-cloud');
                break;
            case 'onboarding:bitbucket-server':
                this.handleServerLogin();
                // this._analyticsClient.sendUIEvent('onboarding:bitbucket-server');
                break;
            case 'onboarding:bitbucket-skip':
                // this._analyticsClient.sendUIEvent('onboarding:bitbucket-skip');
                this.handleNext();
                break;
            default:
                // this._analyticsClient.sendUIEvent('onboarding:unknown');
                break;
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
        if (!this._quickPick.step) {
            return;
        }

        if (this._quickPick.step === 1) {
            this._quickPick.items = this._jiraItems;

            this._quickPick.activeItems = [this._jiraItems[0]];
            this._quickPick.buttons = [this._quickPick.buttons[0]];
            this._quickPick.placeholder = 'Select your Jira site type';
        } else if (this._quickPick.step === 2) {
            this._quickPick.items = this._bitbucketItems;

            this._quickPick.activeItems = [this._bitbucketItems[0]];
            this._quickPick.buttons = [...this._quickPick.buttons, QuickInputButtons.Back];
            this._quickPick.placeholder = 'Select your Bitbucket site type';
        } else {
            return;
        }

        this._quickPick.show();
    }

    private handleNext() {
        if (!this._quickPick.step) {
            return;
        }

        if (this._quickPick.step === 1) {
            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
            commands.executeCommand(Commands.RefreshCustomJqlExplorer);
        } else if (this._quickPick.step === 2) {
            commands.executeCommand(Commands.BitbucketRefreshPullRequests);
            commands.executeCommand(Commands.RefreshPipelines);
        } else {
            return;
        }

        this._quickPick.hide();
        this._quickPick.step++;

        this.show();
    }

    private async handleCloudLogin(product: Product) {
        this._quickPick.busy = true;
        await Container.loginManager.userInitiatedOAuthLogin(
            {
                product,
                host: product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org',
            },
            EXTENSION_URL,
            true,
        );

        this._quickPick.busy = false;
    }

    private handleRemoteLogin() {
        return;
    }

    private handleServerLogin() {
        return;
    }

    private getIsRemote() {
        return env.remoteName !== undefined;
    }
}

interface OnboardingQuickPickItem extends QuickPickItem {
    onboardingId: string;
}

export const onboardingProvider = new OnboardingProvider();
