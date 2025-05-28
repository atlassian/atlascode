// @ts-nocheck

jest.mock('vscode', () => {
    return {
        window: {
            createQuickPick: jest.fn(() => ({
                show: jest.fn(),
                hide: jest.fn(),
                onDidTriggerButton: jest.fn(),
                onDidAccept: jest.fn(),
                items: [],
                activeItems: [],
                buttons: [],
                step: 1,
                totalSteps: 2,
                ignoreFocusOut: true,
                placeholder: '',
                title: '',
                busy: false,
            })),
            createInputBox: jest.fn(() => ({
                show: jest.fn(),
                hide: jest.fn(),
                onDidTriggerButton: jest.fn(),
                onDidAccept: jest.fn(),
                value: '',
                prompt: '',
                placeholder: '',
                title: '',
                busy: false,
                password: false,
                validationMessage: undefined,
                buttons: [{ iconPath: 'back', tooltip: 'Back' }],
                step: 1,
                totalSteps: 3,
                ignoreFocusOut: true,
            })),
            showErrorMessage: jest.fn(),
        },
        commands: {
            executeCommand: jest.fn(),
        },
        env: {
            remoteName: undefined,
            uiKind: 1,
            openExternal: jest.fn(),
        },
        ThemeIcon: jest.fn((id: string) => ({ id })),
        QuickInputButtons: {
            Back: { iconPath: 'back', tooltip: 'Back' },
        },
        Uri: {
            parse: jest.fn((url: string) => ({ url })),
        },
        Disposable: jest.fn(),
        UIKind: {
            Desktop: 1,
            Web: 2,
            Remote: 3,
        },
    };
});

jest.mock('../commands', () => ({
    Commands: {
        RefreshAssignedWorkItemsExplorer: 'RefreshAssignedWorkItemsExplorer',
        RefreshCustomJqlExplorer: 'RefreshCustomJqlExplorer',
        BitbucketRefreshPullRequests: 'BitbucketRefreshPullRequests',
        RefreshPipelines: 'RefreshPipelines',
    },
}));

jest.mock('../uriHandler/atlascodeUriHandler', () => ({
    AtlascodeUriHandler: jest.fn(),
}));

import { commands, env } from 'vscode';

import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { EXTENSION_URL } from '../uriHandler/atlascodeUriHandler';
import OnboardingProvider from './onboardingProvider';

jest.mock('../container', () => ({
    Container: {
        analyticsClient: {
            sendScreenEvent: jest.fn(),
            sendUIEvent: jest.fn(),
            sendTrackEvent: jest.fn(),
        },
        loginManager: {
            userInitiatedOAuthLogin: jest.fn(() => Promise.resolve()),
            userInitiatedServerLogin: jest.fn(() => Promise.resolve()),
        },
        focus: jest.fn(),
    },
}));

jest.mock('../analytics', () => ({
    authenticateButtonEvent: jest.fn(() => Promise.resolve({})),
    errorEvent: jest.fn(() => Promise.resolve({})),
    viewScreenEvent: jest.fn(() => Promise.resolve({})),
}));

jest.mock('./utils', () => ({
    jiraOnboardingItems: [
        { label: 'Jira Cloud', onboardingId: 'onboarding:jira-cloud' },
        { label: 'Jira Server', onboardingId: 'onboarding:jira-server' },
        { label: 'Skip', onboardingId: 'onboarding:jira-skip' },
    ],
    bitbucketOnboardingItems: [
        { label: 'Bitbucket Cloud', onboardingId: 'onboarding:bitbucket-cloud' },
        { label: 'Bitbucket Server', onboardingId: 'onboarding:bitbucket-server' },
        { label: 'Skip', onboardingId: 'onboarding:bitbucket-skip' },
    ],
    OnboardingButtons: {
        settings: { iconPath: 'settings', tooltip: 'Settings' },
        createApiToken: { iconPath: 'api-token', tooltip: 'Create API Token' },
        back: { iconPath: 'back', tooltip: 'Back' },
    },
}));

