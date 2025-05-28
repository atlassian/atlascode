import {
    commands,
    env,
    InputBox,
    QuickInputButton,
    QuickInputButtons,
    QuickPick,
    QuickPickItem,
    ThemeIcon,
    UIKind,
    Uri,
    window,
} from 'vscode';

import { authenticateButtonEvent } from '../analytics';
import { type AnalyticsClient } from '../analytics-node-client/src/client.min';
import { BasicAuthInfo, Product, ProductBitbucket, ProductJira, SiteInfo } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { Container } from '../container';
import { EXTENSION_URL } from '../uriHandler/atlascodeUriHandler';
import { isValidUrl } from '../webviews/components/fieldValidators';

class OnboardingProvider {
    private id = 'atlascodeOnboardingQuickPick';

    private _analyticsClient: AnalyticsClient;
    private _quickPick: QuickPick<OnboardingQuickPickItem>;
    private _jiraItems: OnboardingQuickPickItem[] = [];
    private _bitbucketItems: OnboardingQuickPickItem[] = [];

    private _quickInputServer: InputBox[];
    private _quickInputStep: number;

    constructor() {
        this._analyticsClient = Container.analyticsClient;
        this._quickPick = window.createQuickPick<OnboardingQuickPickItem>();

        this._quickInputServer = [];
        this._quickInputStep = 0;

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
        this._initializeServerLogin();
    }

    // --- Initialize QuickPick Items ---
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

    // --- Initialize Server Login Inputs ---
    private _initializeServerLogin() {
        this._quickInputStep = 0;

        for (let i = 0; i < 3; i++) {
            this._quickInputServer[i] = window.createInputBox();
            this._quickInputServer[i].totalSteps = 3;
            this._quickInputServer[i].step = i + 1;
            this._quickInputServer[i].ignoreFocusOut = true;
            this._quickInputServer[i].buttons = [QuickInputButtons.Back];
            this._quickInputServer[i].onDidTriggerButton(this._quickInputOnDidTriggerButton.bind(this));
        }
    }

    // --- QuickPick Button Handler ---
    private _quickPickOnDidTriggerButton(e: QuickInputButton) {
        if (e.tooltip === 'Configure in settings') {
            if (!this._quickPick.step || this._quickPick.step < 0 || this._quickPick.step > 2) {
                return;
            }

            // Open settings
            if (this._quickPick.step === 1) {
                commands.executeCommand(Commands.ShowJiraAuth);
            } else if (this._quickPick.step === 2) {
                commands.executeCommand(Commands.ShowBitbucketAuth);
            }

            this._quickPick.hide();
        } else if (e === QuickInputButtons.Back) {
            if (!this._quickPick.step || this._quickPick.step !== 2) {
                return;
            }

            this._quickPick.step = 1;
            this._quickPick.hide();
            this.show();
        }
    }

    // --- QuickInput Button Handler ---
    private _quickInputOnDidTriggerButton(e: QuickInputButton) {
        if (e === QuickInputButtons.Back) {
            switch (this._quickInputStep) {
                case 0:
                    this._quickInputServer[0].hide();
                    this.show();
                    break;
                case 1:
                    this._quickInputServer[1].hide();
                    this._quickInputServer[0].show();
                    this._quickInputStep--;
                    break;
                case 2:
                    this._quickInputServer[2].hide();
                    this._quickInputServer[1].show();
                    this._quickInputStep--;
                    break;
                default:
                    break;
            }
        } else if (e.tooltip === 'Create API tokens') {
            this.handleOpenCreateApiToken();
        }
    }

