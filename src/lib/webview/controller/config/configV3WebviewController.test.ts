import Axios from 'axios';
import { Features } from 'src/util/features';
import { v4 } from 'uuid';
import * as vscode from 'vscode';

import { AuthInfo, AuthInfoState, DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { ExtensionId } from '../../../../constants';
import { Container } from '../../../../container';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { ConfigActionType } from '../../../ipc/fromUI/config';
import { WebViewID } from '../../../ipc/models/common';
import { ConfigTarget, ConfigV3Section } from '../../../ipc/models/config';
import { CommonMessageType } from '../../../ipc/toUI/common';
import { ConfigMessageType, SectionV3ChangeMessage } from '../../../ipc/toUI/config';
import { Logger } from '../../../logger';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { ConfigActionApi } from './configActionApi';
import { ConfigV3WebviewController, id } from './configV3WebviewController';

jest.mock('uuid');
jest.mock('@atlassianlabs/guipi-core-controller', () => ({
    defaultActionGuard: jest.fn(),
}));
jest.mock('vscode', () => {
    const mockUri = {
        toString: jest.fn().mockImplementation((includeQuery) => 'mocked-uri-string'),
    };

    return {
        Uri: {
            parse: jest.fn().mockReturnValue(mockUri),
        },
        env: {
            uriScheme: 'vscode',
            asExternalUri: jest.fn().mockResolvedValue(mockUri),
        },
    };
});
jest.mock('../../../../container', () => ({
    Container: {
        loginManager: {
            initRemoteAuth: jest.fn(),
        },
    },
}));

describe('ConfigV3WebviewController', () => {
    let controller: ConfigV3WebviewController;
    let mockMessagePoster: jest.Mock;
    let mockApi: jest.Mocked<ConfigActionApi>;
    let mockLogger: jest.Mocked<Logger>;
    let mockAnalytics: jest.Mocked<AnalyticsApi>;
    let mockCommonHandler: jest.Mocked<CommonActionMessageHandler>;
    let mockSettingsUrl: string;
    let mockSection: SectionV3ChangeMessage;

    beforeEach(() => {
        jest.clearAllMocks();

        mockMessagePoster = jest.fn();
        mockApi = {
            authenticateServer: jest.fn(),
            authenticateCloud: jest.fn(),
            clearAuth: jest.fn(),
            openJsonSettingsFile: jest.fn(),
            fetchJqlOptions: jest.fn(),
            fetchJqlSuggestions: jest.fn(),
            fetchFilterSearchResults: jest.fn(),
            validateJql: jest.fn(),
            updateSettings: jest.fn(),
            getSitesAvailable: jest.fn(),
            getSitesWithAuth: jest.fn(),
            getFeedbackUser: jest.fn(),
            getIsRemote: jest.fn(),
            getConfigTarget: jest.fn(),
            setConfigTarget: jest.fn(),
            shouldShowTunnelOption: jest.fn(),
            flattenedConfigForTarget: jest.fn(),
            createJiraIssue: jest.fn(),
            viewJiraIssue: jest.fn(),
            createPullRequest: jest.fn(),
            viewPullRequest: jest.fn(),
            openNativeSettings: jest.fn(),
        };
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
        } as unknown as jest.Mocked<AnalyticsApi>;
        mockCommonHandler = {
            onMessageReceived: jest.fn(),
        } as unknown as jest.Mocked<CommonActionMessageHandler>;
        mockSettingsUrl = 'https://test-settings.atlassian.com';
        mockSection = { section: ConfigV3Section.Auth, subSection: undefined };

        controller = new ConfigV3WebviewController(
            mockMessagePoster,
            mockApi,
            mockCommonHandler,
            mockLogger,
            mockAnalytics,
            mockSettingsUrl,
            mockSection,
        );
    });

    describe('initialization', () => {
        test('should initialize with the provided dependencies', () => {
            expect(controller).toBeDefined();
        });

        test('should have required feature flags and experiments as empty arrays', () => {
            expect(controller.requiredFeatureFlags).toEqual([Features.UseNewAuthFlow]);
            expect(controller.requiredExperiments).toEqual([]);
        });

        test('should return correct title', () => {
            expect(controller.title()).toBe('Atlassian Settings');
        });

        test('should return correct screen details', () => {
            expect(controller.screenDetails()).toEqual({
                id: WebViewID.ConfigWebview,
                site: undefined,
                product: undefined,
            });
        });
    });

    describe('onSitesChanged', () => {
        test('should post site updates message when sites change', async () => {
            const mockJiraSites = [{ id: 'site1' }];
            const mockBBSites = [{ id: 'site2' }];
            mockApi.getSitesWithAuth.mockResolvedValue([mockJiraSites, mockBBSites] as any);

            await controller.onSitesChanged();

            expect(mockApi.getSitesWithAuth).toHaveBeenCalledTimes(1);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.SitesUpdate,
                jiraSites: mockJiraSites,
                bitbucketSites: mockBBSites,
            });
        });
    });

    describe('update', () => {
        test('should post a section change message', () => {
            const section = { section: ConfigV3Section.AdvancedConfig, subSection: undefined };
            controller.update(section);

            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.SectionChange,
                ...section,
            });
        });
    });

    describe('invalidate', () => {
        test('should post init message with configurations', async () => {
            const mockJiraSites = [{ id: 'site1' }];
            const mockBBSites = [{ id: 'site2' }];
            const mockTarget = 'workspace';
            const mockConfig = { setting1: true };
            const mockFeedbackUser = { id: 'user1' };

            mockApi.getSitesWithAuth.mockResolvedValue([mockJiraSites, mockBBSites] as any);
            mockApi.getConfigTarget.mockReturnValue(mockTarget as any);
            mockApi.flattenedConfigForTarget.mockReturnValue(mockConfig as any);
            mockApi.getFeedbackUser.mockResolvedValue(mockFeedbackUser as any);
            mockApi.getIsRemote.mockReturnValue(false);
            mockApi.shouldShowTunnelOption.mockReturnValue(true);

            await controller['invalidate']();

            expect(mockApi.getSitesWithAuth).toHaveBeenCalledTimes(1);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.Init,
                bitbucketSites: mockBBSites,
                jiraSites: mockJiraSites,
                feedbackUser: mockFeedbackUser,
                isRemote: false,
                target: mockTarget,
                showTunnelOption: true,
                config: mockConfig,
                section: 'generalAuth',
            });
        });

        test('should handle error during invalidation', async () => {
            const error = new Error('Test error');
            mockApi.getSitesWithAuth.mockRejectedValue(error);

            await controller['invalidate']();

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error updating configuration');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should use default section when no initial section provided', async () => {
            const controllerWithoutSection = new ConfigV3WebviewController(
                mockMessagePoster,
                mockApi,
                mockCommonHandler,
                mockLogger,
                mockAnalytics,
                mockSettingsUrl,
            );

            const mockJiraSites = [{ id: 'site1' }];
            const mockBBSites = [{ id: 'site2' }];
            const mockTarget = 'workspace';
            const mockConfig = { setting1: true };
            const mockFeedbackUser = { id: 'user1' };

            mockApi.getSitesWithAuth.mockResolvedValue([mockJiraSites, mockBBSites] as any);
            mockApi.getConfigTarget.mockReturnValue(mockTarget as any);
            mockApi.flattenedConfigForTarget.mockReturnValue(mockConfig as any);
            mockApi.getFeedbackUser.mockResolvedValue(mockFeedbackUser as any);
            mockApi.getIsRemote.mockReturnValue(false);
            mockApi.shouldShowTunnelOption.mockReturnValue(true);

            await controllerWithoutSection['invalidate']();

            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.Init,
                bitbucketSites: mockBBSites,
                jiraSites: mockJiraSites,
                feedbackUser: mockFeedbackUser,
                isRemote: false,
                target: mockTarget,
                showTunnelOption: true,
                config: mockConfig,
                section: 'generalAuth',
            });
        });
    });

    describe('onMessageReceived', () => {
        test('should handle Refresh action', async () => {
            const mockJiraSites = [{ id: 'site1' }];
            const mockBBSites = [{ id: 'site2' }];
            mockApi.getSitesWithAuth.mockResolvedValue([mockJiraSites, mockBBSites] as any);
            mockApi.getConfigTarget.mockReturnValue('workspace' as any);
            mockApi.flattenedConfigForTarget.mockReturnValue({} as any);
            mockApi.getFeedbackUser.mockResolvedValue({} as any);
            mockApi.getIsRemote.mockReturnValue(false);
            mockApi.shouldShowTunnelOption.mockReturnValue(true);

            await controller.onMessageReceived({ type: CommonActionType.Refresh });

            expect(mockApi.getSitesWithAuth).toHaveBeenCalledTimes(1);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.Init,
                bitbucketSites: mockBBSites,
                jiraSites: mockJiraSites,
                feedbackUser: {},
                isRemote: false,
                target: 'workspace',
                showTunnelOption: true,
                config: {},
                section: 'generalAuth',
            });
        });

        test('should handle error during refresh', async () => {
            const error = new Error('Refresh error');
            mockApi.getSitesWithAuth.mockRejectedValue(error);

            await controller.onMessageReceived({ type: CommonActionType.Refresh });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error updating configuration');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle Login action for server authentication', async () => {
            const mockSiteInfo = { host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockAuthInfo = {
                username: 'test',
                password: 'pass',
                user: { id: 'user1', displayName: 'Test User', email: 'test@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
            } as AuthInfo;

            await controller.onMessageReceived({
                type: ConfigActionType.Login,
                siteInfo: mockSiteInfo,
                authInfo: mockAuthInfo,
            });

            expect(mockApi.authenticateServer).toHaveBeenCalledWith(mockSiteInfo, mockAuthInfo);
            expect(mockAnalytics.fireAuthenticateButtonEvent).toHaveBeenCalledWith(id, mockSiteInfo, false);
        });

        test('should handle Login action for cloud authentication', async () => {
            const mockSiteInfo = { host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockAuthInfo = { state: AuthInfoState.Valid } as AuthInfo;

            await controller.onMessageReceived({
                type: ConfigActionType.Login,
                siteInfo: mockSiteInfo,
                authInfo: mockAuthInfo,
            });

            expect(mockApi.authenticateCloud).toHaveBeenCalledWith(mockSiteInfo, mockSettingsUrl);
            expect(mockAnalytics.fireAuthenticateButtonEvent).toHaveBeenCalledWith(id, mockSiteInfo, true);
        });

        test('should handle server authentication error', async () => {
            const mockSiteInfo = { host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockAuthInfo = {
                username: 'test',
                password: 'pass',
                user: { id: 'user1', displayName: 'Test User', email: 'test@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
            } as AuthInfo;
            const error = new Error('Auth error');
            mockApi.authenticateServer.mockRejectedValue(error);

            await controller.onMessageReceived({
                type: ConfigActionType.Login,
                siteInfo: mockSiteInfo,
                authInfo: mockAuthInfo,
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Authentication error');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle RemoteLogin action', async () => {
            (v4 as jest.Mock).mockReturnValue('mocked-uuid');

            await controller.onMessageReceived({ type: ConfigActionType.RemoteLogin });

            expect(vscode.Uri.parse).toHaveBeenCalledWith(`vscode://${ExtensionId}/auth`);
            expect(vscode.env.asExternalUri).toHaveBeenCalled();
            expect(Container.loginManager.initRemoteAuth).toHaveBeenCalledWith({
                deeplink: 'mocked-uri-string',
                attemptId: 'mocked-uuid',
            });
        });

        test('should handle Logout action', async () => {
            const mockSiteInfo = { host: 'test.atlassian.net' } as DetailedSiteInfo;

            await controller.onMessageReceived({
                type: ConfigActionType.Logout,
                siteInfo: mockSiteInfo,
            });

            expect(mockApi.clearAuth).toHaveBeenCalledWith(mockSiteInfo);
            expect(mockAnalytics.fireLogoutButtonEvent).toHaveBeenCalledWith(id);
        });

        test('should handle SetTarget action', async () => {
            const mockTarget = ConfigTarget.User;
            const mockConfig = { setting1: true };
            mockApi.flattenedConfigForTarget.mockReturnValue(mockConfig as any);

            await controller.onMessageReceived({
                type: ConfigActionType.SetTarget,
                target: mockTarget,
            });

            expect(mockApi.setConfigTarget).toHaveBeenCalledWith(mockTarget);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.Update,
                config: mockConfig,
                target: mockTarget,
            });
        });

        test('should handle OpenJSON action', async () => {
            const mockTarget = ConfigTarget.User;

            await controller.onMessageReceived({
                type: ConfigActionType.OpenJSON,
                target: mockTarget,
            });

            expect(mockApi.openJsonSettingsFile).toHaveBeenCalledWith(mockTarget);
        });

        test('should handle JQLSuggestionsRequest action', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockData = [{ value: 'suggestion1' }];
            mockApi.fetchJqlSuggestions.mockResolvedValue(mockData as any);

            await controller.onMessageReceived({
                type: ConfigActionType.JQLSuggestionsRequest,
                site: mockSite,
                fieldName: 'project',
                userInput: 'test',
                predicateName: 'in',
                abortKey: 'key1',
            });

            expect(mockApi.fetchJqlSuggestions).toHaveBeenCalledWith(mockSite, 'project', 'test', 'in', 'key1');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.JQLSuggestionsResponse,
                data: mockData,
            });
        });

        test('should handle axios cancellation for JQLSuggestionsRequest', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const cancelError = { isCancel: true };
            mockApi.fetchJqlSuggestions.mockRejectedValue(cancelError);
            jest.spyOn(Axios, 'isCancel').mockReturnValue(true);

            await controller.onMessageReceived({
                type: ConfigActionType.JQLSuggestionsRequest,
                site: mockSite,
                fieldName: 'project',
                userInput: 'test',
            });

            expect(mockLogger.warn).toHaveBeenCalled();
            expect(mockMessagePoster).not.toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle JQLSuggestionsRequest error', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const error = new Error('JQL error');
            mockApi.fetchJqlSuggestions.mockRejectedValue(error);
            jest.spyOn(Axios, 'isCancel').mockReturnValue(false);

            await controller.onMessageReceived({
                type: ConfigActionType.JQLSuggestionsRequest,
                site: mockSite,
                fieldName: 'project',
                userInput: 'test',
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'JQL fetch error');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle JQLOptionsRequest action', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockData = { fields: [] };
            mockApi.fetchJqlOptions.mockResolvedValue(mockData as any);

            await controller.onMessageReceived({
                type: ConfigActionType.JQLOptionsRequest,
                site: mockSite,
            });

            expect(mockApi.fetchJqlOptions).toHaveBeenCalledWith(mockSite);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.JQLOptionsResponse,
                data: mockData,
            });
        });

        test('should handle JQLOptionsRequest error', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const error = new Error('JQL options error');
            mockApi.fetchJqlOptions.mockRejectedValue(error);

            await controller.onMessageReceived({
                type: ConfigActionType.JQLOptionsRequest,
                site: mockSite,
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'JQL fetch error');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle FilterSearchRequest action', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockData = { filters: [] };
            mockApi.fetchFilterSearchResults.mockResolvedValue(mockData as any);

            await controller.onMessageReceived({
                type: ConfigActionType.FilterSearchRequest,
                site: mockSite,
                query: 'test',
                maxResults: 10,
                startAt: 0,
                abortKey: 'key1',
            });

            expect(mockApi.fetchFilterSearchResults).toHaveBeenCalledWith(mockSite, 'test', 10, 0, 'key1');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.FilterSearchResponse,
                data: mockData,
            });
        });

        test('should handle axios cancellation for FilterSearchRequest', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const cancelError = { isCancel: true };
            mockApi.fetchFilterSearchResults.mockRejectedValue(cancelError);
            jest.spyOn(Axios, 'isCancel').mockReturnValue(true);

            await controller.onMessageReceived({
                type: ConfigActionType.FilterSearchRequest,
                site: mockSite,
                query: 'test',
                maxResults: 10,
                startAt: 0,
            });

            expect(mockLogger.warn).toHaveBeenCalled();
            expect(mockMessagePoster).not.toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle FilterSearchRequest error', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const error = new Error('Filter error');
            mockApi.fetchFilterSearchResults.mockRejectedValue(error);
            jest.spyOn(Axios, 'isCancel').mockReturnValue(false);

            await controller.onMessageReceived({
                type: ConfigActionType.FilterSearchRequest,
                site: mockSite,
                query: 'test',
                maxResults: 10,
                startAt: 0,
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Filter fetch error');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle ValidateJqlRequest action', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const mockData = { errors: [] };
            mockApi.validateJql.mockResolvedValue(mockData as any);

            await controller.onMessageReceived({
                type: ConfigActionType.ValidateJqlRequest,
                site: mockSite,
                jql: 'project = TEST',
                abortKey: 'key1',
            });

            expect(mockApi.validateJql).toHaveBeenCalledWith(mockSite, 'project = TEST', 'key1');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: ConfigMessageType.ValidateJqlResponse,
                data: mockData,
            });
        });

        test('should handle axios cancellation for ValidateJqlRequest', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const cancelError = { isCancel: true };
            mockApi.validateJql.mockRejectedValue(cancelError);
            jest.spyOn(Axios, 'isCancel').mockReturnValue(true);

            await controller.onMessageReceived({
                type: ConfigActionType.ValidateJqlRequest,
                site: mockSite,
                jql: 'project = TEST',
            });

            expect(mockLogger.warn).toHaveBeenCalled();
            expect(mockMessagePoster).not.toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle ValidateJqlRequest error', async () => {
            const mockSite = { id: 'site1', host: 'test.atlassian.net' } as DetailedSiteInfo;
            const error = new Error('Validate error');
            mockApi.validateJql.mockRejectedValue(error);
            jest.spyOn(Axios, 'isCancel').mockReturnValue(false);

            await controller.onMessageReceived({
                type: ConfigActionType.ValidateJqlRequest,
                site: mockSite,
                jql: 'project = TEST',
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'JQL Validate network error');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle SaveSettings action', async () => {
            await controller.onMessageReceived({
                type: ConfigActionType.SaveSettings,
                target: ConfigTarget.User,
                changes: { setting1: true },
                removes: ['setting2'],
            });

            expect(mockApi.updateSettings).toHaveBeenCalledWith(ConfigTarget.User, { setting1: true }, ['setting2']);
        });

        test('should handle SaveSettings error', async () => {
            const error = new Error('Save error');
            mockApi.updateSettings.mockImplementation(() => {
                throw error;
            });

            await controller.onMessageReceived({
                type: ConfigActionType.SaveSettings,
                target: ConfigTarget.User,
                changes: {},
                removes: [],
            });

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error updating configuration');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.anything(),
            });
        });

        test('should handle CreateJiraIssue action', async () => {
            await controller.onMessageReceived({ type: ConfigActionType.CreateJiraIssue });

            expect(mockApi.createJiraIssue).toHaveBeenCalled();
            expect(mockAnalytics.fireFocusCreateIssueEvent).toHaveBeenCalledWith(id);
        });

        test('should handle ViewJiraIssue action', async () => {
            await controller.onMessageReceived({ type: ConfigActionType.ViewJiraIssue });

            expect(mockApi.viewJiraIssue).toHaveBeenCalled();
            expect(mockAnalytics.fireFocusIssueEvent).toHaveBeenCalledWith(id);
        });

        test('should handle CreatePullRequest action', async () => {
            await controller.onMessageReceived({ type: ConfigActionType.CreatePullRequest });

            expect(mockApi.createPullRequest).toHaveBeenCalled();
            expect(mockAnalytics.fireFocusCreatePullRequestEvent).toHaveBeenCalledWith(id);
        });

        test('should handle ViewPullRequest action', async () => {
            await controller.onMessageReceived({ type: ConfigActionType.ViewPullRequest });

            expect(mockApi.viewPullRequest).toHaveBeenCalled();
            expect(mockAnalytics.fireFocusPullRequestEvent).toHaveBeenCalledWith(id);
        });

        test('should delegate common actions to common handler', async () => {
            const commonActions = [
                { type: CommonActionType.SendAnalytics },
                { type: CommonActionType.CopyLink },
                { type: CommonActionType.OpenJiraIssue },
                { type: CommonActionType.ExternalLink },
                { type: CommonActionType.Cancel },
                { type: CommonActionType.DismissPMFLater },
                { type: CommonActionType.DismissPMFNever },
                { type: CommonActionType.OpenPMFSurvey },
                { type: CommonActionType.SubmitPMF },
                { type: CommonActionType.SubmitFeedback },
            ];

            for (const action of commonActions) {
                await controller.onMessageReceived(action as any);
                expect(mockCommonHandler.onMessageReceived).toHaveBeenCalledWith(action);
            }

            expect(mockCommonHandler.onMessageReceived).toHaveBeenCalledTimes(commonActions.length);
        });

        test('should call defaultActionGuard for unknown action types', async () => {
            const { defaultActionGuard } = require('@atlassianlabs/guipi-core-controller');
            const unknownAction = { type: 'unknown' };

            await controller.onMessageReceived(unknownAction as any);

            expect(defaultActionGuard).toHaveBeenCalledWith(unknownAction);
        });
    });
});
