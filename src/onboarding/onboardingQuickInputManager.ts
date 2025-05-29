import { env, InputBox, QuickInputButton, QuickInputButtons, Uri, window } from 'vscode';

import { Product, ProductJira } from '../atlclients/authInfo';
import { isValidUrl } from '../webviews/components/fieldValidators';
import { OnboardingButtons, onboardingHelperText, OnboardingInputBoxStep, OnboardingStep } from './utils';

class OnboardingQuickInputManager {
    private _quickInput: InputBox[];

    private _state: {
        product?: Product;
        env?: string;
    } = {
        product: undefined,
        env: undefined,
    };

    private _handleBack: (step: OnboardingStep) => void;
    private _handleNext: (step: OnboardingStep) => void;
    private _handleError: (message: string, error?: Error) => void;
    private _handleServerLogin: (product: Product, inputs: InputBox[]) => Promise<void>;

    constructor(
        _handleBack: (step: OnboardingStep) => void,
        _handleNext: (step: OnboardingStep) => void,
        _handleError: (message: string, error?: Error) => void,
        _handleServerLogin: (product: Product, inputs: InputBox[]) => Promise<void>,
    ) {
        this._quickInput = [];

        this._handleBack = _handleBack;
        this._handleNext = _handleNext;
        this._handleError = _handleError;
        this._handleServerLogin = _handleServerLogin;

        this._initialize();
    }

    private _initialize() {
        this._quickInput = Array.from({ length: 3 }, (_, i) => {
            const input = window.createInputBox();
            input.totalSteps = 3;
            input.step = i + 1;
            input.ignoreFocusOut = true;
            input.buttons = [QuickInputButtons.Back];
            input.onDidTriggerButton((e) => this._quickInputOnDidTriggerButton(e, i));
            input.onDidAccept(() => this._onDidInputAccept(i));
            return input;
        });
    }

    start(product: Product, env: string) {
        if (!this._quickInput || this._quickInput.length === 0) {
            return;
        }

        this._state.product = product;
        this._state.env = env;

        this._resetServerInputValues();

        this._handleServerLoginSteps(OnboardingInputBoxStep.Domain);
    }

    private _show(step: OnboardingInputBoxStep) {
        const input = this._quickInput[step];
        input.show();
    }

    private _hideInput(step: OnboardingInputBoxStep) {
        const input = this._quickInput[step];
        input.hide();
    }

    private _next(step: OnboardingInputBoxStep) {
        this._hideInput(step);
        this._quickInput[step].validationMessage = undefined;

        if (step === OnboardingInputBoxStep.Password) {
            const mainStep = this._state.product === ProductJira ? OnboardingStep.Jira : OnboardingStep.Bitbucket;
            this._resetServerInputValues();
            this._handleNext(mainStep);
        } else {
            this._handleServerLoginSteps(step + 1);
        }
    }

    private _back(step: OnboardingInputBoxStep) {
        this._hideInput(step);
        this._quickInput[step].validationMessage = undefined;

        if (step === OnboardingInputBoxStep.Domain) {
            const mainStep = this._state.product === ProductJira ? OnboardingStep.Jira : OnboardingStep.Bitbucket;
            this._handleBack(mainStep);
        } else {
            this._handleServerLoginSteps(step - 1);
        }
    }

    private async _onDidInputAccept(step: OnboardingInputBoxStep) {
        const quickInput = this._quickInput[step];

        if (!quickInput || !this._state.product || !this._state.env) {
            return;
        }

        switch (step) {
            case OnboardingInputBoxStep.Domain:
                if (!isValidUrl(quickInput.value)) {
                    quickInput.validationMessage = 'Please enter a valid URL';
                    return;
                }

                this._next(step);
                break;

            case OnboardingInputBoxStep.Username:
                if (!quickInput.value || quickInput.value.trim() === '') {
                    quickInput.validationMessage = 'Please enter a username';
                    return;
                }

                this._next(step);

                break;

            case OnboardingInputBoxStep.Password:
                const jiraCloudRemoteLogin = this._state.product === ProductJira && this._state.env === 'Cloud';

                if (!quickInput.value || quickInput.value.trim() === '') {
                    quickInput.validationMessage = jiraCloudRemoteLogin
                        ? 'Please enter an API token'
                        : 'Please enter a password';
                    return;
                }

                await this._handleServerLogin(this._state.product, this._quickInput)
                    .then(() => {
                        quickInput.busy = false;

                        this._next(step);
                    })
                    .catch((e) => {
                        quickInput.busy = false;

                        quickInput.validationMessage = e.message || 'Login failed';

                        const errorMessage = e.message || 'Failed to authenticate with server';

                        this._handleError(errorMessage, e);
                    });
                break;
        }
    }

    // --- QuickInput Button Handler ---
    private _quickInputOnDidTriggerButton(e: QuickInputButton, step: OnboardingInputBoxStep) {
        this._quickInput[step].validationMessage = undefined;

        if (e === QuickInputButtons.Back) {
            this._quickInput[step].value = '';

            switch (step) {
                case OnboardingInputBoxStep.Domain:
                    this._back(step);
                    break;
                case OnboardingInputBoxStep.Username:
                    this._back(step);
                    break;
                case OnboardingInputBoxStep.Password:
                    this._back(step);
                    break;
                default:
                    break;
            }
        } else if (e === OnboardingButtons.createApiToken) {
            this._handleOpenCreateApiToken();
        }
    }

    private async _handleServerLoginSteps(step: OnboardingInputBoxStep) {
        if (!this._state.product || !this._state.env || !this._quickInput || this._quickInput.length === 0) {
            return;
        }

        const product = this._state.product;
        const env = this._state.env;

        switch (step) {
            case OnboardingInputBoxStep.Domain: // Input server URL
                this._quickInput[step].prompt = onboardingHelperText(product, env);
                this._quickInput[step].placeholder = 'Enter your site URL';
                this._quickInput[step].title = `Enter your ${product.name} ${env} URL`;

                this._show(OnboardingInputBoxStep.Domain);

                break;

            case OnboardingInputBoxStep.Username: // Input username
                this._quickInput[step].prompt = 'Enter your username';
                this._quickInput[step].placeholder = 'Enter your username';
                this._quickInput[step].title = `Enter your ${product.name} ${env} username`;

                this._show(OnboardingInputBoxStep.Username);
                break;

            case OnboardingInputBoxStep.Password: // Input password
                this._quickInput[step].password = true;
                this._quickInput[step].title = `Enter your ${product.name} ${env} password`;

                // Jira cloud remote login
                if (product === ProductJira && env === 'Cloud') {
                    this._quickInput[step].prompt = 'Use an API token to connect.';
                    this._quickInput[step].placeholder =
                        'Enter your API token. Click the key button above to create one.';
                    this._quickInput[step].buttons = [QuickInputButtons.Back, OnboardingButtons.createApiToken];
                } else {
                    this._quickInput[step].prompt = 'Enter your password';
                    this._quickInput[step].placeholder = 'Enter your password';
                }

                this._show(OnboardingInputBoxStep.Password);
                break;

            default:
                break;
        }
    }
    // --- Helpers ---
    private _resetServerInputValues() {
        this._quickInput.forEach((input) => {
            input.value = '';
            input.validationMessage = undefined;
        });
    }

    private _handleOpenCreateApiToken() {
        env.openExternal(Uri.parse('https://id.atlassian.com/manage-profile/security/api-tokens'));
    }
}

export default OnboardingQuickInputManager;
