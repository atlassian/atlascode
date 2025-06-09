// @ts-nocheck

import { env, QuickInputButtons, window } from 'vscode';

import { ProductJira } from '../atlclients/authInfo';
import OnboardingQuickInputManager from './onboardingQuickInputManager';
import { OnboardingButtons, OnboardingStep } from './utils';

jest.mock('vscode', () => {
    return {
        window: {
            createInputBox: jest.fn(),
        },
        env: {
            openExternal: jest.fn(),
        },
        Uri: {
            parse: jest.fn((url: string) => url),
        },
        ThemeIcon: jest.fn((id: string) => ({ id })),
        QuickInputButtons: {
            Back: { iconPath: 'back', tooltip: 'Back' },
        },
    };
});

const mockInputBox = (i: number) => ({
    value: '',
    validationMessage: undefined,
    placeholder: '',
    title: '',
    step: i,
    password: false,
    show: jest.fn(),
    hide: jest.fn(),
    onDidTriggerButton: jest.fn(),
    onDidAccept: jest.fn(),
});

describe('OnboardingQuickInputManager', () => {
    let handleBack: jest.Mock;
    let handleNext: jest.Mock;
    let handleError: jest.Mock;
    let handleServerLogin: jest.Mock;
    let inputBoxes: any[];
    let acceptHandler: any;
    let triggerButtonHandler: any;

    beforeEach(() => {
        handleBack = jest.fn();
        handleNext = jest.fn();
        handleError = jest.fn();
        handleServerLogin = jest.fn(() => Promise.resolve());
        acceptHandler = jest.fn();
        triggerButtonHandler = jest.fn();

        inputBoxes = [mockInputBox(1), mockInputBox(2), mockInputBox(3)];
        (window.createInputBox as jest.Mock).mockImplementation(() => inputBoxes.shift());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize input boxes on construction', () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        expect(window.createInputBox).toHaveBeenCalledTimes(3);
        expect(manager._quickInput.length).toBe(3);
    });

    it('should start onboarding and show domain input', () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        manager.start(ProductJira, 'Cloud');
        expect(manager._quickInput[0].placeholder).toBe('Enter your site URL');
        expect(manager._quickInput[0].title).toBe('Enter your Jira Cloud URL');
        expect(manager._quickInput[0].show).toHaveBeenCalled();
    });

    it('should validate domain input and show error if invalid', async () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        const acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Cloud');
        manager._quickInput[0].value = 'invalid-url';

        acceptHandler();
        expect(manager._quickInput[0].validationMessage).toBe('Please enter a valid URL');
    });

    it('should proceed to username step if domain is valid', async () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        const acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Cloud');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        expect(manager._quickInput[0].hide).toHaveBeenCalled();
        expect(manager._quickInput[1].placeholder).toBe('Enter your username');
        expect(manager._quickInput[1].title).toBe('Enter your Jira Cloud username');
        expect(manager._quickInput[1].show).toHaveBeenCalled();
    });

    it('should validate username input and show error if empty', async () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Cloud');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        acceptHandler = (manager._quickInput[1].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[1].value = '';

        acceptHandler();

        expect(manager._quickInput[1].validationMessage).toBe('Please enter a username');
    });

    it('should proceed to password step if username is valid', async () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Server');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        acceptHandler = (manager._quickInput[1].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[1].value = 'user';

        acceptHandler();

        expect(manager._quickInput[1].hide).toHaveBeenCalled();
        expect(manager._quickInput[2].placeholder).toBe('Enter your password');
        expect(manager._quickInput[2].title).toBe('Enter your Jira Server password');
        expect(manager._quickInput[2].password).toBe(true);
        expect(manager._quickInput[2].show).toHaveBeenCalled();
    });

    it('should ask for API token if product is Jira Cloud', async () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Cloud');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        acceptHandler = (manager._quickInput[1].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[1].value = 'user';

        acceptHandler();

        expect(manager._quickInput[2].placeholder).toBe(
            'Enter your API token. Click the key button above to create one.',
        );
        expect(manager._quickInput[2].title).toBe('Enter your Jira Cloud password');
        expect(manager._quickInput[2].buttons).toContain(OnboardingButtons.createApiToken);
        expect(manager._quickInput[2].prompt).toBe('Use an API token to connect.');
        expect(manager._quickInput[2].password).toBe(true);
        expect(manager._quickInput[2].show).toHaveBeenCalled();
    });

    it('should validate password input and show error if empty', async () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Server');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        acceptHandler = (manager._quickInput[1].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[1].value = 'user';

        acceptHandler();

        acceptHandler = (manager._quickInput[2].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[2].value = '';

        acceptHandler();
        expect(manager._quickInput[2].validationMessage).toBe('Please enter a password');
    });

    it('should call handleServerLogin on password accept', async () => {
        handleServerLogin.mockResolvedValueOnce(undefined);
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Server');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        acceptHandler = (manager._quickInput[1].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[1].value = 'user';

        acceptHandler();

        acceptHandler = (manager._quickInput[2].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[2].value = 'pass';

        await acceptHandler();

        expect(handleServerLogin).toHaveBeenCalled();
        expect(manager._quickInput[2].hide).toHaveBeenCalled();
        expect(handleNext).toHaveBeenCalledWith(OnboardingStep.Jira);
    });

    it('should handle server login error and show validation message', async () => {
        handleServerLogin.mockRejectedValueOnce(new Error('fail'));
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        acceptHandler = (manager._quickInput[0].onDidAccept as jest.Mock).mock.calls[0][0];

        manager.start(ProductJira, 'Server');
        manager._quickInput[0].value = 'https://valid.url';

        acceptHandler();

        acceptHandler = (manager._quickInput[1].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[1].value = 'user';

        acceptHandler();

        acceptHandler = (manager._quickInput[2].onDidAccept as jest.Mock).mock.calls[0][0];
        manager._quickInput[2].value = 'pass';

        await acceptHandler();

        expect(handleError).toHaveBeenCalledWith('fail', expect.any(Error));
    });

    it('should handle back button on domain step', () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        triggerButtonHandler = (e: QuickInputButtons) =>
            (manager._quickInput[0].onDidTriggerButton as jest.Mock).mock.calls[0][0](e);

        manager.start(ProductJira, 'Cloud');

        triggerButtonHandler(QuickInputButtons.Back);

        expect(handleBack).toHaveBeenCalledWith(OnboardingStep.Jira);
    });

    it('should handle back button on username step', () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        triggerButtonHandler = (e: QuickInputButtons) =>
            (manager._quickInput[1].onDidTriggerButton as jest.Mock).mock.calls[0][0](e);
        manager.start(ProductJira, 'Cloud');

        triggerButtonHandler(QuickInputButtons.Back);

        expect(manager._quickInput[1].hide).toHaveBeenCalled();
        expect(manager._quickInput[0].show).toHaveBeenCalled();
    });

    it('should handle back button on password step', () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        triggerButtonHandler = (e: QuickInputButtons) =>
            (manager._quickInput[2].onDidTriggerButton as jest.Mock).mock.calls[0][0](e);
        manager.start(ProductJira, 'Cloud');

        triggerButtonHandler(QuickInputButtons.Back);

        expect(manager._quickInput[2].hide).toHaveBeenCalled();
        expect(manager._quickInput[1].show).toHaveBeenCalled();
    });

    it('should open API token link when createApiToken button is clicked', () => {
        const manager = new OnboardingQuickInputManager(handleBack, handleNext, handleError, handleServerLogin);
        triggerButtonHandler = (e: QuickInputButtons) =>
            (manager._quickInput[2].onDidTriggerButton as jest.Mock).mock.calls[0][0](e);
        manager.start(ProductJira, 'Cloud');

        triggerButtonHandler(OnboardingButtons.createApiToken);

        expect(env.openExternal).toHaveBeenCalledWith('https://id.atlassian.com/manage-profile/security/api-tokens');
    });
});
