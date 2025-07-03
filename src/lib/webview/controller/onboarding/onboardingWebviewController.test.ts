import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { WebviewPanel } from 'vscode';

import { isBasicAuthInfo } from '../../../../atlclients/authInfo';
import { configuration } from '../../../../config/configuration';
import { Container } from '../../../../container';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { OnboardingActionType } from '../../../ipc/fromUI/onboarding';
import { WebViewID } from '../../../ipc/models/common';
import { ConfigSection, ConfigTarget } from '../../../ipc/models/config';
import { CommonMessageType } from '../../../ipc/toUI/common';
import { OnboardingMessageType } from '../../../ipc/toUI/onboarding';
import { Logger } from '../../../logger';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { OnboardingActionApi } from './onboardingActionApi';
import { id, OnboardingWebviewController } from './onboardingWebviewController';

jest.mock('@atlassianlabs/guipi-core-controller', () => ({
    defaultActionGuard: jest.fn(),
}));

jest.mock('../../../../config/configuration', () => ({
    configuration: {
        updateEffective: jest.fn(),
    },
}));

jest.mock('../../../../container', () => ({
    Container: {
        focus: jest.fn(),
        siteManager: {
            productHasAtLeastOneSite: jest.fn(),
        },
    },
}));

jest.mock('../../../../atlclients/authInfo', () => ({
    isBasicAuthInfo: jest.fn(),
    ProductBitbucket: 'bitbucket',
    ProductJira: 'jira',
}));

jest.mock('../../formatError', () => ({
    formatError: jest.fn((error, message) => `${message}: ${error}`),
}));