    // --- QuickPick Accept Handler ---
    private async _quickPickOnDidAccept() {
        const onboardingId = this._quickPick.activeItems[0].onboardingId;

        if (!onboardingId) {
            return;
        }

        let siteInfo: SiteInfo;

        switch (onboardingId) {
            case 'onboarding:jira-cloud':
                this.getIsRemote()
                    ? this.handleServerLoginSteps(ProductJira, 'Cloud', 0)
                    : this.handleCloudLogin(ProductJira);
                break;
            case 'onboarding:jira-server':
                this.handleServerLoginSteps(ProductJira, 'Server', 0);
                break;
            case 'onboarding:jira-skip':
                siteInfo = {
                    product: ProductJira,
                    host: 'atlassian.net',
                };
                // Log the skip event
                authenticateButtonEvent(this.id, siteInfo, false, this.getIsRemote(), this.getIsWebUi(), true).then(
                    (e) => {
                        this._analyticsClient.sendUIEvent(e);
                    },
                );

                this.handleNext();
                break;
            case 'onboarding:bitbucket-cloud':
                this.getIsRemote()
                    ? this.handleServerLoginSteps(ProductBitbucket, 'Cloud', 0)
                    : this.handleCloudLogin(ProductBitbucket);
                break;
            case 'onboarding:bitbucket-server':
                this.handleServerLoginSteps(ProductBitbucket, 'Server', 0);
                break;
            case 'onboarding:bitbucket-skip':
                siteInfo = {
                    product: ProductBitbucket,
                    host: 'bitbucket.org',
                };
                // Log the skip event
                authenticateButtonEvent(this.id, siteInfo, false, this.getIsRemote(), this.getIsWebUi(), true).then(
                    (e) => {
                        this._analyticsClient.sendUIEvent(e);
                    },
                );

                this.handleNext();
                break;
            default:
                break;
        }
    }

    // --- Show QuickPick ---
    show() {
        if (!this._quickPick.step) {
            return;
        }

        if (this._quickPick.step === 1) {
            // Show Jira items
            this._quickPick.items = this._jiraItems;
            this._quickPick.activeItems = [this._jiraItems[0]];
            this._quickPick.buttons = [this._quickPick.buttons[0]];
            this._quickPick.placeholder = 'Select your Jira site type';
        } else if (this._quickPick.step === 2) {
            // Show Bitbucket items
            this._quickPick.items = this._bitbucketItems;
            this._quickPick.activeItems = [this._bitbucketItems[0]];
            this._quickPick.buttons = [this._quickPick.buttons[0], QuickInputButtons.Back];
            this._quickPick.placeholder = 'Select your Bitbucket site type';
        } else {
            // Reset
            this._quickPick.step = 1;
            this._quickPick.items = this._jiraItems;
            this._quickPick.activeItems = [this._jiraItems[0]];
            this._quickPick.buttons = [this._quickPick.buttons[0]];
            this._quickPick.placeholder = 'Select your Jira site type';
            return;
        }

        this._quickPick.show();
    }

    // --- Handle Next Step ---
    private handleNext() {
        if (!this._quickPick.step) {
            return;
        }

        if (this._quickPick.step === 1) {
            // Refresh Jira explorers
            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
            commands.executeCommand(Commands.RefreshCustomJqlExplorer);
        } else if (this._quickPick.step === 2) {
            // Refresh Bitbucket explorers
            commands.executeCommand(Commands.BitbucketRefreshPullRequests);
            commands.executeCommand(Commands.RefreshPipelines);
        } else {
            return;
        }

        this._quickPick.hide();
        this._quickPick.step++;

        Container.focus();
        this.show();
    }

