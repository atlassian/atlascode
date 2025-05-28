import { commands, env, QuickInputButton, QuickInputButtons, QuickPick, UIKind, Uri, window } from 'vscode';

import { authenticateButtonEvent, errorEvent, viewScreenEvent } from '../analytics';
import { type AnalyticsClient } from '../analytics-node-client/src/client.min';
import { BasicAuthInfo, Product, ProductBitbucket, ProductJira, SiteInfo } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { Container } from '../container';
import { EXTENSION_URL } from '../uriHandler/atlascodeUriHandler';
import { isValidUrl } from '../webviews/components/fieldValidators';
import {
    bitbucketOnboardingItems,
    jiraOnboardingItems,
    OnboardingButtons,
    onboardingHelperText,
    OnboardingInputBox,
    OnboardingQuickPickItem,
} from './utils';

class OnboardingProvider {
    private id = 'atlascodeOnboardingQuickPick';

    private _analyticsClient: AnalyticsClient;
    private _quickPick: QuickPick<OnboardingQuickPickItem>;
    private _jiraItems: OnboardingQuickPickItem[] = [];
    private _bitbucketItems: OnboardingQuickPickItem[] = [];

    private _quickInputServer: OnboardingInputBox[];
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

        this._quickPick.buttons = [OnboardingButtons.settings];

        this._quickPick.onDidTriggerButton(this._quickPickOnDidTriggerButton.bind(this));
        this._quickPick.onDidAccept(this._quickPickOnDidAccept.bind(this));

        this._jiraItems = jiraOnboardingItems;
        this._bitbucketItems = bitbucketOnboardingItems;

