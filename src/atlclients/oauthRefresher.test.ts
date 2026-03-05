import axios from 'axios';

import { Logger } from '../logger';
import { OAuthProvider } from './authInfo';
import { OAuthRefesher } from './oauthRefresher';

jest.mock('axios');
jest.mock('../logger', () => ({
    Logger: {
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../container', () => ({
    Container: {
        config: {
            enableCurlLogging: false,
        },
    },
}));

jest.mock('../jira/jira-client/providers', () => ({
    getAgent: jest.fn(() => ({})),
}));

jest.mock('./interceptors', () => ({
    addCurlLogging: jest.fn(),
}));

jest.mock('./tokens', () => ({
    tokensFromResponseData: jest.fn((data) => ({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        receivedAt: Date.now(),
        expiration: Date.now() + 3600000,
    })),
}));

jest.mock('./strategy', () => ({
    strategyForProvider: jest.fn(() => ({
        tokenUrl: () => 'https://auth.atlassian.com/oauth/token',
        refreshHeaders: () => ({ 'Content-Type': 'application/json' }),
        tokenRefreshData: (token: string) => ({ refresh_token: token }),
    })),
}));

describe('OAuthRefresher', () => {
    let refresher: OAuthRefesher;
    let mockAxiosInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAxiosInstance = jest.fn();
        (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

        refresher = new OAuthRefesher();
    });

    describe('getNewTokens', () => {
        it('should log debug for network errors (ENOTFOUND)', async () => {
            const networkError: any = new Error('Network error');
            networkError.code = 'ENOTFOUND';
            networkError.hostname = 'auth.atlassian.com';

            mockAxiosInstance.mockRejectedValue(networkError);

            const result = await refresher.getNewTokens(OAuthProvider.JiraCloud, 'refresh-token');

            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Network error while refreshing tokens'));
            expect(Logger.error).not.toHaveBeenCalled();
            expect(result.shouldSlowDown).toBe(true);
            expect(result.tokens).toBeUndefined();
        });

        it('should log debug for 401 auth errors', async () => {
            const authError: any = new Error('Unauthorized');
            authError.response = {
                status: 401,
                data: {
                    error: 'invalid_grant',
                    error_description: 'Invalid refresh token',
                },
            };

            mockAxiosInstance.mockRejectedValue(authError);

            const result = await refresher.getNewTokens(OAuthProvider.JiraCloud, 'invalid-refresh-token');

            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Auth error (401)'));
            expect(Logger.error).not.toHaveBeenCalled();
            expect(result.shouldInvalidate).toBe(true);
            expect(result.shouldSlowDown).toBe(true);
            expect(result.tokens).toBeUndefined();
        });

        it('should log debug for 403 auth errors', async () => {
            const authError: any = new Error('Forbidden');
            authError.response = {
                status: 403,
                data: {
                    error: 'access_denied',
                    error_description: 'Access denied',
                },
            };

            mockAxiosInstance.mockRejectedValue(authError);

            const result = await refresher.getNewTokens(OAuthProvider.JiraCloud, 'refresh-token');

            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Auth error (403)'));
            expect(Logger.error).not.toHaveBeenCalled();
            expect(result.shouldInvalidate).toBe(true);
            expect(result.shouldSlowDown).toBe(true);
        });

        it('should log debug for other HTTP errors', async () => {
            const serverError: any = new Error('Server Error');
            serverError.response = {
                status: 500,
                data: {
                    error: 'server_error',
                    error_description: 'Internal server error',
                },
            };

            mockAxiosInstance.mockRejectedValue(serverError);

            const result = await refresher.getNewTokens(OAuthProvider.JiraCloud, 'refresh-token');

            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Error while refreshing tokens'));
            expect(Logger.error).not.toHaveBeenCalled();
            expect(result.shouldSlowDown).toBe(true);
        });

        it('should return new tokens on success', async () => {
            const successResponse = {
                data: {
                    access_token: 'new-access-token',
                    refresh_token: 'new-refresh-token',
                    expires_in: 3600,
                },
            };

            mockAxiosInstance.mockResolvedValue(successResponse);

            const result = await refresher.getNewTokens(OAuthProvider.JiraCloud, 'refresh-token');

            expect(result.tokens).toBeDefined();
            expect(result.tokens?.accessToken).toBe('new-access-token');
            expect(result.tokens?.refreshToken).toBe('new-refresh-token');
            expect(result.shouldSlowDown).toBeFalsy();
            expect(result.shouldInvalidate).toBeFalsy();
        });

        it('should return shouldInvalidate if refresh token is missing', async () => {
            const result = await refresher.getNewTokens(OAuthProvider.JiraCloud, '');

            expect(Logger.error).toHaveBeenCalledWith(
                expect.any(Error),
                expect.stringContaining('refresh token is missing'),
            );
            expect(result.shouldInvalidate).toBe(true);
            expect(result.tokens).toBeUndefined();
        });
    });
});
