// import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
import { BasicAuthInfo, Product, ProductBitbucket, ProductJira, SiteInfo } from 'src/atlclients/authInfo';
import { Commands } from 'src/commands';
import { Container } from 'src/container';
import { EXTENSION_URL } from 'src/uriHandler/atlascodeUriHandler';
import {
    commands,
    env,
    InputBox,
    QuickInputButton,
    QuickInputButtons,
    QuickPick,
    QuickPickItem,
    ThemeIcon,
    Uri,
    window,
} from 'vscode';

class OnboardingProvider {
    // private _analyticsClient: AnalyticsClient;
    private _quickPick: QuickPick<OnboardingQuickPickItem>;
    private _jiraItems: OnboardingQuickPickItem[] = [];
    private _bitbucketItems: OnboardingQuickPickItem[] = [];

    private _quickInputServer: InputBox[];

    // private _currentStep: number = 0;

    constructor() {
        // this._analyticsClient = Container.analyticsClient;
        this._quickPick = window.createQuickPick<OnboardingQuickPickItem>();

        this._quickInputServer = [];

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

    private _initializeServerLogin() {
        for (let i = 0; i < 3; i++) {
            this._quickInputServer[i] = window.createInputBox();
            this._quickInputServer[i].totalSteps = 3;
            this._quickInputServer[i].step = i + 1;
            this._quickInputServer[i].ignoreFocusOut = true;
            this._quickInputServer[i].buttons = [QuickInputButtons.Back];
            this._quickInputServer[i].onDidTriggerButton(this._quickPickOnDidTriggerButton.bind(this)); // TODO
        }
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
        const onboardingId = this._quickPick.activeItems[0].onboardingId;

        switch (onboardingId) {
            case 'onboarding:jira-cloud':
                this.getIsRemote()
                    ? this.handleServerLoginSteps(ProductJira, 'Cloud', 0)
                    : this.handleCloudLogin(ProductJira).then(() => {
                          this.handleNext();
                      });
                // this._analyticsClient.sendUIEvent('onboarding:jira-cloud');
                break;
            case 'onboarding:jira-server':
                // this._analyticsClient.sendUIEvent('onboarding:jira-server');
                this.handleServerLoginSteps(ProductJira, 'Server', 0);
                break;
            case 'onboarding:jira-skip':
                // this._analyticsClient.sendUIEvent('onboarding:jira-skip');
                this.handleNext();
                break;
            case 'onboarding:bitbucket-cloud':
                this.getIsRemote()
                    ? this.handleServerLoginSteps(ProductBitbucket, 'Cloud', 0)
                    : this.handleCloudLogin(ProductBitbucket).then(() => {
                          this.handleNext();
                      });
                // this._analyticsClient.sendUIEvent('onboarding:bitbucket-cloud');
                break;
            case 'onboarding:bitbucket-server':
                this.handleServerLoginSteps(ProductBitbucket, 'Server', 0);
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

    private handleServerLoginSteps(product: Product, env: string, step: number) {
        switch (step) {
            case 0:
                this._quickInputServer[step].prompt = this.helperText(product, env);
                this._quickInputServer[step].placeholder = 'Enter your site URL';
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} URL`;
                this._quickInputServer[step].onDidAccept(() => {
                    this._quickInputServer[step].hide();
                    this.handleServerLoginSteps(product, env, step + 1);
                });
                this._quickInputServer[step].show();
                break;
            case 1:
                this._quickInputServer[step].prompt = 'Enter your username';
                this._quickInputServer[step].placeholder = 'Enter your username';
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} username`;
                this._quickInputServer[step].onDidAccept(() => {
                    this._quickInputServer[step].hide();
                    this.handleServerLoginSteps(product, env, step + 1);
                });
                this._quickInputServer[step].show();
                break;

            case 2:
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
                    this.handleServerLogin(product)
                        .then(() => {
                            this._quickInputServer[step].hide();
                            this._quickInputServer[step].busy = false;
                        })
                        .catch((e) => {}); // TODO;
                });
                this._quickInputServer[step].show();
                break;
            default:
                break;
        }
    }

    private async handleServerLogin(product: Product) {
        const baseUrl = new URL(this._quickInputServer[0].value);

        console.log('baseUrl', baseUrl);
        const username = this._quickInputServer[1].value;
        const password = this._quickInputServer[2].value;

        if (!baseUrl || !username || !password) {
            return;
        }

        this._quickInputServer[2].busy = true;
        // this._quickInputServer[2].enabled = false;

        const siteInfo = {
            host: baseUrl.host,
            protocol: baseUrl.protocol,
            product,
        } as SiteInfo;

        const authInfo = {
            username,
            password,
        } as BasicAuthInfo;

        await Container.loginManager.userInitiatedServerLogin(siteInfo, authInfo, true);
    }

    private getIsRemote() {
        return env.remoteName !== undefined;
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

export const onboardingProvider = new OnboardingProvider();
