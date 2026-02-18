import { commands, InputBox, QuickInputButton, QuickInputButtons, window } from 'vscode';

import { Commands } from '../constants';
import { isValidUrl } from '../webviews/components/fieldValidators';
import { OnboardingButtons } from './utils';

class RovoDevOnboardingInputManager {
    private _tokenInput: InputBox;
    private _siteUrlInput: InputBox;
    private _tokenValue: string = '';
    private _transitioningToSiteUrl: boolean = false;
    private _transitioningToToken: boolean = false;
    private _onBack: () => void;
    private _onSubmit: (token: string, siteUrl: string) => void;

    constructor(onBack: () => void, onSubmit: (token: string, siteUrl: string) => void) {
        this._onBack = onBack;
        this._onSubmit = onSubmit;

        this._tokenInput = window.createInputBox();
        this._siteUrlInput = window.createInputBox();

        this._tokenInput.ignoreFocusOut = true;
        this._tokenInput.buttons = [QuickInputButtons.Back, OnboardingButtons.settings, OnboardingButtons.dismiss];
        this._tokenInput.onDidAccept(() => this._onTokenAccept());
        this._tokenInput.onDidTriggerButton((e) => this._onTokenButton(e));
        this._tokenInput.onDidHide(() => {
            if (!this._transitioningToSiteUrl) {
                this._onBack();
            }
            this._transitioningToSiteUrl = false;
        });

        this._siteUrlInput.ignoreFocusOut = true;
        this._siteUrlInput.totalSteps = 2;
        this._siteUrlInput.step = 2;
        this._siteUrlInput.buttons = [QuickInputButtons.Back, OnboardingButtons.settings, OnboardingButtons.dismiss];
        this._siteUrlInput.onDidAccept(() => this._onSiteUrlAccept());
        this._siteUrlInput.onDidTriggerButton((e) => this._onSiteUrlButton(e));
        this._siteUrlInput.onDidHide(() => {
            if (!this._transitioningToToken) {
                this._tokenValue = '';
                this._onBack();
            }
            this._transitioningToToken = false;
        });
    }

    start() {
        this._tokenValue = '';
        this._tokenInput.value = '';
        this._tokenInput.validationMessage = undefined;
        this._tokenInput.title = 'Setup Atlascode';
        this._tokenInput.placeholder = 'Enter your token';
        this._tokenInput.prompt =
            'Create a token at atlassian.token.com to get the full power of Atlassian complete with Rovo Dev AI coding capabilities and MCP connections.';
        this._tokenInput.password = false;
        this._tokenInput.show();
    }

    hide() {
        this._tokenInput.hide();
        this._siteUrlInput.hide();
        this._tokenValue = '';
    }

    private _showTokenStep() {
        this._siteUrlInput.hide();
        this._siteUrlInput.value = '';
        this._tokenInput.value = this._tokenValue;
        this._tokenInput.show();
    }

    private _showSiteUrlStep() {
        this._tokenInput.hide();
        this._siteUrlInput.value = '';
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
        this._transitioningToSiteUrl = true;
        this._tokenInput.hide();
        this._showSiteUrlStep();
    }

    private _onTokenButton(e: QuickInputButton) {
        if (e === QuickInputButtons.Back || e === OnboardingButtons.dismiss) {
            this._tokenInput.hide();
            this._tokenValue = '';
            this._onBack();
        } else if (e === OnboardingButtons.settings) {
            this._tokenInput.hide();
            this._tokenValue = '';
            commands.executeCommand(Commands.OpenNativeSettings);
            this._onBack();
        }
    }

    private _onSiteUrlAccept() {
        if (!isValidUrl(this._siteUrlInput.value)) {
            this._siteUrlInput.validationMessage = 'Please enter a valid URL';
            return;
        }
        const siteUrl = this._siteUrlInput.value?.trim() ?? '';
        this._siteUrlInput.hide();
        if (this._tokenValue) {
            this._onSubmit(this._tokenValue, siteUrl);
        }
        this._tokenValue = '';
        this._onBack();
    }

    private _onSiteUrlButton(e: QuickInputButton) {
        if (e === QuickInputButtons.Back) {
            this._transitioningToToken = true;
            this._siteUrlInput.hide();
            this._showTokenStep();
        } else if (e === OnboardingButtons.dismiss || e === OnboardingButtons.settings) {
            this._siteUrlInput.hide();
            this._tokenValue = '';
            if (e === OnboardingButtons.settings) {
                commands.executeCommand(Commands.OpenNativeSettings);
            }
            this._onBack();
        }
    }
}

export default RovoDevOnboardingInputManager;
