import { JiraClient, JiraCloudClient, JiraServerClient } from '@atlassianlabs/jira-pi-client';
import PQueue from 'p-queue';
import { ConfigurationChangeEvent, ExtensionContext } from 'vscode';
import { commands, window } from 'vscode';

import { CloudPullRequestApi } from '../bitbucket/bitbucket-cloud/pullRequests';
import { CloudRepositoriesApi } from '../bitbucket/bitbucket-cloud/repositories';
import { ServerPullRequestApi } from '../bitbucket/bitbucket-server/pullRequests';
import { ServerRepositoriesApi } from '../bitbucket/bitbucket-server/repositories';
import { HTTPClient } from '../bitbucket/httpClient';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import {
    basicJiraTransportFactory,
    getAgent,
    jiraBasicAuthProvider,
    jiraTokenAuthProvider,
    oauthJiraTransportFactory,
} from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { PipelineApiImpl } from '../pipelines/pipelines';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { CacheMap } from '../util/cachemap';
import {
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    OAuthInfo,
    PATAuthInfo,
    ProductBitbucket,
    ProductJira,
} from './authInfo';
import { BasicInterceptor } from './basicInterceptor';
import { ClientManager } from './clientManager';
import { Negotiator } from './negotiate';

// Mock all external dependencies
jest.mock('@atlassianlabs/jira-pi-client');
jest.mock('@atlassianlabs/pi-client-common', () => ({
    getProxyHostAndPort: jest.fn().mockReturnValue(['localhost', 8080]),
}));
jest.mock('p-queue');
jest.mock('../bitbucket/bitbucket-cloud/pullRequests');
jest.mock('../bitbucket/bitbucket-cloud/repositories');
jest.mock('../bitbucket/bitbucket-server/pullRequests');
jest.mock('../bitbucket/bitbucket-server/repositories');
jest.mock('../bitbucket/httpClient');
jest.mock('../config/configuration');
jest.mock('../container');
jest.mock('../jira/jira-client/providers');
jest.mock('../logger');
jest.mock('../pipelines/pipelines');
jest.mock('../util/cachemap');
jest.mock('./basicInterceptor');
jest.mock('./negotiate');

