import { commands, QuickInputButton, QuickInputButtons, QuickPick, window } from 'vscode';

import { Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Commands } from '../constants';
import { OnboardingButtons, OnboardingQuickPickItem, OnboardingStep } from './utils';

export interface OnboardingQuickPickManagerOptions {
    title: string;
    showBackButton: boolean;
    step: OnboardingStep;
}

class OnboardingQuickPickManager {
    private _quickPick: QuickPick<OnboardingQuickPickItem>;
    private _items: OnboardingQuickPickItem[];
    private _product: Product | null;
    private _step: OnboardingStep;
    private _options?: OnboardingQuickPickManagerOptions;
    private _onAccept: (item: OnboardingQuickPickItem, product: Product | null) => void;
    private _onBack?: (step: OnboardingStep) => void;

    constructor(
        _items: OnboardingQuickPickItem[],
        _product: Product | null,
        _onAccept: (item: OnboardingQuickPickItem, product: Product | null) => void,
        _onBack?: (step: OnboardingStep) => void,
        options?: OnboardingQuickPickManagerOptions,
    ) {
        this._items = _items;
        this._product = _product;
        this._options = options;
        this._step = options?.step ?? (_product === ProductJira ? OnboardingStep.Jira : OnboardingStep.Bitbucket);
        this._onAccept = _onAccept;
        this._onBack = _onBack;

        this._quickPick = window.createQuickPick<OnboardingQuickPickItem>();
        this._initialize();
    }

    private _initialize() {
        if (!this._quickPick) {
            return;
        }
        this._quickPick.onDidAccept(() => {
            if (!this._quickPick!.activeItems || this._quickPick!.activeItems.length === 0) {
                return;
            }
            const selected = this._quickPick!.activeItems[0];
            this._onAccept(selected, this._product);
        });
        this._quickPick.onDidTriggerButton(this._quickPickOnDidTriggerButton.bind(this));

        this._resetItems();
    }

    private _resetItems() {
        if (!this._quickPick) {
            return;
        }
        this._quickPick.ignoreFocusOut = true;
        this._quickPick.items = this._items;
        this._quickPick.totalSteps = 2;
        this._quickPick.activeItems = [this._items[0]];
        this._quickPick.placeholder = `What would you like to do first`;

        if (this._options) {
            this._quickPick.title = this._options.title;
            this._quickPick.step = this._options.step;
            this._quickPick.buttons = this._options.showBackButton
                ? [QuickInputButtons.Back, OnboardingButtons.settings, OnboardingButtons.dismiss]
                : [OnboardingButtons.settings, OnboardingButtons.dismiss];
            return;
        }

        switch (this._product) {
            case ProductJira: {
                this._quickPick.title = 'Sign in to Jira';
                this._quickPick.step = OnboardingStep.Jira;
                this._quickPick.buttons = [
                    QuickInputButtons.Back,
                    OnboardingButtons.settings,
                    OnboardingButtons.dismiss,
                ];
                break;
            }
            case ProductBitbucket: {
                this._quickPick.title = 'Sign in to Bitbucket';
                this._quickPick.step = OnboardingStep.Bitbucket;
                this._quickPick.buttons = [
                    QuickInputButtons.Back,
                    OnboardingButtons.settings,
                    OnboardingButtons.dismiss,
                ];
                break;
            }
        }
    }

    show() {
        this._resetItems();
        this._quickPick.show();
    }

    hide() {
        this._quickPick.hide();
    }

    setBusy(busy: boolean) {
        this._quickPick.busy = busy;
    }

    // --- QuickPick Button Handler ---
    private _quickPickOnDidTriggerButton(e: QuickInputButton) {
        if (e === OnboardingButtons.settings) {
            const step = this._quickPick.step;
            if (step === undefined || step < 0 || step > 2) {
                return;
            }
            if (step === OnboardingStep.Jira) {
                commands.executeCommand(Commands.ShowJiraAuth);
            } else if (step === OnboardingStep.Bitbucket) {
                commands.executeCommand(Commands.ShowBitbucketAuth);
            }
            this.hide();
        } else if (e === QuickInputButtons.Back && this._onBack) {
            this._onBack(this._step);
        } else if (e === OnboardingButtons.dismiss) {
            this.hide();
        }
    }

    get product(): Product | null {
        return this._product;
    }
}

export default OnboardingQuickPickManager;
