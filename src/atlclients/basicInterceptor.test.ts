import { AxiosInstance } from 'axios';
import { expansionCastTo } from 'testsutil';
import { commands, window } from 'vscode';

import { Commands } from '../constants';
import { Logger } from '../logger';
import { AuthInfoState, DetailedSiteInfo, ProductJira } from './authInfo';
import { CredentialManager } from './authStore';
import { BasicInterceptor } from './basicInterceptor';

jest.mock('vscode');
jest.mock('../logger');
jest.mock('../constants', () => ({
    Commands: {
        ShowJiraAuth: 'atlascode.showJiraAuth',
    },
}));

const mockedWindow = jest.mocked(window);
const mockedCommands = jest.mocked(commands);
const mockedLogger = jest.mocked(Logger);

describe('BasicInterceptor', () => {
    let mockSite: DetailedSiteInfo;
    let mockAuthStore: jest.Mocked<CredentialManager>;
    let mockAxiosInstance: jest.Mocked<AxiosInstance>;
    let mockRequestInterceptorUse: jest.Mock;
    let mockResponseInterceptorUse: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSite = expansionCastTo<DetailedSiteInfo>({
            id: 'test-site-id',
            host: 'test.atlassian.net',
            baseApiUrl: 'https://test.atlassian.net',
            baseLinkUrl: 'https://test.atlassian.net',
            product: ProductJira,
        });

        mockAuthStore = {
            getAuthInfo: jest.fn(),
            getCachedAuthInfo: jest.fn(),
            attemptRefreshAfterAuthError: jest.fn(),
            saveAuthInfo: jest.fn(),
        } as any;

        mockRequestInterceptorUse = jest.fn();
        mockResponseInterceptorUse = jest.fn();
        mockAxiosInstance = {
            interceptors: {
                request: {
                    use: mockRequestInterceptorUse,
                },
                response: {
                    use: mockResponseInterceptorUse,
                },
            },
        } as any;

        mockedWindow.showErrorMessage = jest.fn().mockResolvedValue(undefined);
    });

    describe('constructor', () => {
        it('should initialize with valid credentials state', () => {
            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            expect(interceptor).toBeDefined();
        });
    });

    describe('attachToAxios', () => {
        it('should mark credentials as invalid if authInfo state is Invalid', async () => {
            const invalidAuthInfo = expansionCastTo<any>({
                state: AuthInfoState.Invalid,
            });
            mockAuthStore.getAuthInfo.mockResolvedValue(invalidAuthInfo);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            await interceptor.attachToAxios(mockAxiosInstance);

            expect(mockedLogger.debug).toHaveBeenCalledWith('Credentials are already marked as invalid.');
            expect(mockedWindow.showErrorMessage).toHaveBeenCalledWith(
                `Credentials refused for ${mockSite.baseApiUrl}`,
                { modal: false },
                'Update Credentials',
            );
        });

        it('should not mark credentials as invalid if authInfo state is Valid', async () => {
            const validAuthInfo = expansionCastTo<any>({
                state: AuthInfoState.Valid,
            });
            mockAuthStore.getAuthInfo.mockResolvedValue(validAuthInfo);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            await interceptor.attachToAxios(mockAxiosInstance);

            expect(mockedLogger.debug).not.toHaveBeenCalledWith('Credentials are already marked as invalid.');
            expect(mockedWindow.showErrorMessage).not.toHaveBeenCalled();
        });
    });

    describe('error interceptor', () => {
        it('should invalidate OAuth credentials on 401 when refresh fails', async () => {
            const oauthAuthInfo = expansionCastTo<any>({
                state: AuthInfoState.Valid,
                access: 'access',
                refresh: 'refresh',
            });
            mockAuthStore.getCachedAuthInfo.mockResolvedValue(oauthAuthInfo);
            mockAuthStore.attemptRefreshAfterAuthError.mockResolvedValue(false);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            await interceptor.attachToAxios(mockAxiosInstance);

            const errorInterceptor = mockResponseInterceptorUse.mock.calls[0][1];
            const error401 = { response: { status: 401 } };

            await expect(errorInterceptor(error401)).rejects.toBe(error401);

            expect(mockAuthStore.getCachedAuthInfo).toHaveBeenCalledWith(mockSite);
            expect(mockAuthStore.attemptRefreshAfterAuthError).toHaveBeenCalledWith(mockSite);
            expect(mockedLogger.debug).toHaveBeenCalledWith(
                'Received 401 - OAuth refresh failed, marking credentials as invalid',
            );
            expect(mockedWindow.showErrorMessage).toHaveBeenCalledWith(
                `Credentials refused for ${mockSite.baseApiUrl}`,
                { modal: false },
                'Update Credentials',
            );
        });

        it('should not invalidate OAuth credentials on 401 when refresh succeeds', async () => {
            const oauthAuthInfo = expansionCastTo<any>({
                state: AuthInfoState.Valid,
                access: 'access',
                refresh: 'refresh',
            });
            mockAuthStore.getCachedAuthInfo.mockResolvedValue(oauthAuthInfo);
            mockAuthStore.attemptRefreshAfterAuthError.mockResolvedValue(true);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            await interceptor.attachToAxios(mockAxiosInstance);

            const errorInterceptor = mockResponseInterceptorUse.mock.calls[0][1];
            await expect(errorInterceptor({ response: { status: 401 } })).rejects.toBeDefined();

            expect(mockAuthStore.attemptRefreshAfterAuthError).toHaveBeenCalledWith(mockSite);
            expect(mockedLogger.debug).toHaveBeenCalledWith(
                'Received 401 - OAuth refresh succeeded, credentials still valid',
            );
            expect(mockedWindow.showErrorMessage).not.toHaveBeenCalled();
            expect(mockAuthStore.saveAuthInfo).not.toHaveBeenCalled();
        });

        it('should invalidate Basic/PAT credentials only after threshold consecutive 401/403', async () => {
            const basicAuthInfo = expansionCastTo<any>({
                state: AuthInfoState.Valid,
                username: 'user',
                password: 'pass',
            });
            mockAuthStore.getCachedAuthInfo.mockResolvedValue(basicAuthInfo);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            await interceptor.attachToAxios(mockAxiosInstance);
            const errorInterceptor = mockResponseInterceptorUse.mock.calls[0][1];
            const error401 = { response: { status: 401 } };
            const error403 = { response: { status: 403 } };

            // First and second 401/403: tolerance, no invalidate (interceptor always rejects with the error)
            await expect(errorInterceptor(error401)).rejects.toBe(error401);
            expect(mockedWindow.showErrorMessage).not.toHaveBeenCalled();
            expect(mockAuthStore.saveAuthInfo).not.toHaveBeenCalled();

            await expect(errorInterceptor(error403)).rejects.toBe(error403);
            expect(mockedWindow.showErrorMessage).not.toHaveBeenCalled();
            expect(mockAuthStore.saveAuthInfo).not.toHaveBeenCalled();

            // Third 401: invalidate
            await expect(errorInterceptor(error401)).rejects.toBe(error401);
            expect(mockedWindow.showErrorMessage).toHaveBeenCalledWith(
                `Credentials refused for ${mockSite.baseApiUrl}`,
                { modal: false },
                'Update Credentials',
            );
            expect(mockAuthStore.saveAuthInfo).toHaveBeenCalledWith(
                mockSite,
                expect.objectContaining({ state: AuthInfoState.Invalid }),
            );
        });

        it('should handle 403 for OAuth and attempt refresh', async () => {
            const oauthAuthInfo = expansionCastTo<any>({
                state: AuthInfoState.Valid,
                access: 'access',
                refresh: 'refresh',
            });
            mockAuthStore.getCachedAuthInfo.mockResolvedValue(oauthAuthInfo);
            mockAuthStore.attemptRefreshAfterAuthError.mockResolvedValue(false);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            await interceptor.attachToAxios(mockAxiosInstance);
            const errorInterceptor = mockResponseInterceptorUse.mock.calls[0][1];

            await expect(errorInterceptor({ response: { status: 403 } })).rejects.toBeDefined();

            expect(mockAuthStore.attemptRefreshAfterAuthError).toHaveBeenCalledWith(mockSite);
            expect(mockedLogger.debug).toHaveBeenCalledWith(
                'Received 403 - OAuth refresh failed, marking credentials as invalid',
            );
            expect(mockedWindow.showErrorMessage).toHaveBeenCalled();
        });
    });

    describe('showError', () => {
        it('should show error message and execute command when user clicks Update Credentials', async () => {
            mockedWindow.showErrorMessage.mockResolvedValue('Update Credentials' as any);
            mockedCommands.executeCommand.mockResolvedValue(undefined);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            interceptor.showError();

            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockedWindow.showErrorMessage).toHaveBeenCalledWith(
                `Credentials refused for ${mockSite.baseApiUrl}`,
                { modal: false },
                'Update Credentials',
            );
            expect(mockedCommands.executeCommand).toHaveBeenCalledWith(Commands.ShowJiraAuth);
        });

        it('should show error message but not execute command when user dismisses', async () => {
            mockedWindow.showErrorMessage.mockResolvedValue(undefined);

            const interceptor = new BasicInterceptor(mockSite, mockAuthStore);
            interceptor.showError();

            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockedWindow.showErrorMessage).toHaveBeenCalledWith(
                `Credentials refused for ${mockSite.baseApiUrl}`,
                { modal: false },
                'Update Credentials',
            );
            expect(mockedCommands.executeCommand).not.toHaveBeenCalled();
        });
    });
});
