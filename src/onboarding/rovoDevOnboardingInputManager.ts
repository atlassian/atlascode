import { commands, env, InputBox, QuickInputButton, QuickInputButtons, Uri, window } from 'vscode';

import { Commands } from '../constants';
import { validateEmail } from '../webviews/components/fieldValidators';
import { OnboardingButtons } from './utils';

const TOKEN_URL =
    'https://id.atlassian.com/manage-profile/security/api-tokens?autofillToken&expiryDays=max&appId=rovodev&selectedScopes=all';

export type RovoDevOnboardingSubmitArgs = { token: string; siteUrl: string; email: string };

class RovoDevOnboardingInputManager {
    private _tokenInput: InputBox;
    private _siteUrlInput: InputBox;
    private _emailInput: InputBox;
    private _tokenValue: string = '';
    private _emailValue: string = '';
    private _siteUrlValue: string = '';
    private _transitioningToEmail: boolean = false;
    private _transitioningToSiteUrl: boolean = false;
    private _transitioningToToken: boolean = false;
    private _submitting: boolean = false;
    private _onBack: () => void;
    private _onSubmit: (args: RovoDevOnboardingSubmitArgs) => void | Promise<void>;

    constructor(onBack: () => void, onSubmit: (args: RovoDevOnboardingSubmitArgs) => void | Promise<void>) {
        this._onBack = onBack;
        this._onSubmit = onSubmit;

        this._tokenInput = window.createInputBox();
        this._siteUrlInput = window.createInputBox();
        this._emailInput = window.createInputBox();

        this._tokenInput.ignoreFocusOut = true;
        this._tokenInput.buttons = [
            QuickInputButtons.Back,
            OnboardingButtons.createApiToken,
            OnboardingButtons.settings,
            OnboardingButtons.dismiss,
        ];
        this._tokenInput.onDidAccept(() => this._onTokenAccept());
        this._tokenInput.onDidTriggerButton((e) => this._onTokenButton(e));
        this._tokenInput.onDidHide(() => {
            if (!this._transitioningToEmail) {
                this._onBack();
            }
            this._transitioningToEmail = false;
        });

        this._emailInput.ignoreFocusOut = true;
        this._emailInput.totalSteps = 3;
        this._emailInput.step = 2;
        this._emailInput.buttons = [QuickInputButtons.Back, OnboardingButtons.settings, OnboardingButtons.dismiss];
        this._emailInput.onDidAccept(() => this._onEmailAccept());
        this._emailInput.onDidTriggerButton((e) => this._onEmailButton(e));
        this._emailInput.onDidHide(() => {
            if (!this._transitioningToSiteUrl && !this._transitioningToToken) {
                this._tokenValue = '';
                this._emailValue = '';
                this._siteUrlValue = '';
                this._onBack();
            }
            this._transitioningToSiteUrl = false;
            this._transitioningToToken = false;
        });

        this._siteUrlInput.ignoreFocusOut = true;
        this._siteUrlInput.totalSteps = 3;
        this._siteUrlInput.step = 3;
        this._siteUrlInput.buttons = [QuickInputButtons.Back, OnboardingButtons.settings, OnboardingButtons.dismiss];
        this._siteUrlInput.onDidAccept(() => this._onSiteUrlAccept());
        this._siteUrlInput.onDidTriggerButton((e) => this._onSiteUrlButton(e));
        this._siteUrlInput.onDidHide(() => {
            if (!this._transitioningToEmail && !this._submitting) {
                this._tokenValue = '';
                this._emailValue = '';
                this._siteUrlValue = '';
                this._onBack();
            }
            this._transitioningToEmail = false;
            this._submitting = false;
        });
    }

    start() {
        this._tokenValue = '';
        this._emailValue = '';
        this._siteUrlValue = '';
        this._tokenInput.value = '';
        this._tokenInput.validationMessage = undefined;
        this._tokenInput.title = 'Setup Atlascode';
        this._tokenInput.placeholder = 'Enter your token';
        this._tokenInput.prompt = `Create a token at [id.atlassian.com](${TOKEN_URL}) to get the full power of Atlassian complete with Rovo Dev AI coding capabilities and MCP connections.`;
        this._tokenInput.password = true;
        this._tokenInput.show();
    }

    hide() {
        this._tokenInput.hide();
        this._emailInput.hide();
        this._siteUrlInput.hide();
        this._tokenValue = '';
        this._emailValue = '';
        this._siteUrlValue = '';
    }

    private _showTokenStep() {
        this._emailInput.hide();
        this._siteUrlInput.hide();
        this._emailInput.value = '';
        this._siteUrlInput.value = '';
        this._tokenInput.value = this._tokenValue;
        this._tokenInput.password = true;
        this._tokenInput.show();
    }

