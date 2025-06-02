import { commands, env, InputBox, UIKind, window } from 'vscode';

import { authenticateButtonEvent, errorEvent, viewScreenEvent } from '../analytics';
import { type AnalyticsClient } from '../analytics-node-client/src/client.min';
import { BasicAuthInfo, Product, ProductBitbucket, ProductJira, SiteInfo } from '../atlclients/authInfo';
import { Commands } from '../constants';
import { Container } from '../container';
import { EXTENSION_URL } from '../uriHandler/atlascodeUriHandler';
import OnboardingQuickInputManager from './onboardingQuickInputManager';
import OnboardingQuickPickManager from './onboardingQuickPickManager';
import { OnboardingInputBoxStep, OnboardingQuickPickItem, onboardingQuickPickItems, OnboardingStep } from './utils';

class OnboardingProvider {
    private id = 'atlascodeOnboardingQuickPick';

    private _analyticsClient: AnalyticsClient;

    private _jiraQuickPickManager: OnboardingQuickPickManager;
    private _bitbucketQuickPickManager: OnboardingQuickPickManager;

    private _quickInputManager: OnboardingQuickInputManager;

    constructor() {
        this._analyticsClient = Container.analyticsClient;

        this._quickInputManager = new OnboardingQuickInputManager(
            this.show.bind(this),
            this._handleNext.bind(this),
            this._handleError.bind(this),
            this._handleServerLogin.bind(this),
        );

        this._jiraQuickPickManager = new OnboardingQuickPickManager(
            onboardingQuickPickItems(ProductJira),
            ProductJira,
            this._quickPickOnDidAccept.bind(this),
        );

        this._bitbucketQuickPickManager = new OnboardingQuickPickManager(
            onboardingQuickPickItems(ProductBitbucket),
            ProductBitbucket,
            this._quickPickOnDidAccept.bind(this),
            this._handleBack.bind(this),
        );
    }

    // --- Handle Quick Pick Accept ---
    private async _quickPickOnDidAccept(item: OnboardingQuickPickItem, product: Product) {
        const onboardingId = item.onboardingId;

        if (!onboardingId) {
            return;
        }

        switch (onboardingId) {
            case 'onboarding:cloud':
                this._getIsRemote() && product === ProductJira
                    ? this._quickInputManager.start(product, 'Cloud')
                    : this._handleCloud(product);

                break;
            case 'onboarding:server':
                this._quickInputManager.start(product, 'Server');
                break;
            case 'onboarding:skip':
                this._handleSkip(product);
                break;
            default:
                break;
        }
    }

    // --- Handle Next Step ---
    private _handleNext(step: OnboardingStep) {
        if (step === OnboardingStep.Jira) {
            // Refresh Jira explorers
            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);

            commands.executeCommand(Commands.RefreshCustomJqlExplorer);
        } else if (step === OnboardingStep.Bitbucket) {
            // Refresh Bitbucket explorers
            commands.executeCommand(Commands.BitbucketRefreshPullRequests);

            commands.executeCommand(Commands.RefreshPipelines);
            this.hideQuickPick(step);
            return;
        } else {
            return;
        }
        Container.focus();
        this.hideQuickPick(step);

        this.show(step + 1);
    }

    // --- Start Onboarding ---
    start() {
        this._fireViewScreenEvent();
        Container.focus();

        this.show(OnboardingStep.Jira);
    }

    // --- Show QuickPick ---
    show(step: OnboardingStep) {
        if (step === OnboardingStep.Jira) {
            // Show Jira items
            this._jiraQuickPickManager.show();
        } else if (step === OnboardingStep.Bitbucket) {
            // Show Bitbucket items
            this._bitbucketQuickPickManager.show();
        } else {
            return;
        }
    }

    hideQuickPick(step: OnboardingStep) {
        if (step === OnboardingStep.Jira) {
            this._jiraQuickPickManager.hide();
        } else if (step === OnboardingStep.Bitbucket) {
            this._bitbucketQuickPickManager.hide();
        }
    }

    private _setBusy(product: Product, busy: boolean) {
        product === ProductJira
            ? this._jiraQuickPickManager.setBusy(busy)
            : this._bitbucketQuickPickManager.setBusy(busy);
    }
    // --- Helpers ---

    private _getIsRemote() {
        return env.remoteName !== undefined;
    }

    private _getIsWebUi() {
        return env.uiKind === UIKind.Web;
    }

    private _handleError(message: string, error: Error) {
        window.showErrorMessage(message);
        errorEvent(message, error, this.id).then((event) => {
            this._analyticsClient.sendTrackEvent(event);
        });
    }

    private _handleSkip(product: Product) {
        const host = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
        const siteInfo = { product, host };

        const step = product.key === ProductJira.key ? OnboardingStep.Jira : OnboardingStep.Bitbucket;

        this._fireAuthenticateButtonEvent(siteInfo, false, true);

        this._handleNext(step);
    }

    private _handleBack(step: OnboardingStep) {
        this.hideQuickPick(step);
        this.show(step - 1);
    }

    private _handleCloud(product: Product) {
        this._handleCloudLogin(product).catch((e) =>
            this._handleError(e.message || `Failed to authenticate with ${product.name} Cloud`, e),
        );
    }

    // --- Cloud Login Handler ---
    private async _handleCloudLogin(product: Product) {
        try {
            this._setBusy(product, true);

            const step = product === ProductJira ? OnboardingStep.Jira : OnboardingStep.Bitbucket;

            const siteInfo = {
                product,
                host: product === ProductJira ? 'atlassian.net' : 'bitbucket.org',
            };

            this._fireAuthenticateButtonEvent(siteInfo, true);

            await Container.loginManager.userInitiatedOAuthLogin(siteInfo, EXTENSION_URL, true, this.id);
            this._handleNext(step);
            this._setBusy(product, false);
        } catch (e) {
            return Promise.reject(Error(`Failed to authenticate with ${product.name} Cloud: ${e.message || e}`));
        }
    }

    // --- Server Login Handler ---
    private async _handleServerLogin(product: Product, inputs: InputBox[]) {
        try {
            const baseUrl = new URL(inputs[OnboardingInputBoxStep.Domain].value);
            const username = inputs[OnboardingInputBoxStep.Username].value;
            const password = inputs[OnboardingInputBoxStep.Password].value;

            if (!baseUrl || !username || !password) {
                return;
            }

            inputs[OnboardingInputBoxStep.Password].busy = true;

            const siteInfo = {
                host: baseUrl.host,
                protocol: baseUrl.protocol,
                product,
            } as SiteInfo;

            const authInfo = {
                username,
                password,
            } as BasicAuthInfo;

            this._fireAuthenticateButtonEvent(siteInfo, false);

            await Container.loginManager.userInitiatedServerLogin(siteInfo, authInfo, true, this.id);
        } catch (e) {
            throw Error(`Failed to authenticate with ${product.name} server: ${e.message || e}`);
        }
    }

    private _fireAuthenticateButtonEvent(siteInfo: SiteInfo, isCloud: boolean, isSkip: boolean = false) {
        authenticateButtonEvent(this.id, siteInfo, isCloud, this._getIsRemote(), this._getIsWebUi(), isSkip).then(
            (e) => {
                this._analyticsClient.sendUIEvent(e);
            },
        );
    }

    private _fireViewScreenEvent() {
        viewScreenEvent(this.id).then((e) => {
            this._analyticsClient.sendScreenEvent(e);
        });
    }
}

export default OnboardingProvider;