        this._initializeServerLogin();
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
            this._quickInputServer[i].onDidAccept(this._onDidInputAccept.bind(this, i));
        }
    }

    // --- QuickPick Button Handler ---
    private _quickPickOnDidTriggerButton(e: QuickInputButton) {
        if (e === OnboardingButtons.settings) {
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
        const step = this._quickInputStep;

        this._quickInputServer[step].validationMessage = undefined;

        this._resetServerInputValues();

        if (e === QuickInputButtons.Back) {
            switch (step) {
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
        } else if (e === OnboardingButtons.createApiToken) {
            this._handleOpenCreateApiToken();
        }
    }

    // --- QuickPick Accept Handler ---
    private async _quickPickOnDidAccept() {
        if (!this._quickPick.activeItems || this._quickPick.activeItems.length === 0) {
            return;
        }

        const onboardingId = this._quickPick.activeItems[0].onboardingId;

        if (!onboardingId) {
            return;
        }

        let siteInfo: SiteInfo;

        switch (onboardingId) {
            case 'onboarding:jira-cloud':
                this._getIsRemote()
                    ? this._handleServerLoginSteps(ProductJira, 'Cloud', 0)
                    : this._handleCloudLogin(ProductJira).catch((e) => {
                          const message = e.message || `Failed to authenticate with Jira Cloud`;

                          window.showErrorMessage(message);

                          errorEvent(message, e, this.id).then((event) => {
                              this._analyticsClient.sendTrackEvent(event);
                          });
                      });

                break;
            case 'onboarding:jira-server':
                this._handleServerLoginSteps(ProductJira, 'Server', 0);
                break;
            case 'onboarding:jira-skip':
                siteInfo = {
                    product: ProductJira,
                    host: 'atlassian.net',
                };
                // Log the skip event
                authenticateButtonEvent(this.id, siteInfo, false, this._getIsRemote(), this._getIsWebUi(), true).then(
                    (e) => {
                        this._analyticsClient.sendUIEvent(e);
                    },
                );

                this._handleNext();
                break;
            case 'onboarding:bitbucket-cloud':
                this._handleCloudLogin(ProductBitbucket).catch((e) => {
                    const message = e.message || `Failed to authenticate with Bitbucket Cloud`;

                    window.showErrorMessage(message);

                    errorEvent(message, e, this.id).then((event) => {
                        this._analyticsClient.sendTrackEvent(event);
                    });
                });

                break;
            case 'onboarding:bitbucket-server':
                this._handleServerLoginSteps(ProductBitbucket, 'Server', 0);

                break;
            case 'onboarding:bitbucket-skip':
                siteInfo = {
                    product: ProductBitbucket,
                    host: 'bitbucket.org',
                };
                // Log the skip event
                authenticateButtonEvent(this.id, siteInfo, false, this._getIsRemote(), this._getIsWebUi(), true).then(
                    (e) => {
                        this._analyticsClient.sendUIEvent(e);
                    },
                );

                this._handleNext();

                break;
            default:
                break;
        }
    }

    // --- Quick Input Accept Handler ---
    private async _onDidInputAccept(step: number) {
        const quickInput = this._quickInputServer[step];

        if (!quickInput || !quickInput.product || !quickInput.env) {
            return;
        }

        switch (step) {
            case 0:
                if (!isValidUrl(quickInput.value)) {
                    quickInput.validationMessage = 'Please enter a valid URL';
                    return;
                }

                quickInput.hide();

                quickInput.validationMessage = undefined;

                this._handleServerLoginSteps(quickInput.product, quickInput.env, step + 1);

                break;

            case 1:
                if (!quickInput.value || quickInput.value.trim() === '') {
                    quickInput.validationMessage = 'Please enter a username';
                    return;
                }

                quickInput.hide();

                quickInput.validationMessage = undefined;

                this._handleServerLoginSteps(quickInput.product, quickInput.env, step + 1);

                break;

            case 2:
                if (!quickInput.value || quickInput.value.trim() === '') {
                    quickInput.validationMessage = 'Please enter a password';
                    return;
                }

                await this._handleServerLogin(quickInput.product)
                    .then(() => {
                        quickInput.busy = false;

                        this._resetServerInputValues();

                        quickInput.validationMessage = undefined;

                        this._handleNext();
                    })
                    .catch((e) => {
                        quickInput.busy = false;

                        quickInput.validationMessage = e.message || 'Login failed';

                        const errorMessage = e.message || 'Failed to authenticate with server';

                        window.showErrorMessage(errorMessage);

                        errorEvent(errorMessage, e, this.id).then((event) => {
                            this._analyticsClient.sendTrackEvent(event);
                        });
                    });
                break;
        }
    }

    // --- Handle Next Step ---
    private _handleNext() {
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
    private async _handleCloudLogin(product: Product) {
        this._quickPick.busy = true;

        const siteInfo = {
            product,
            host: product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org',
        };

        authenticateButtonEvent(this.id, siteInfo, true, this._getIsRemote(), this._getIsWebUi()).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });

        try {
            await Container.loginManager.userInitiatedOAuthLogin(siteInfo, EXTENSION_URL, true, this.id);
            this._handleNext();
            this._quickPick.busy = false;
        } catch (e) {
            throw Error(`Failed to authenticate with ${product.name} Cloud: ${e.message || e}`);
        }
    }

    // --- Server Login Steps Handler ---
    private async _handleServerLoginSteps(product: Product, env: string, step: number) {
        if (!this._quickInputServer[step]) {
            return;
        }
        this._quickInputServer[step].product = product;
        this._quickInputServer[step].env = env;

        switch (step) {
            case 0: // Input server URL
                this._quickInputStep = step;

                this._quickInputServer[step].prompt = onboardingHelperText(product, env);
                this._quickInputServer[step].placeholder = 'Enter your site URL';
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} URL`;

                this._quickInputServer[step].show();

                break;

            case 1: // Input username
                this._quickInputStep = step;

                this._quickInputServer[step].prompt = 'Enter your username';
                this._quickInputServer[step].placeholder = 'Enter your username';
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} username`;

                this._quickInputServer[step].show();
                break;

            case 2: // Input password
                this._quickInputStep = step;

                this._quickInputServer[step].password = true;
                this._quickInputServer[step].title = `Enter your ${product.name} ${env} password`;

                // Jira cloud remote login
                if (product.key === ProductJira.key && env === 'Cloud') {
                    this._quickInputServer[step].prompt =
                        'Use an API token to connect. Click the link button above to create one.';
                    this._quickInputServer[step].placeholder = 'Enter your API token';
                    this._quickInputServer[step].buttons = [QuickInputButtons.Back, OnboardingButtons.createApiToken];
                } else {
                    this._quickInputServer[step].prompt = 'Enter your password';
                    this._quickInputServer[step].placeholder = 'Enter your password';
                }

                this._quickInputServer[step].show();
                break;

            default:
                break;
        }
    }

    // --- Server Login Handler ---
    private async _handleServerLogin(product: Product) {
        try {
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

            authenticateButtonEvent(this.id, siteInfo, false, this._getIsRemote(), this._getIsWebUi()).then((e) => {
                this._analyticsClient.sendUIEvent(e);
            });

            await Container.loginManager.userInitiatedServerLogin(siteInfo, authInfo, true, this.id);
        } catch (e) {
            throw Error(`Failed to authenticate with ${product.name} server: ${e.message || e}`);
        }
    }

    // --- Start Onboarding ---
    start() {
        viewScreenEvent(this.id).then((e) => {
            this._analyticsClient.sendScreenEvent(e);
        });
        if (this._quickPick.step !== 1) {
            this._quickPick.step = 1;
        }

        this.show();
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
            this._quickPick.buttons = [OnboardingButtons.settings];
            this._quickPick.placeholder = 'Select your Jira site type';
        } else if (this._quickPick.step === 2) {
            // Show Bitbucket items
            this._quickPick.items = this._bitbucketItems;
            this._quickPick.activeItems = [this._bitbucketItems[0]];
            this._quickPick.buttons = [QuickInputButtons.Back, OnboardingButtons.settings];
            this._quickPick.placeholder = 'Select your Bitbucket site type';
        } else {
            // Reset
            this._quickPick.step = 1;
        }

        this._quickPick.show();
    }

    // --- Helpers ---
    private _resetServerInputValues() {
        this._quickInputServer[0].value = '';
        this._quickInputServer[1].value = '';
        this._quickInputServer[2].value = '';
    }

    private _getIsRemote() {
        return env.remoteName !== undefined;
    }

    private _getIsWebUi() {
        return env.uiKind === UIKind.Web;
    }

    private _handleOpenCreateApiToken() {
        env.openExternal(Uri.parse('https://id.atlassian.com/manage-profile/security/api-tokens'));
    }
}

export default OnboardingProvider;
