import { AxiosInstance, AxiosResponse } from 'axios';

import { Logger } from '../../logger';
import { AccessibleResource, UserInfo } from '../authInfo';
import { Strategy } from '../strategy';
import { Tokens } from '../tokens';
import { JiraPKCEResponseHandler } from './JiraPKCEResponseHandler';

// Mock Logger
jest.mock('../../logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));

type MockAxios = jest.MockedFunction<
    <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<AxiosResponse<T>>
>;

interface AgentConfig {
    httpsAgent?: unknown;
    timeout?: number;
    [key: string]: unknown;
}

describe('JiraPKCEResponseHandler', () => {
    let handler: JiraPKCEResponseHandler;
    let mockStrategy: jest.Mocked<Strategy>;
    let mockAxios: MockAxios;
    let mockAgent: AgentConfig;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock strategy
        mockStrategy = {
            tokenUrl: jest.fn().mockReturnValue('https://auth.atlassian.com/oauth/token'),
            tokenAuthorizationData: jest.fn(),
            apiUrl: jest.fn().mockReturnValue('api.atlassian.com'),
            accessibleResourcesUrl: jest
                .fn()
                .mockReturnValue('https://api.atlassian.com/oauth/token/accessible-resources'),
        } as unknown as jest.Mocked<Strategy>;

        // Create mock axios instance
        mockAxios = jest.fn() as MockAxios;

        // Create mock agent
        mockAgent = { httpsAgent: 'mock-agent' };

        handler = new JiraPKCEResponseHandler(mockStrategy, mockAgent, mockAxios as unknown as AxiosInstance);
    });

    describe('tokens', () => {
        it('should successfully fetch tokens with valid code', async () => {
            const mockCode = 'auth_code_123';
            const mockTokenData = {
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
                scope: 'read:jira-user read:jira-work',
            };

            const mockAuthData = JSON.stringify({
                code: mockCode,
                grant_type: 'authorization_code',
            });
            mockStrategy.tokenAuthorizationData.mockReturnValue(mockAuthData);

            mockAxios.mockResolvedValueOnce({
                data: mockTokenData,
            } as AxiosResponse);

            const result: Tokens = await handler.tokens(mockCode);

            expect(mockAxios).toHaveBeenCalledWith('https://auth.atlassian.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: mockAuthData,
                httpsAgent: 'mock-agent',
            });

            expect(result).toEqual({
                accessToken: 'access_token_123',
                refreshToken: 'refresh_token_123',
                receivedAt: expect.any(Number),
                scopes: ['read:jira-user', 'read:jira-work'],
            });
        });

        it('should handle tokens without scopes', async () => {
            const mockCode = 'auth_code_123';
            const mockTokenData = {
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
            };

            mockAxios.mockResolvedValueOnce({
                data: mockTokenData,
            } as AxiosResponse);

            const result: Tokens = await handler.tokens(mockCode);

            expect(result.scopes).toEqual([]);
        });

        it('should handle tokens with empty scope string', async () => {
            const mockCode = 'auth_code_123';
            const mockTokenData = {
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
                scope: '',
            };

            mockAxios.mockResolvedValueOnce({
                data: mockTokenData,
            } as AxiosResponse);

            const result: Tokens = await handler.tokens(mockCode);

            expect(result.scopes).toEqual([]);
        });

        it('should log error and throw when token request fails', async () => {
            const mockCode = 'auth_code_123';
            const mockError = {
                message: 'Network error',
                response: {
                    data: {
                        error: 'invalid_grant',
                        error_description: 'Invalid authorization code',
                    },
                },
            };

            mockAxios.mockRejectedValueOnce(mockError);

            await expect(handler.tokens(mockCode)).rejects.toThrow('Error fetching Jira tokens: [object Object]');

            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error fetching Jira tokens');
        });

        it('should handle error without response data', async () => {
            const mockCode = 'auth_code_123';
            const mockError = new Error('Network error');

            mockAxios.mockRejectedValueOnce(mockError);

            await expect(handler.tokens(mockCode)).rejects.toThrow();

            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error fetching Jira tokens');
        });
    });

    describe('user', () => {
        const mockAccessToken = 'access_token_123';
        const mockResource: AccessibleResource = {
            id: 'resource_id_123',
            name: 'Test Site',
            scopes: ['read:jira-user'],
            avatarUrl: 'https://example.com/avatar.png',
            url: 'https://test-site.atlassian.net',
        };

        it('should successfully fetch user information', async () => {
            const mockUserData = {
                accountId: 'user_id_123',
                displayName: 'John Doe',
                emailAddress: 'john.doe@example.com',
                avatarUrls: {
                    '48x48': 'https://example.com/avatar-48.png',
                },
            };

            mockAxios.mockResolvedValueOnce({
                data: mockUserData,
            } as AxiosResponse);

            const result: UserInfo = await handler.user(mockAccessToken, mockResource);

            expect(mockStrategy.apiUrl).toHaveBeenCalled();
            expect(mockAxios).toHaveBeenCalledWith(
                'https://api.atlassian.com/ex/jira/resource_id_123/rest/api/2/myself',
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: 'Bearer access_token_123',
                    },
                    httpsAgent: 'mock-agent',
                },
            );

            expect(result).toEqual({
                id: 'user_id_123',
                displayName: 'John Doe',
                email: 'john.doe@example.com',
                avatarUrl: 'https://example.com/avatar-48.png',
            });
        });

        it('should log error and throw when user request fails', async () => {
            const mockError = new Error('Unauthorized');

            mockAxios.mockRejectedValueOnce(mockError);

            await expect(handler.user(mockAccessToken, mockResource)).rejects.toThrow(
                'Error fetching Jira user: Error: Unauthorized',
            );

            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error fetching Jira user');
        });

        it('should construct correct URL with resource ID', async () => {
            const differentResource: AccessibleResource = {
                id: 'different_resource_id',
                name: 'Different Site',
                scopes: ['read:jira-user'],
                avatarUrl: 'https://example.com/avatar2.png',
                url: 'https://different-site.atlassian.net',
            };

            mockAxios.mockResolvedValueOnce({
                data: {
                    accountId: 'user_id',
                    displayName: 'User',
                    emailAddress: 'user@example.com',
                    avatarUrls: { '48x48': 'https://example.com/avatar.png' },
                },
            } as AxiosResponse);

            await handler.user(mockAccessToken, differentResource);

            expect(mockAxios).toHaveBeenCalledWith(
                expect.stringContaining('different_resource_id'),
                expect.any(Object),
            );
        });
    });

    describe('accessibleResources', () => {
        const mockAccessToken = 'access_token_123';

        it('should successfully fetch accessible resources', async () => {
            const mockResourcesData: AccessibleResource[] = [
                {
                    id: 'resource_1',
                    name: 'Site 1',
                    scopes: ['read:jira-user', 'read:jira-work'],
                    avatarUrl: 'https://example.com/avatar1.png',
                    url: 'https://site1.atlassian.net',
                },
                {
                    id: 'resource_2',
                    name: 'Site 2',
                    scopes: ['read:jira-user'],
                    avatarUrl: 'https://example.com/avatar2.png',
                    url: 'https://site2.atlassian.net',
                },
            ];

            mockAxios.mockResolvedValueOnce({
                data: mockResourcesData,
            } as AxiosResponse);

            const result: AccessibleResource[] = await handler.accessibleResources(mockAccessToken);

            expect(mockStrategy.accessibleResourcesUrl).toHaveBeenCalled();
            expect(mockAxios).toHaveBeenCalledWith('https://api.atlassian.com/oauth/token/accessible-resources', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: 'Bearer access_token_123',
                },
                httpsAgent: 'mock-agent',
            });

            expect(result).toEqual(mockResourcesData);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no resources available', async () => {
            mockAxios.mockResolvedValueOnce({
                data: [],
            } as AxiosResponse);

            const result: AccessibleResource[] = await handler.accessibleResources(mockAccessToken);

            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should log error and throw when resources request fails', async () => {
            const mockError = new Error('Forbidden');

            mockAxios.mockRejectedValueOnce(mockError);

            await expect(handler.accessibleResources(mockAccessToken)).rejects.toThrow(
                'Error fetching Jira resources: Error: Forbidden',
            );

            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error fetching Jira resources');
        });

        it('should include authorization header with access token', async () => {
            const customToken = 'custom_access_token_xyz';

            mockAxios.mockResolvedValueOnce({
                data: [],
            } as AxiosResponse);

            await handler.accessibleResources(customToken);

            expect(mockAxios).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer custom_access_token_xyz',
                    }),
                }),
            );
        });
    });

    describe('constructor', () => {
        it('should create instance with provided dependencies', () => {
            expect(handler).toBeInstanceOf(JiraPKCEResponseHandler);
        });

        it('should use provided agent in requests', async () => {
            const customAgent = { httpsAgent: 'custom-agent', timeout: 5000 };
            const customHandler = new JiraPKCEResponseHandler(
                mockStrategy,
                customAgent,
                mockAxios as unknown as AxiosInstance,
            );

            mockAxios.mockResolvedValueOnce({
                data: [],
            } as AxiosResponse);

            await customHandler.accessibleResources('token');

            expect(mockAxios).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    httpsAgent: 'custom-agent',
                    timeout: 5000,
                }),
            );
        });
    });
});
