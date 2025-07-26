// @ts-nocheck

jest.mock('vscode', () => {
    return {
        window: {
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

import { window } from 'vscode';

import { ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { EXTENSION_URL } from '../uriHandler/atlascodeUriHandler';
import OnboardingProvider from './onboardingProvider';
import { OnboardingStep } from './utils';

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
    viewScreenEvent: jest.fn((id) => Promise.resolve(id)),
}));

jest.mock('./utils', () => ({
    OnboardingStep: {
        Jira: 1,
        Bitbucket: 2,
    },
    onboardingQuickPickItems: jest.fn(),
}));

jest.mock('./onboardingQuickPickManager', () => {
    return {
        default: jest.fn().mockImplementation(() => ({
            show: jest.fn(),
            hide: jest.fn(),
            setBusy: jest.fn(),
        })),
    };
});

jest.mock('./onboardingQuickInputManager', () => {
    return {
        default: jest.fn().mockImplementation(() => ({
            start: jest.fn(),
        })),
    };
});

jest.mock('../../src/logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('OnboardingProvider', () => {
    let provider: OnboardingProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new OnboardingProvider();
    });

    it('should initialize with correct objects', () => {
        expect(provider).toBeDefined();
        expect(provider._analyticsClient).toBeDefined();
        expect(provider._jiraQuickPickManager).toBeDefined();
        expect(provider._bitbucketQuickPickManager).toBeDefined();
        expect(provider._quickInputManager).toBeDefined();
    });

    it('should show Jira onboarding quick pick on start', () => {
        provider.start();

        expect(Container.focus).toHaveBeenCalled();
        expect(provider._jiraQuickPickManager.show).toHaveBeenCalled();
    });

    it('should handle Jira quick pick accept for cloud', async () => {
        const item = { onboardingId: 'onboarding:cloud' };
        const showSpy = jest.spyOn(provider, '_handleCloud');

        await provider._quickPickOnDidAccept(item, ProductJira);

        expect(showSpy).toHaveBeenCalledWith(ProductJira);
    });

    it('should handle Jira quick pick accept for server', async () => {
        const item = { onboardingId: 'onboarding:server' };

        await provider._quickPickOnDidAccept(item, ProductJira);

        expect(provider._quickInputManager.start).toHaveBeenCalledWith(ProductJira, 'Server');
    });

    it('should handle Jira quick pick accept for skip', async () => {
        const item = { onboardingId: 'onboarding:skip' };
        const skipSpy = jest.spyOn(provider, '_handleSkip');
        await provider._quickPickOnDidAccept(item, ProductJira);

        expect(skipSpy).toHaveBeenCalledWith(ProductJira);
    });

    it('should envoke userInitiatedOAuthLogin on Jira cloud onboarding', async () => {
        const item = { onboardingId: 'onboarding:cloud' };
        const siteInfo = { product: ProductJira, host: 'atlassian.net' };
        const nextSpy = jest.spyOn(provider, '_handleNext');
        await provider._quickPickOnDidAccept(item, ProductJira);

        expect(Container.loginManager.userInitiatedOAuthLogin).toHaveBeenCalledWith(
            siteInfo,
            EXTENSION_URL,
            true,
            'atlascodeOnboardingQuickPick',
        );
        expect(nextSpy).toHaveBeenCalledWith(OnboardingStep.Jira);
    });

    it('should handle error during Jira cloud onboarding', async () => {
        const item = { onboardingId: 'onboarding:cloud' };
        const error = new Error('Test error');
        jest.spyOn(Container.loginManager, 'userInitiatedOAuthLogin').mockRejectedValue(error);

        const returnMessage = 'Failed to authenticate with Jira Cloud: Test error';

        const errorSpy = jest.spyOn(provider, '_handleError');

        provider._quickPickOnDidAccept(item, ProductJira);

        await new Promise(process.nextTick);
        expect(errorSpy).toHaveBeenCalledWith(returnMessage, Error(returnMessage));
        expect(window.showErrorMessage).toHaveBeenCalledWith(returnMessage);
    });
});