    private _showEmailStep() {
        this._tokenInput.hide();
        this._siteUrlInput.hide();
        this._emailInput.value = this._emailValue;
        this._emailInput.validationMessage = undefined;
        this._emailInput.title = 'Setup Atlascode';
        this._emailInput.placeholder = 'Enter your email';
        this._emailInput.prompt = 'Enter the email address for your Atlassian account.';
        this._emailInput.password = false;
        this._emailInput.show();
    }

    private _showSiteUrlStep() {
        this._tokenInput.hide();
        this._emailInput.hide();
        this._siteUrlInput.value = this._siteUrlValue;
        this._siteUrlInput.validationMessage = undefined;
        this._siteUrlInput.title = 'Setup Atlascode';
        this._siteUrlInput.placeholder = 'Enter your site URL';
        this._siteUrlInput.prompt =
            'For users with a custom site. The URL is usually a custom domain or IP address set up by your organization';
        this._siteUrlInput.password = false;
        this._siteUrlInput.show();
    }

    private _onTokenAccept() {
        const token = this._tokenInput.value?.trim();
        if (!token) {
            this._onBack();
            return;
        }
        this._tokenValue = token;
        this._transitioningToEmail = true;
        this._tokenInput.hide();
        this._showEmailStep();
    }

    private _onTokenButton(e: QuickInputButton) {
        if (e === QuickInputButtons.Back || e === OnboardingButtons.dismiss) {
            this._tokenInput.hide();
            this._tokenValue = '';
            this._onBack();
        } else if (e === OnboardingButtons.createApiToken) {
            env.openExternal(Uri.parse(TOKEN_URL));
        } else if (e === OnboardingButtons.settings) {
            this._tokenInput.hide();
            this._tokenValue = '';
            commands.executeCommand(Commands.OpenNativeSettings);
            this._onBack();
        }
    }

    private _onEmailAccept() {
        const email = this._emailInput.value?.trim();
        const emailError = validateEmail(email ?? '');
        if (emailError) {
            this._emailInput.validationMessage = 'Please enter a valid email address';
            return;
        }
        this._emailValue = email;
        this._transitioningToSiteUrl = true;
        this._emailInput.hide();
        this._showSiteUrlStep();
    }

    private _onEmailButton(e: QuickInputButton) {
        if (e === QuickInputButtons.Back) {
            this._transitioningToToken = true;
            this._emailInput.hide();
            this._showTokenStep();
        } else if (e === OnboardingButtons.dismiss || e === OnboardingButtons.settings) {
            this._emailInput.hide();
            this._tokenValue = '';
            this._emailValue = '';
            this._siteUrlValue = '';
            if (e === OnboardingButtons.settings) {
                commands.executeCommand(Commands.OpenNativeSettings);
            }
            this._onBack();
        }
    }

    private async _onSiteUrlAccept() {
        const raw = this._siteUrlInput.value?.trim() ?? '';
        const normalized = raw
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
            .trim();
        if (!normalized) {
            this._siteUrlInput.validationMessage = 'Please enter your site (e.g. yoursite.atlassian.net)';
            return;
        }
        if (!normalized.endsWith('.atlassian.net')) {
            this._siteUrlInput.validationMessage = 'Site must be an Atlassian Cloud URL (*.atlassian.net)';
            return;
        }
        this._siteUrlValue = normalized;
        if (this._tokenValue && this._emailValue) {
            this._siteUrlInput.validationMessage = undefined;
            this._siteUrlInput.busy = true;
            this._submitting = true;
            const args: RovoDevOnboardingSubmitArgs = {
                token: this._tokenValue,
                siteUrl: this._siteUrlValue,
                email: this._emailValue,
            };
            try {
                await Promise.resolve(this._onSubmit(args));
                this._siteUrlInput.hide();
                this._tokenValue = '';
                this._emailValue = '';
                this._siteUrlValue = '';
            } catch (e) {
                this._submitting = false;
                this._siteUrlInput.busy = false;
                this._siteUrlInput.validationMessage =
                    e instanceof Error ? e.message : 'Login failed. Please check your credentials and try again.';
            }
            return;
        }
        this._tokenValue = '';
        this._emailValue = '';
        this._siteUrlValue = '';
        this._onBack();
    }

    private _onSiteUrlButton(e: QuickInputButton) {
        if (e === QuickInputButtons.Back) {
            this._transitioningToEmail = true;
            this._siteUrlInput.hide();
            this._showEmailStep();
        } else if (e === OnboardingButtons.dismiss || e === OnboardingButtons.settings) {
            this._siteUrlInput.hide();
            this._tokenValue = '';
            this._emailValue = '';
            this._siteUrlValue = '';
            if (e === OnboardingButtons.settings) {
                commands.executeCommand(Commands.OpenNativeSettings);
            }
            this._onBack();
        }
    }
}

export default RovoDevOnboardingInputManager;
