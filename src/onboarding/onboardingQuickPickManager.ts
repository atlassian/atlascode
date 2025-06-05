import { commands, QuickInputButton, QuickInputButtons, QuickPick, window } from 'vscode';

import { Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Commands } from '../constants';
import { OnboardingButtons, OnboardingQuickPickItem, OnboardingStep } from './utils';

class OnboardingQuickPickManager {
    private _quickPick: QuickPick<OnboardingQuickPickItem>;
    private _items: OnboardingQuickPickItem[];
    private _product: Product;
    private _onAccept: (item: OnboardingQuickPickItem, product: Product) => void;
    private _onBack?: (step: OnboardingStep) => void;

    constructor(
        _items: OnboardingQuickPickItem[],
        _product: Product,
        _onAccept: (item: OnboardingQuickPickItem, product: Product) => void,
        _onBack?: (step: OnboardingStep) => void,
    ) {
        this._items = _items;
        this._product = _product;
        this._onAccept = _onAccept;
        this._onBack = _onBack;

        this._quickPick = window.createQuickPick<OnboardingQuickPickItem>();
        this._initialize();
    }

    private _initialize() {
        this._quickPick.onDidAccept(() => {
            if (!this._quickPick.activeItems || this._quickPick.activeItems.length === 0) {
                return;
            }
            const selected = this._quickPick.activeItems[0];
            this._onAccept(selected, this._product);
        });
        this._quickPick.onDidTriggerButton(this._quickPickOnDidTriggerButton.bind(this));

        this._resetItems();
    }

    private _resetItems() {
        this._quickPick.ignoreFocusOut = true;
        this._quickPick.items = this._items;
        this._quickPick.totalSteps = 2;
        this._quickPick.activeItems = [this._items[0]];
        this._quickPick.placeholder = 'Type to search. Select settings for advanced options.';
        switch (this.product) {
            case ProductJira: {
                this._quickPick.title = 'Sign in to Jira';
                this._quickPick.step = OnboardingStep.Jira;
                this._quickPick.buttons = [OnboardingButtons.settings];

                break;
            }
            case ProductBitbucket: {
                this._quickPick.title = 'Sign in to Bitbucket';
                this._quickPick.step = OnboardingStep.Bitbucket;
                this._quickPick.buttons = [QuickInputButtons.Back, OnboardingButtons.settings];
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
            if (!this._quickPick.step || this._quickPick.step < 0 || this._quickPick.step > 2) {
                return;
            }

            // Open settings
            if (this._quickPick.step === OnboardingStep.Jira) {
                commands.executeCommand(Commands.ShowJiraAuth);
            } else if (this._quickPick.step === OnboardingStep.Bitbucket) {
                commands.executeCommand(Commands.ShowBitbucketAuth);
            }

            this.hide();
        } else if (e === QuickInputButtons.Back && this._onBack) {
            // Only bb has a back button
            this._onBack(OnboardingStep.Bitbucket);
        }
    }

    get product(): Product {
        return this._product;
    }
}

export default OnboardingQuickPickManager;