describe('OnboardingProvider', () => {
    let provider: OnboardingProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new OnboardingProvider();
    });

    it('should initialize with correct steps and items', () => {
        expect(provider._quickPick.step).toBe(1);
        expect(provider._jiraItems.length).toBeGreaterThan(0);
        expect(provider._bitbucketItems.length).toBeGreaterThan(0);
    });

    it('should show Jira items on step 1', () => {
        provider._quickPick.step = 1;
        provider.show();
        expect(provider._quickPick.items[0].onboardingId).toBe('onboarding:jira-cloud');
    });

    it('should show Bitbucket items on step 2', () => {
        provider._quickPick.step = 2;
        provider.show();
        expect(provider._quickPick.items[0].onboardingId).toBe('onboarding:bitbucket-cloud');
    });

    it('should call commands on handleNext for step 1', () => {
        provider._quickPick.step = 1;
        provider._handleNext();
        expect(commands.executeCommand).toHaveBeenCalledWith(
            expect.stringContaining('RefreshAssignedWorkItemsExplorer'),
        );
    });

    it('should call commands on handleNext for step 2', () => {
        provider._quickPick.step = 2;
        provider._handleNext();
        expect(commands.executeCommand).toHaveBeenCalledWith(expect.stringContaining('BitbucketRefreshPullRequests'));
    });

    it('should open external link for API token', () => {
        provider._handleOpenCreateApiToken();
        expect(env.openExternal).toHaveBeenCalled();
    });

    it('should reset server input values', () => {
        provider._quickInputServer[0].value = 'foo';
        provider._quickInputServer[1].value = 'bar';
        provider._quickInputServer[2].value = 'baz';
        provider._resetServerInputValues();
        expect(provider._quickInputServer[0].value).toBe('');
        expect(provider._quickInputServer[1].value).toBe('');
        expect(provider._quickInputServer[2].value).toBe('');
    });

    it('should detect remote and web UI', () => {
        expect(provider._getIsRemote()).toBe(false);
        expect(provider._getIsWebUi()).toBe(false);
    });

    it('should call Oauth login on cloud Jira selection', async () => {
        const site = { host: 'atlassian.net', product: ProductJira };
        provider._quickPick.step = 1;
        provider._quickPick.activeItems[0] = provider._jiraItems[0]; // Select Jira Cloud
        await provider._quickPickOnDidAccept();
        expect(Container.loginManager.userInitiatedOAuthLogin).toHaveBeenCalledWith(
            site,
            EXTENSION_URL,
            true,
            'atlascodeOnboardingQuickPick',
        );
    });

    it('should call Oauth login on cloud Bitbucket selection', async () => {
        const site = { host: 'bitbucket.org', product: ProductBitbucket };
        provider._quickPick.step = 2;
        provider._quickPick.activeItems[0] = provider._bitbucketItems[0]; // Select BB Cloud
        await provider._quickPickOnDidAccept();
        expect(Container.loginManager.userInitiatedOAuthLogin).toHaveBeenCalledWith(
            site,
            EXTENSION_URL,
            true,
            'atlascodeOnboardingQuickPick',
        );
    });

    it('should call server login on server selection', async () => {
        provider._quickInputServer[0].value = 'https://jira.mydomain.com';
        provider._quickInputServer[1].value = 'username';
        provider._quickInputServer[2].value = 'password';
        provider._quickInputServer[2].product = ProductJira;
        provider._quickInputServer[2].env = 'Server';

        await provider._onDidInputAccept(2);

        expect(Container.loginManager.userInitiatedServerLogin).toHaveBeenCalledWith(
            {
                host: 'jira.mydomain.com',
                protocol: 'https:',
                product: ProductJira,
            },
            {
                username: 'username',
                password: 'password',
            },
            true,
            'atlascodeOnboardingQuickPick',
        );
    });
});