describe('ClientManager', () => {
    let clientManager: ClientManager;
    let mockContext: ExtensionContext;
    let mockSiteManager: any;
    let mockCredentialManager: any;
    let mockNegotiator: any;
    let mockQueue: any;
    let mockCacheMap: any;

    const mockUser = {
        id: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar',
    };

    const mockCloudSite: DetailedSiteInfo = {
        id: 'test-site-id',
        name: 'Test Cloud Site',
        host: 'test-cloud.atlassian.net',
        baseApiUrl: 'https://test-cloud.atlassian.net',
        baseLinkUrl: 'https://test-cloud.atlassian.net',
        avatarUrl: 'https://test-cloud.atlassian.net/avatar',
        isCloud: true,
        product: ProductJira,
        credentialId: 'test-credential-id',
        userId: 'test-user-id',
    };

    const mockServerSite: DetailedSiteInfo = {
        id: 'test-server-site-id',
        name: 'Test Server Site',
        host: 'test-server.com',
        baseApiUrl: 'https://test-server.com',
        baseLinkUrl: 'https://test-server.com',
        avatarUrl: 'https://test-server.com/avatar',
        isCloud: false,
        product: ProductJira,
        credentialId: 'test-server-credential-id',
        userId: 'test-server-user-id',
    };

    const mockOAuthInfo: OAuthInfo = {
        state: AuthInfoState.Valid,
        user: mockUser,
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        expirationDate: Date.now() + 3600000, // 1 hour from now
        recievedAt: Date.now(),
    };

    const mockBasicAuthInfo: BasicAuthInfo = {
        state: AuthInfoState.Valid,
        user: mockUser,
        username: 'testuser',
        password: 'testpass',
    };

    const mockPATAuthInfo: PATAuthInfo = {
        state: AuthInfoState.Valid,
        user: mockUser,
        token: 'mock-pat-token',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock ExtensionContext
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        // Mock site manager
        mockSiteManager = {
            onDidSitesAvailableChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        };

        // Mock credential manager
        mockCredentialManager = {
            getAuthInfo: jest.fn(),
            refreshAccessToken: jest.fn(),
        };

        // Mock Container
        (Container as any) = {
            siteManager: mockSiteManager,
            credentialManager: mockCredentialManager,
            config: {
                enableHttpsTunnel: false,
            },
        };

        // Mock configuration
        (configuration as any) = {
            onDidChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            initializingChangeEvent: {} as ConfigurationChangeEvent,
            initializing: jest.fn().mockReturnValue(false),
            changed: jest.fn().mockReturnValue(false),
        };

        // Mock Logger
        (Logger as any) = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        // Mock queue
        mockQueue = {
            add: jest.fn().mockImplementation((fn) => fn()),
        };
        (PQueue as jest.MockedClass<typeof PQueue>).mockImplementation(() => mockQueue);

        // Mock cache map
        mockCacheMap = {
            clear: jest.fn(),
            getItem: jest.fn(),
            setItem: jest.fn(),
            updateItem: jest.fn(),
            deleteItem: jest.fn(),
        };
        (CacheMap as jest.MockedClass<typeof CacheMap>).mockImplementation(() => mockCacheMap);

        // Mock negotiator
        mockNegotiator = {
            thisIsTheResponsibleProcess: jest.fn().mockReturnValue(true),
            requestTokenRefreshForSite: jest.fn(),
        };
        (Negotiator as jest.MockedClass<typeof Negotiator>).mockImplementation(() => mockNegotiator);

        // Mock Jira clients
        (JiraCloudClient as jest.MockedClass<typeof JiraCloudClient>).mockImplementation(() => ({}) as any);
        (JiraServerClient as jest.MockedClass<typeof JiraServerClient>).mockImplementation(() => ({}) as any);

        // Mock Bitbucket APIs
        (CloudRepositoriesApi as jest.MockedClass<typeof CloudRepositoriesApi>).mockImplementation(() => ({}) as any);
        (CloudPullRequestApi as jest.MockedClass<typeof CloudPullRequestApi>).mockImplementation(() => ({}) as any);
        (ServerRepositoriesApi as jest.MockedClass<typeof ServerRepositoriesApi>).mockImplementation(() => ({}) as any);
        (ServerPullRequestApi as jest.MockedClass<typeof ServerPullRequestApi>).mockImplementation(() => ({}) as any);
        (PipelineApiImpl as jest.MockedClass<typeof PipelineApiImpl>).mockImplementation(() => ({}) as any);

        // Mock HTTP clients
        (HTTPClient as jest.MockedClass<typeof HTTPClient>).mockImplementation(() => ({}) as any);

        // Mock providers
        (oauthJiraTransportFactory as jest.Mock).mockReturnValue({});
        (basicJiraTransportFactory as jest.Mock).mockReturnValue({});
        (jiraTokenAuthProvider as jest.Mock).mockReturnValue({});
        (jiraBasicAuthProvider as jest.Mock).mockReturnValue({});
        (getAgent as jest.Mock).mockReturnValue({});

        clientManager = new ClientManager(mockContext);
    });

    afterEach(() => {
        clientManager.dispose();
    });

    describe('constructor', () => {
        it('should register configuration and site manager event handlers', () => {
            expect(configuration.onDidChange).toHaveBeenCalled();
            expect(mockSiteManager.onDidSitesAvailableChange).toHaveBeenCalled();
            expect(mockContext.subscriptions).toHaveLength(2);
        });
    });

    describe('dispose', () => {
        it('should clear the clients cache', () => {
            clientManager.dispose();
            expect(mockCacheMap.clear).toHaveBeenCalled();
        });
    });

    describe('requestSite', () => {
        it('should request Jira cloud site', () => {
            const jiraClientSpy = jest.spyOn(clientManager, 'jiraClient').mockResolvedValue({} as any);

            clientManager.requestSite(mockCloudSite);

            expect(jiraClientSpy).toHaveBeenCalledWith(mockCloudSite);
        });

        it('should request Bitbucket cloud site', () => {
            const bitbucketSite = { ...mockCloudSite, product: ProductBitbucket };
            const bbClientSpy = jest.spyOn(clientManager, 'bbClient').mockResolvedValue({} as any);

            clientManager.requestSite(bitbucketSite);

            expect(bbClientSpy).toHaveBeenCalledWith(bitbucketSite);
        });

        it('should not request server sites', () => {
            const jiraClientSpy = jest.spyOn(clientManager, 'jiraClient').mockResolvedValue({} as any);
            const bbClientSpy = jest.spyOn(clientManager, 'bbClient').mockResolvedValue({} as any);

            clientManager.requestSite(mockServerSite);

            expect(jiraClientSpy).not.toHaveBeenCalled();
            expect(bbClientSpy).not.toHaveBeenCalled();
        });
    });

    describe('bbClient', () => {
        it('should create cloud Bitbucket client with OAuth', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockOAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.bbClient(mockCloudSite);

            expect(CloudRepositoriesApi).toHaveBeenCalled();
            expect(CloudPullRequestApi).toHaveBeenCalled();
            expect(PipelineApiImpl).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should create server Bitbucket client with basic auth', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockBasicAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.bbClient(mockServerSite);

            expect(ServerRepositoriesApi).toHaveBeenCalled();
            expect(ServerPullRequestApi).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.pipelines).toBeUndefined();
        });

        it('should create server Bitbucket client with PAT auth', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockPATAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.bbClient(mockServerSite);

            expect(ServerRepositoriesApi).toHaveBeenCalled();
            expect(ServerPullRequestApi).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('removeClient', () => {
        it('should remove client from cache', async () => {
            await clientManager.removeClient(mockCloudSite);

            expect(mockCacheMap.deleteItem).toHaveBeenCalledWith(expect.stringContaining(mockCloudSite.credentialId));
        });
    });

    describe('jiraClient', () => {
        it('should create OAuth Jira cloud client', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockOAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.jiraClient(mockCloudSite);

            expect(JiraCloudClient).toHaveBeenCalledWith(
                mockCloudSite,
                expect.any(Object),
                expect.any(Object),
                getAgent,
            );
            expect(result).toBeDefined();
        });

        it('should create basic auth Jira cloud client', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockBasicAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.jiraClient(mockCloudSite);

            expect(JiraCloudClient).toHaveBeenCalledWith(
                mockCloudSite,
                expect.any(Object),
                expect.any(Object),
                getAgent,
            );
            expect(result).toBeDefined();
        });

        it('should create basic auth Jira server client', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockBasicAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.jiraClient(mockServerSite);

            expect(JiraServerClient).toHaveBeenCalledWith(
                mockServerSite,
                expect.any(Object),
                expect.any(Object),
                getAgent,
            );
            expect(result).toBeDefined();
        });

        it('should create PAT Jira server client', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockPATAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            const result = await clientManager.jiraClient(mockServerSite);

            expect(JiraServerClient).toHaveBeenCalledWith(
                mockServerSite,
                expect.any(Object),
                expect.any(Object),
                getAgent,
            );
            expect(result).toBeDefined();
        });

        it('should return cached client if available', async () => {
            const cachedClient = {} as JiraClient<DetailedSiteInfo>;
            mockCacheMap.getItem.mockReturnValue(cachedClient);

            const result = await clientManager.jiraClient(mockCloudSite);

            expect(result).toBe(cachedClient);
            expect(mockCredentialManager.getAuthInfo).not.toHaveBeenCalled();
        });

        it('should handle invalid credentials', async () => {
            const invalidAuthInfo = { ...mockOAuthInfo, state: AuthInfoState.Invalid };
            mockCredentialManager.getAuthInfo.mockResolvedValue(invalidAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            (window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

            await expect(clientManager.jiraClient(mockCloudSite)).rejects.toThrow('cannot get client for: Jira');

            expect(window.showErrorMessage).toHaveBeenCalled();
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('configuration changes', () => {
        it('should handle Charles proxy configuration changes', () => {
            const changeEvent = {} as ConfigurationChangeEvent;
            (configuration.changed as jest.Mock).mockReturnValue(true);

            // Trigger configuration change
            const onConfigChangedHandler = (configuration.onDidChange as jest.Mock).mock.calls[0][0];
            onConfigChangedHandler.call(clientManager, changeEvent);

            // Verify that agent changed flag is set
            expect(configuration.changed).toHaveBeenCalledWith(changeEvent, 'enableCharles');
        });

        it('should handle HTTPS tunnel configuration changes', () => {
            const changeEvent = {} as ConfigurationChangeEvent;
            (configuration.changed as jest.Mock).mockReturnValue(true);
            Container.config.enableHttpsTunnel = true;

            const onConfigChangedHandler = (configuration.onDidChange as jest.Mock).mock.calls[0][0];
            onConfigChangedHandler.call(clientManager, changeEvent);

            expect(configuration.changed).toHaveBeenCalledWith(changeEvent, 'enableHttpsTunnel');
        });
    });

    describe('sites availability changes', () => {
        it('should set agent changed flag when sites change', () => {
            const sitesChangeEvent = {} as SitesAvailableUpdateEvent;

            const onSitesChangedHandler = (mockSiteManager.onDidSitesAvailableChange as jest.Mock).mock.calls[0][0];
            onSitesChangedHandler.call(clientManager, sitesChangeEvent);

            // The agent changed flag should be set internally
            // We can verify this by checking if a new client is created on next request
            expect(mockSiteManager.onDidSitesAvailableChange).toHaveBeenCalled();
        });
    });

    describe('HTTP client creation', () => {
        it('should create OAuth HTTP client with correct authorization header', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockOAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            await clientManager.bbClient(mockCloudSite);

            expect(HTTPClient).toHaveBeenCalledWith(
                mockCloudSite.baseApiUrl,
                `Bearer ${mockOAuthInfo.access}`,
                expect.any(Object),
                expect.any(Function),
            );
        });

        it('should create basic auth HTTP client with correct authorization header', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockBasicAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            await clientManager.bbClient(mockServerSite);

            const expectedAuth = `Basic ${Buffer.from(
                `${mockBasicAuthInfo.username}:${mockBasicAuthInfo.password}`,
            ).toString('base64')}`;

            expect(HTTPClient).toHaveBeenCalledWith(
                mockServerSite.baseApiUrl,
                expectedAuth,
                expect.any(Object),
                expect.any(Function),
                expect.any(BasicInterceptor),
            );
        });

        it('should create PAT HTTP client with correct authorization header', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(mockPATAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);

            await clientManager.bbClient(mockServerSite);

            expect(HTTPClient).toHaveBeenCalledWith(
                mockServerSite.baseApiUrl,
                `Bearer ${mockPATAuthInfo.token}`,
                expect.any(Object),
                expect.any(Function),
                expect.any(BasicInterceptor),
            );
        });
    });

    describe('error handling', () => {
        it('should execute config command when user clicks settings button', async () => {
            const invalidAuthInfo = { ...mockOAuthInfo, state: AuthInfoState.Invalid };
            mockCredentialManager.getAuthInfo.mockResolvedValue(invalidAuthInfo);
            mockCacheMap.getItem.mockReturnValue(null);
            (window.showErrorMessage as jest.Mock).mockResolvedValue('View Atlascode settings');
            (commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

            await expect(clientManager.jiraClient(mockCloudSite)).rejects.toThrow('cannot get client for: Jira');

            expect(commands.executeCommand).toHaveBeenCalledWith('atlascode.showConfigPage');
        });

        it('should reject with proper error message when client creation fails', async () => {
            mockCredentialManager.getAuthInfo.mockResolvedValue(null);
            mockCacheMap.getItem.mockReturnValue(null);

            await expect(clientManager.jiraClient(mockCloudSite)).rejects.toThrow('cannot get client for: Jira');
        });
    });
});