    // --- Cloud Login Handler ---
    private async handleCloudLogin(product: Product) {
        this._quickPick.busy = true;

        const siteInfo = {
            product,
            host: product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org',
        };

        authenticateButtonEvent(this.id, siteInfo, true, this.getIsRemote(), this.getIsWebUi()).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });

        try {
            await Container.loginManager.userInitiatedOAuthLogin(siteInfo, EXTENSION_URL, true, this.id);
            this.handleNext();
            this._quickPick.busy = false;
        } catch (e) {
            window.showErrorMessage(`Failed to authenticate with ${product.name} Cloud: ${e.message || e}`);
        }
    }

    // --- Server Login Steps Handler ---
    private async handleServerLoginSteps(product: Product, env: string, step: number) {
        switch (step) {
            case 0:
                this._quickInputStep = step;
                this._quickInputServer[step].prompt = this.helperText(product, env);
                this._quickInputServer[step].placeholder = 'Enter your site URL';
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} URL`;
                this._quickInputServer[step].onDidAccept(() => {
                    if (!isValidUrl(this._quickInputServer[step].value)) {
                        this._quickInputServer[step].validationMessage = 'Please enter a valid URL';
                        return;
                    }
                    this._quickInputServer[step].hide();
                    this._quickInputServer[step].validationMessage = undefined;
                    this.handleServerLoginSteps(product, env, step + 1);
                });
                this._quickInputServer[step].show();
                break;

            case 1:
                this._quickInputStep = step;
                this._quickInputServer[step].prompt = 'Enter your username';
                this._quickInputServer[step].placeholder = 'Enter your username';
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} username`;
                this._quickInputServer[step].onDidAccept(() => {
                    if (!this._quickInputServer[step].value || this._quickInputServer[step].value.trim() === '') {
                        this._quickInputServer[step].validationMessage = 'Please enter a username';
                        return;
                    }
                    this._quickInputServer[step].hide();
                    this._quickInputServer[step].validationMessage = undefined;
                    this.handleServerLoginSteps(product, env, step + 1);
                });
                this._quickInputServer[step].show();
                break;

            case 2:
                this._quickInputStep = step;

                if (product.key === ProductJira.key && env === 'Cloud') {
                    this._quickInputServer[step].prompt = 'You can use an API token to connect to this site.';
                    this._quickInputServer[step].placeholder = 'Enter your API token';

                    this._quickInputServer[step].buttons = [
                        ...this._quickInputServer[step].buttons,
                        {
                            iconPath: new ThemeIcon('link-external'),
                            tooltip: 'Create API tokens',
                        },
                    ];

                    this._quickInputServer[step].onDidTriggerButton((e) => {
                        if (e.tooltip === 'Create API tokens') {
                            this.handleOpenCreateApiToken();
                        }
                    });
                } else {
                    this._quickInputServer[step].prompt = 'Enter your password';
                    this._quickInputServer[step].placeholder = 'Enter your password';
                }

                this._quickInputServer[step].password = true;
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} password`;

                this._quickInputServer[step].onDidAccept(() => {
                    if (!this._quickInputServer[step].value || this._quickInputServer[step].value.trim() === '') {
                        this._quickInputServer[step].validationMessage = 'Please enter a password';
                        return;
                    }
                    this.handleServerLogin(product).then(() => {
                        this._quickInputServer[step].busy = false;
                        this.resetServerInputValues();
                        this._quickInputServer[step].validationMessage = undefined;
                        this.handleNext();
                    });
                });

                this._quickInputServer[step].show();
                break;

            default:
                break;
        }
    }

    // --- Server Login Handler ---
    private async handleServerLogin(product: Product) {
        const baseUrl = new URL(this._quickInputServer[0].value);
        const username = this._quickInputServer[1].value;
        const password = this._quickInputServer[2].value;

        if (!baseUrl || !username || !password) {
            return;
        }

        this._quickInputServer[2].busy = true;

        const siteInfo = {
            host: baseUrl.host,
            protocol: baseUrl.protocol,
            product,
        } as SiteInfo;

        const authInfo = {
            username,
            password,
        } as BasicAuthInfo;

        authenticateButtonEvent(this.id, siteInfo, false, this.getIsRemote(), this.getIsWebUi()).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });

        try {
            await Container.loginManager.userInitiatedServerLogin(siteInfo, authInfo, true, this.id);
        } catch (e) {
            window.showErrorMessage(`Failed to authenticate with ${product.name} server: ${e.message || e}`);
        }
    }

    // --- Helpers ---
    private resetServerInputValues() {
        this._quickInputServer[0].value = '';
        this._quickInputServer[1].value = '';
        this._quickInputServer[2].value = '';
    }

    private getIsRemote() {
        return env.remoteName !== undefined;
    }

    private getIsWebUi() {
        return env.uiKind === UIKind.Web;
    }

    private helperText = (product: Product, env: string) => {
        if (product.key === ProductJira.key) {
            const site = env === 'Cloud' ? 'cloud' : 'server';
            const baseUrl = env === 'Cloud' ? 'https://jira.atlassian.net' : 'https://jira.mydomain.com';
            return `You can enter a ${site} url like ${baseUrl}\n`;
        } else if (product.key === ProductBitbucket.key) {
            const site = env === 'Cloud' ? 'cloud' : 'server';
            const baseUrl = env === 'Cloud' ? 'https://bitbucket.org' : 'https://bitbucket.mydomain.com';
            return `You can enter a ${site} url like ${baseUrl}\n`;
        }
        return '';
    };

    private handleOpenCreateApiToken() {
        env.openExternal(Uri.parse('https://id.atlassian.com/manage-profile/security/api-tokens'));
    }
}

interface OnboardingQuickPickItem extends QuickPickItem {
    onboardingId: string;
}

export default OnboardingProvider;
