// @ts-nocheck

import { commands, QuickInputButtons, QuickPick, window } from 'vscode';

import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import OnboardingQuickPickManager from './onboardingQuickPickManager';
import { OnboardingButtons, OnboardingQuickPickItem, OnboardingStep } from './utils';

jest.mock('vscode', () => {
    return {
        window: {
            createQuickPick: jest.fn(),
        },
        commands: {
            executeCommand: jest.fn(),
        },
        QuickInputButtons: {
            Back: { id: 'back' },
        },
        ThemeIcon: jest.fn((id: string) => ({ id })),
    };
});

jest.mock('../commands', () => {
    return {
        Commands: {
            ShowJiraAuth: 'atlascode.showJiraAuth',
            ShowBitbucketAuth: 'atlascode.showBitbucketAuth',
        },
    };
});

import { Commands } from '../commands';

describe('OnboardingQuickPickManager', () => {
    let quickPickMock: jest.Mocked<QuickPick<OnboardingQuickPickItem>>;
    let items: OnboardingQuickPickItem[];
    let onAccept: jest.Mock;
    let onBack: jest.Mock;

    beforeEach(() => {
        items = [
            { label: 'Item 1', onboardingId: 'id1' },
            { label: 'Item 2', onboardingId: 'id2' },
        ];
        onAccept = jest.fn();
        onBack = jest.fn();

        quickPickMock = {
            onDidAccept: jest.fn(),
            onDidTriggerButton: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            items: [],
            title: '',
            ignoreFocusOut: false,
            totalSteps: 0,
            activeItems: [],
            step: 0,
            buttons: [],
            placeholder: '',
            busy: false,
        } as any;

        (window.createQuickPick as jest.Mock).mockReturnValue(quickPickMock);
        (commands.executeCommand as jest.Mock).mockClear();
    });

    it('should initialize and show quick pick for Jira', () => {
        const manager = new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);
        manager.show();

        expect(quickPickMock.title).toBe('Setup Jira & Bitbucket');
        expect(quickPickMock.ignoreFocusOut).toBe(true);
        expect(quickPickMock.items).toBe(items);
        expect(quickPickMock.totalSteps).toBe(2);
        expect(quickPickMock.activeItems).toEqual([items[0]]);
        expect(quickPickMock.step).toBe(OnboardingStep.Jira);
        expect(quickPickMock.buttons).toEqual([OnboardingButtons.settings]);
        expect(quickPickMock.placeholder).toBe(
            'Select your Jira site type. For more advanced options, click on the gear button.',
        );
        expect(quickPickMock.show).toHaveBeenCalled();
    });

    it('should initialize and show quick pick for Bitbucket', () => {
        const manager = new OnboardingQuickPickManager(items, ProductBitbucket, onAccept, onBack);
        manager.show();

        expect(quickPickMock.step).toBe(OnboardingStep.Bitbucket);
        expect(quickPickMock.buttons).toEqual([QuickInputButtons.Back, OnboardingButtons.settings]);
        expect(quickPickMock.placeholder).toBe(
            'Select your Bitbucket site type. For more advanced options, click on the gear button.',
        );
        expect(quickPickMock.show).toHaveBeenCalled();
    });

    it('should call onAccept when item is accepted', () => {
        new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);

        // Simulate onDidAccept registration and trigger
        const acceptHandler = (quickPickMock.onDidAccept as jest.Mock).mock.calls[0][0];
        quickPickMock.activeItems = [items[1]];
        acceptHandler();

        expect(onAccept).toHaveBeenCalledWith(items[1], ProductJira);
    });

    it('should not call onAccept if no active items', () => {
        new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);

        const acceptHandler = (quickPickMock.onDidAccept as jest.Mock).mock.calls[0][0];
        quickPickMock.activeItems = [];
        acceptHandler();

        expect(onAccept).not.toHaveBeenCalled();
    });

    it('should hide quick pick', () => {
        const manager = new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);
        manager.hide();
        expect(quickPickMock.hide).toHaveBeenCalled();
    });

    it('should set busy state', () => {
        const manager = new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);
        manager.setBusy(true);
        expect(quickPickMock.busy).toBe(true);
        manager.setBusy(false);
        expect(quickPickMock.busy).toBe(false);
    });

    it('should handle settings button', () => {
        const manager = new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);
        quickPickMock.step = OnboardingStep.Jira;

        manager._quickPickOnDidTriggerButton(OnboardingButtons.settings);

        expect(commands.executeCommand).toHaveBeenCalledWith(Commands.ShowJiraAuth);
        expect(quickPickMock.hide).toHaveBeenCalled();
    });

    it('should handle back button for Bitbucket', () => {
        const manager = new OnboardingQuickPickManager(items, ProductBitbucket, onAccept, onBack);

        manager._quickPickOnDidTriggerButton(QuickInputButtons.Back);

        expect(onBack).toHaveBeenCalledWith(OnboardingStep.Bitbucket);
    });

    it('should not handle back button if onBack is not provided', () => {
        const manager = new OnboardingQuickPickManager(items, ProductBitbucket, onAccept);

        expect(() => {
            manager._quickPickOnDidTriggerButton(QuickInputButtons.Back);
        }).not.toThrow();
    });

    it('should not execute command if step is invalid', () => {
        const manager = new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);
        quickPickMock.step = -1;

        manager._quickPickOnDidTriggerButton(OnboardingButtons.settings);

        expect(commands.executeCommand).not.toHaveBeenCalled();
    });

    it('should return correct product', () => {
        const manager = new OnboardingQuickPickManager(items, ProductJira, onAccept, onBack);
        expect(manager.product).toBe(ProductJira);
    });
});