describe('OnboardingWebviewController', () => {
    let controller: OnboardingWebviewController;
    let mockMessagePoster: jest.Mock;
    let mockApi: jest.Mocked<OnboardingActionApi>;
    let mockCommonHandler: jest.Mocked<CommonActionMessageHandler>;
    let mockLogger: jest.Mocked<Logger>;
    let mockAnalytics: jest.Mocked<AnalyticsApi>;
    let mockOnboardingUrl: string;
    let mockWebviewPanel: jest.Mocked<WebviewPanel>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockMessagePoster = jest.fn();

        mockApi = {
            authenticateServer: jest.fn(),
            authenticateCloud: jest.fn(),
            clearAuth: jest.fn(),
            updateSettings: jest.fn(),
            getSitesAvailable: jest.fn(),
            getIsRemote: jest.fn(),
            getConfigTarget: jest.fn(),
            flattenedConfigForTarget: jest.fn(),
            getSitesWithAuth: jest.fn(),
            createJiraIssue: jest.fn(),
            viewJiraIssue: jest.fn(),
            createPullRequest: jest.fn(),
            viewPullRequest: jest.fn(),
            closePage: jest.fn(),
            openSettings: jest.fn(),
        };

        mockCommonHandler = {
            onMessageReceived: jest.fn(),
        } as unknown as jest.Mocked<CommonActionMessageHandler>;

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as unknown as jest.Mocked<Logger>;

        mockAnalytics = {
            fireAuthenticateButtonEvent: jest.fn(),
            fireLogoutButtonEvent: jest.fn(),
            fireFocusCreateIssueEvent: jest.fn(),
            fireFocusIssueEvent: jest.fn(),
            fireFocusCreatePullRequestEvent: jest.fn(),
            fireFocusPullRequestEvent: jest.fn(),
            fireDoneButtonEvent: jest.fn(),
            fireMoreSettingsButtonEvent: jest.fn(),
        } as unknown as jest.Mocked<AnalyticsApi>;

        mockOnboardingUrl = 'https://test-onboarding.atlassian.com';

        mockWebviewPanel = {
            reveal: jest.fn(),
        } as unknown as jest.Mocked<WebviewPanel>;

        controller = new OnboardingWebviewController(
            mockMessagePoster,
            mockApi,
            mockCommonHandler,
            mockLogger,
            mockAnalytics,
            mockOnboardingUrl,
        );
    });

    describe('initialization', () => {
        test('should initialize with the provided dependencies', () => {
            expect(controller).toBeDefined();
        });

        test('should have required feature flags and experiments as empty arrays', () => {
            expect(controller.requiredFeatureFlags).toEqual([]);
            expect(controller.requiredExperiments).toEqual([]);
        });

        test('should return correct title', () => {
            expect(controller.title()).toBe('Getting Started');
        });

        test('should return correct screen details', () => {
            expect(controller.screenDetails()).toEqual({
                id: WebViewID.OnboardingWebview,
                site: undefined,
                product: undefined,
            });
        });
    });

    describe('onShown', () => {
        test('should update jira.enabled configuration and focus container', async () => {
            await controller.onShown(mockWebviewPanel);

            expect(configuration.updateEffective).toHaveBeenCalledWith('jira.enabled', undefined, null, true);
            expect(Container.focus).toHaveBeenCalled();
            expect(mockWebviewPanel.reveal).toHaveBeenCalledWith(undefined, false);
        });

        test('should handle configuration update error gracefully', async () => {
            (configuration.updateEffective as jest.Mock).mockRejectedValue(new Error('Config error'));

            await controller.onShown(mockWebviewPanel);

            expect(Container.focus).toHaveBeenCalled();
            expect(mockWebviewPanel.reveal).toHaveBeenCalledWith(undefined, false);
        });
    });

    describe('onSitesChanged', () => {
        test('should post sites update message', async () => {
            (Container.siteManager.productHasAtLeastOneSite as jest.Mock)
                .mockReturnValueOnce(true) // Jira
                .mockReturnValueOnce(false); // Bitbucket

            await controller.onSitesChanged();

            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: OnboardingMessageType.SitesUpdate,
                jiraSitesConfigured: true,
                bitbucketSitesConfigured: false,
            });
        });
    });

    describe('update', () => {
        test('should call invalidate when update is called', () => {
            const mockData = {} as any;
            mockApi.getConfigTarget.mockReturnValue(ConfigTarget.User);
            mockApi.flattenedConfigForTarget.mockReturnValue({} as any);
            (Container.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(false);

            controller.update(mockData);

            expect(mockApi.getConfigTarget).toHaveBeenCalled();
            expect(mockApi.flattenedConfigForTarget).toHaveBeenCalled();
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: OnboardingMessageType.Init,
                jiraSitesConfigured: false,
                bitbucketSitesConfigured: false,
                target: ConfigTarget.User,
                config: {},
            });
        });
    });

    describe('onMessageReceived', () => {
        describe('CommonActionType.Refresh', () => {
            test('should handle refresh action successfully', async () => {
                mockApi.getConfigTarget.mockReturnValue(ConfigTarget.User);
                mockApi.flattenedConfigForTarget.mockReturnValue({} as any);
                (Container.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(false);

                await controller.onMessageReceived({
                    type: CommonActionType.Refresh,
                });

                expect(mockApi.getConfigTarget).toHaveBeenCalled();
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: OnboardingMessageType.Init,
                    jiraSitesConfigured: false,
                    bitbucketSitesConfigured: false,
                    target: ConfigTarget.User,
                    config: {},
                });
            });

            test('should handle refresh action error', async () => {
                const error = new Error('Refresh error');
                mockApi.getConfigTarget.mockImplementation(() => {
                    throw error;
                });

                await controller.onMessageReceived({
                    type: CommonActionType.Refresh,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error refeshing config');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: 'Error refeshing config: Error: Refresh error',
                });
            });
        });

        describe('OnboardingActionType.Login', () => {
            test('should handle cloud login successfully', async () => {
                const siteInfo = { id: 'site1', name: 'Test Site', host: 'test.atlassian.net', product: 'jira' };
                const authInfo = { cloud: true, user: 'user', state: 'active' };
                (isBasicAuthInfo as unknown as jest.Mock).mockReturnValue(false);

                await controller.onMessageReceived({
                    type: OnboardingActionType.Login,
                    siteInfo,
                    authInfo,
                } as any);

                expect(mockAnalytics.fireAuthenticateButtonEvent).toHaveBeenCalledWith(id, siteInfo, true);
                expect(mockApi.authenticateCloud).toHaveBeenCalledWith(siteInfo, mockOnboardingUrl);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: OnboardingMessageType.LoginResponse,
                });
            });

            test('should handle server login successfully', async () => {
                const siteInfo = { id: 'site1', name: 'Test Site', host: 'test.example.com', product: 'jira' };
                const authInfo = { username: 'user', password: 'pass', user: 'user', state: 'active' };
                (isBasicAuthInfo as unknown as jest.Mock).mockReturnValue(true);

                await controller.onMessageReceived({
                    type: OnboardingActionType.Login,
                    siteInfo,
                    authInfo,
                } as any);

                expect(mockAnalytics.fireAuthenticateButtonEvent).toHaveBeenCalledWith(id, siteInfo, false);
                expect(mockApi.authenticateServer).toHaveBeenCalledWith(siteInfo, authInfo);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: OnboardingMessageType.LoginResponse,
                });
            });

            test('should handle cloud login error', async () => {
                const error = new Error('Cloud auth error');
                const siteInfo = { id: 'site1', name: 'Test Site', host: 'test.atlassian.net', product: 'jira' };
                const authInfo = { cloud: true, user: 'user', state: 'active' };
                (isBasicAuthInfo as unknown as jest.Mock).mockReturnValue(false);
                mockApi.authenticateCloud.mockRejectedValue(error);

                await controller.onMessageReceived({
                    type: OnboardingActionType.Login,
                    siteInfo,
                    authInfo,
                } as any);

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'cloud onboarding authentication error');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: 'cloud onboarding authentication error: Error: Cloud auth error',
                });
            });

            test('should handle server login error', async () => {
                const error = new Error('Server auth error');
                const siteInfo = { id: 'site1', name: 'Test Site', host: 'test.example.com', product: 'jira' };
                const authInfo = { username: 'user', password: 'pass', user: 'user', state: 'active' };
                (isBasicAuthInfo as unknown as jest.Mock).mockReturnValue(true);
                mockApi.authenticateServer.mockRejectedValue(error);

                await controller.onMessageReceived({
                    type: OnboardingActionType.Login,
                    siteInfo,
                    authInfo,
                } as any);

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'server onboarding authentication error');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: 'server onboarding authentication error: Error: Server auth error',
                });
            });
        });

        describe('OnboardingActionType.SaveSettings', () => {
            test('should save settings successfully', async () => {
                const target = ConfigTarget.User;
                const changes = { 'jira.enabled': true };
                const removes = ['old.setting'];

                await controller.onMessageReceived({
                    type: OnboardingActionType.SaveSettings,
                    target,
                    changes,
                    removes,
                });

                expect(mockApi.updateSettings).toHaveBeenCalledWith(target, changes, removes);
            });

            test('should handle save settings error', async () => {
                const error = new Error('Settings error');
                const target = ConfigTarget.User;
                const changes = { 'jira.enabled': true };
                mockApi.updateSettings.mockImplementation(() => {
                    throw error;
                });

                await controller.onMessageReceived({
                    type: OnboardingActionType.SaveSettings,
                    target,
                    changes,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error updating configuration');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: 'undefined: Error: Settings error',
                });
            });
        });

        describe('OnboardingActionType.Logout', () => {
            test('should handle logout action', async () => {
                const siteInfo = {
                    id: 'site1',
                    name: 'Test Site',
                    host: 'test.atlassian.net',
                    avatarUrl: 'avatar.png',
                    baseLinkUrl: 'https://test.atlassian.net',
                    baseApiUrl: 'https://test.atlassian.net/rest/api',
                    isCloud: true,
                    product: 'jira',
                    userId: 'user123',
                    user: 'user',
                };

                await controller.onMessageReceived({
                    type: OnboardingActionType.Logout,
                    siteInfo,
                } as any);

                expect(mockApi.clearAuth).toHaveBeenCalledWith(siteInfo);
                expect(mockAnalytics.fireLogoutButtonEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.CreateJiraIssue', () => {
            test('should handle create jira issue action', async () => {
                await controller.onMessageReceived({
                    type: OnboardingActionType.CreateJiraIssue,
                });

                expect(mockApi.createJiraIssue).toHaveBeenCalled();
                expect(mockAnalytics.fireFocusCreateIssueEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.ViewJiraIssue', () => {
            test('should handle view jira issue action', async () => {
                await controller.onMessageReceived({
                    type: OnboardingActionType.ViewJiraIssue,
                });

                expect(mockApi.viewJiraIssue).toHaveBeenCalled();
                expect(mockAnalytics.fireFocusIssueEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.CreatePullRequest', () => {
            test('should handle create pull request action', async () => {
                await controller.onMessageReceived({
                    type: OnboardingActionType.CreatePullRequest,
                });

                expect(mockApi.createPullRequest).toHaveBeenCalled();
                expect(mockAnalytics.fireFocusCreatePullRequestEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.ViewPullRequest', () => {
            test('should handle view pull request action', async () => {
                await controller.onMessageReceived({
                    type: OnboardingActionType.ViewPullRequest,
                });

                expect(mockApi.viewPullRequest).toHaveBeenCalled();
                expect(mockAnalytics.fireFocusPullRequestEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.ClosePage', () => {
            test('should handle close page action', async () => {
                await controller.onMessageReceived({
                    type: OnboardingActionType.ClosePage,
                });

                expect(mockApi.closePage).toHaveBeenCalled();
                expect(mockAnalytics.fireDoneButtonEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.OpenSettings', () => {
            test('should handle open settings action', async () => {
                const section = ConfigSection.Jira;
                const subsection = 'filters' as any;

                await controller.onMessageReceived({
                    type: OnboardingActionType.OpenSettings,
                    section,
                    subsection,
                } as any);

                expect(mockApi.openSettings).toHaveBeenCalledWith(section, subsection);
                expect(mockAnalytics.fireMoreSettingsButtonEvent).toHaveBeenCalledWith(id);
            });
        });

        describe('OnboardingActionType.Error', () => {
            test('should handle error action', async () => {
                const error = new Error('Test error');

                await controller.onMessageReceived({
                    type: OnboardingActionType.Error,
                    error,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: 'Onboarding Error: Error: Test error',
                });
            });
        });

        describe('Common actions', () => {
            test('should delegate common actions to common handler', async () => {
                const commonActions = [
                    { type: CommonActionType.SendAnalytics, data: {} },
                    { type: CommonActionType.CopyLink, text: 'test' },
                    { type: CommonActionType.OpenJiraIssue, issueKey: 'TEST-1' },
                    { type: CommonActionType.SubmitFeedback, feedback: 'test' },
                    { type: CommonActionType.ExternalLink, href: 'https://test.com' },
                    { type: CommonActionType.DismissPMFLater },
                    { type: CommonActionType.DismissPMFNever },
                    { type: CommonActionType.OpenPMFSurvey },
                    { type: CommonActionType.Cancel },
                    { type: CommonActionType.SubmitPMF, score: 5 },
                ];

                for (const action of commonActions) {
                    await controller.onMessageReceived(action as any);
                    expect(mockCommonHandler.onMessageReceived).toHaveBeenCalledWith(action);
                }
            });
        });

        describe('default case', () => {
            test('should call defaultActionGuard for unknown actions', async () => {
                const unknownAction = { type: 'UNKNOWN_ACTION' as any };

                await controller.onMessageReceived(unknownAction);

                expect(defaultActionGuard).toHaveBeenCalledWith(unknownAction);
            });
        });
    });
});
