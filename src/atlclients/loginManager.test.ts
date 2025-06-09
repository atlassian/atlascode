import { it } from '@jest/globals';
import { AxiosInstance } from 'axios';
import { forceCastTo } from 'testsutil';
import { Memento } from 'vscode';

import * as analytics from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import * as jira_client_providers from '../jira/jira-client/providers';
import { SiteManager } from '../siteManager';
import {
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    OAuthProvider,
    OAuthResponse,
    PATAuthInfo,
    Product,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
    UserInfo,
} from './authInfo';
import * as authInfo from './authInfo';
import { CredentialManager } from './authStore';
import { LoginManager } from './loginManager';
import { OAuthDancer } from './oauthDancer';

jest.mock('./authStore');
jest.mock('../siteManager');
jest.mock('../analytics-node-client/src/client.min.js');

jest.mock('../analytics', () => ({
    authenticatedEvent: () => Promise.resolve(forceCastTo<TrackEvent>({})),
    editedEvent: () => Promise.resolve(forceCastTo<TrackEvent>({})),
}));

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: () => Promise.resolve(),
        },
        config: {
            enableCurlLogging: false,
        },
    },
}));

jest.mock('./strategyCrypto', () => {
    return {
        createVerifier: jest.fn(() => 'verifier'),
        base64URLEncode: jest.fn(() => 'base64URLEncode'),
        sha256: jest.fn(() => 'sha256'),
        basicAuth: jest.fn(() => 'basicAuth'),
    };
});

const mockedAxiosInstance = forceCastTo<AxiosInstance>(() =>
    Promise.resolve({
        headers: { 'x-ausername': 'whoknows' },
        data: {
            name: 'nome',
            slug: 'lumaca',
            displayName: 'nome visualizzato',
            emailAddress: 'indirizzo@email',
            avatarUrl: 'avatarUrl',
            avatarUrls: { '48x48': '48x48' },
        },
    }),
);

jest.mock('./oauthDancer', () => ({
    OAuthDancer: {
        Instance: {
            doDance: () => {},
            doInitRemoteDance: () => {},
            doFinishRemoteDance: () => {},
            getAxiosInstance: () => mockedAxiosInstance,
        },
    },
}));

describe('LoginManager', () => {
    let loginManager: LoginManager;
    let credentialManager: CredentialManager;
    let siteManager: SiteManager;
    let analyticsClient: AnalyticsClient;
    let oauthDancer: OAuthDancer;

    beforeEach(() => {
        credentialManager = new CredentialManager(forceCastTo<AnalyticsClient>(undefined));
        siteManager = new SiteManager(forceCastTo<Memento>(undefined));
        analyticsClient = new AnalyticsClient();
        oauthDancer = OAuthDancer.Instance;

        loginManager = new LoginManager(credentialManager, siteManager, analyticsClient);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('userInitiatedOAuthLogin', () => {
        it('should throw an error if no provider is found', async () => {
            const site: SiteInfo = { host: 'unknown.host.it', product: ProductJira };
            await expect(loginManager.userInitiatedOAuthLogin(site, 'callback')).rejects.toThrow(
                'No provider found for unknown.host.it',
            );
        });

        it('should call saveDetails with correct parameters', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const provider = OAuthProvider.JiraCloud;
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1234,
                receivedAt: 1234,
                user,
                accessibleResources: [],
            };

            jest.spyOn(oauthDancer, 'doDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'saveDetails');
            jest.spyOn(authInfo, 'oauthProviderForSite').mockReturnValue(provider);

            await loginManager.userInitiatedOAuthLogin(site, 'callback');

            expect(oauthDancer.doDance).toHaveBeenCalledWith(provider, site, 'callback');
            expect(loginManager['saveDetails']).toHaveBeenCalledWith(provider, site, resp, undefined, undefined);
        });
    });

    describe('initRemoteAuth', () => {
        it('should call doInitRemoteDance with correct state', async () => {
            const state = { key: 'value' };
            jest.spyOn(oauthDancer, 'doInitRemoteDance');

            await loginManager.initRemoteAuth(state);

            expect(oauthDancer.doInitRemoteDance).toHaveBeenCalledWith(state);
        });
    });

    describe('finishRemoteAuth', () => {
        it('should call saveDetails with correct parameters', async () => {
            const code = 'code';
            const provider = OAuthProvider.JiraCloudRemote;
            const site = { host: 'https://jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1235,
                receivedAt: 1235,
                user,
                accessibleResources: [],
            };
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(oauthDancer, 'doFinishRemoteDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'getOAuthSiteDetails').mockResolvedValue([siteDetails]);
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(siteManager as any, 'addSites');

            await loginManager.finishRemoteAuth(code);

            expect(oauthDancer.doFinishRemoteDance).toHaveBeenCalledWith(provider, site, code);
            expect(credentialManager.saveAuthInfo).toHaveBeenCalledWith(siteDetails, expect.anything());
            expect(siteManager.addSites).toHaveBeenCalled();
        });
    });

    describe('userInitiatedServerLogin', () => {
        it.each([ProductJira, ProductBitbucket])(
            'should call saveDetailsForSite with correct parameters for BasicAuthInfo',
            async (product: Product) => {
                const site: SiteInfo = { host: `${product.key}.atlassian.com`, product };
                const user = forceCastTo<UserInfo>({ id: 'user' });
                const authInfoData: BasicAuthInfo = {
                    username: 'user',
                    password: 'pass',
                    user,
                    state: AuthInfoState.Valid,
                };
                const siteDetails = forceCastTo<DetailedSiteInfo>({ host: `${product.key}.atlassian.com`, product });

                jest.spyOn(loginManager as any, 'saveDetailsForSite').mockResolvedValue(Promise.resolve(siteDetails));
                jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
                jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
                jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

                await loginManager.userInitiatedServerLogin(site, authInfoData);

                expect(loginManager['saveDetailsForSite']).toHaveBeenCalledWith(site, authInfoData);
                expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
            },
        );

        it.each([ProductJira, ProductBitbucket])(
            'should call saveDetailsForSite with correct parameters for PATAuthInfo',
            async (product: Product) => {
                const site: SiteInfo = { host: `${product.key}.atlassian.com`, product };
                const authInfoData = { token: 'token' } as unknown as PATAuthInfo;
                const siteDetails = forceCastTo<DetailedSiteInfo>({ host: `${product.key}.atlassian.com`, product });

                jest.spyOn(loginManager as any, 'saveDetailsForSite').mockResolvedValue(siteDetails);
                jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(false);
                jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(true);
                jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

                await loginManager.userInitiatedServerLogin(site, authInfoData);

                expect(loginManager['saveDetailsForSite']).toHaveBeenCalledWith(site, authInfoData);
                expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
            },
        );

        it.each([ProductJira, ProductBitbucket])(
            'should throw an error if authentication fails',
            async (product: Product) => {
                const site: SiteInfo = { host: `${product.key}.atlassian.com`, product };
                const user = forceCastTo<UserInfo>({ id: 'user' });
                const authInfoData: BasicAuthInfo = {
                    username: 'user',
                    password: 'pass',
                    user,
                    state: AuthInfoState.Valid,
                };

                jest.spyOn(loginManager as any, 'saveDetailsForSite').mockRejectedValue(
                    new Error('Authentication failed'),
                );
                jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
                jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);

                await expect(loginManager.userInitiatedServerLogin(site, authInfoData)).rejects.toEqual(
                    `Error authenticating with ${product.name}: Error: Authentication failed`,
                );
            },
        );

        it.each([ProductJira, ProductBitbucket])('should save auth info and new sites', async (product: Product) => {
            const site: SiteInfo = { host: `${product.key}.atlassian.com`, product };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
            jest.spyOn(analytics, 'authenticatedEvent');
            jest.spyOn(jira_client_providers, 'getAxiosInstance').mockReturnValue(mockedAxiosInstance);
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(siteManager as any, 'addOrUpdateSite');

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(credentialManager.saveAuthInfo).toHaveBeenCalled();
            expect(siteManager.addOrUpdateSite).toHaveBeenCalled();
        });
    });

    describe('updatedServerInfo', () => {
        it('should call saveDetailsForSite with correct parameters for BasicAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(loginManager as any, 'saveDetailsForSite').mockResolvedValue(site);
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.updateInfo(site, authInfoData);

            expect(loginManager['saveDetailsForSite']).toHaveBeenCalledWith(site, authInfoData);
            expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
        });

        it('should throw an error if authentication fails', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(loginManager as any, 'saveDetailsForSite').mockRejectedValue(new Error('Authentication failed'));
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);

            await expect(loginManager.updateInfo(site, authInfoData)).rejects.toEqual(
                'Error authenticating with Jira: Error: Authentication failed',
            );
        });
    });

    describe('extractTokenFromGitRemoteRegex', () => {
        it('should extract token from git remote URL', () => {
            const line = 'origin  https://x-token-auth:abc123token@bitbucket.org/user/repo.git (fetch)';
            const result = loginManager['extractTokenFromGitRemoteRegex'](line);
            expect(result).toBe('abc123token');
        });

        it('should return null if no token is found', () => {
            const line = 'origin  https://bitbucket.org/user/repo.git (fetch)';
            const result = loginManager['extractTokenFromGitRemoteRegex'](line);
            expect(result).toBeNull();
        });

        it('should return null for invalid URL format', () => {
            const line = 'origin  git@bitbucket.org:user/repo.git (fetch)';
            const result = loginManager['extractTokenFromGitRemoteRegex'](line);
            expect(result).toBeNull();
        });
    });

    describe('getAuthTokenFromGitRemote', () => {
        beforeEach(() => {
            jest.spyOn(loginManager as any, 'extractTokenFromGitRemoteRegex');
        });

        it('should extract token from git remote command output', async () => {
            // Mock the vscode workspace
            const mockWorkspaceFolders = [{ uri: { fsPath: '/path/to/workspace' } }];
            jest.spyOn(require('vscode').workspace, 'workspaceFolders', 'get').mockReturnValue(mockWorkspaceFolders);

            // Mock child_process.exec
            const mockExec = jest.fn((cmd, options, callback) => {
                callback(null, 'origin  https://x-token-auth:abc123token@bitbucket.org/user/repo.git (fetch)');
                return { on: jest.fn() };
            });
            jest.spyOn(require('child_process'), 'exec').mockImplementation(mockExec);

            // Mock extractTokenFromGitRemoteRegex
            jest.spyOn(loginManager as any, 'extractTokenFromGitRemoteRegex').mockReturnValue('abc123token');

            const result = await loginManager['getAuthTokenFromGitRemote']();

            expect(mockExec).toHaveBeenCalledWith('git remote -v', { cwd: '/path/to/workspace' }, expect.any(Function));
            expect(loginManager['extractTokenFromGitRemoteRegex']).toHaveBeenCalled();
            expect(result).toBe('abc123token');
        });

        it('should return null if no workspace folder is found', async () => {
            // Mock empty workspace folders
            jest.spyOn(require('vscode').workspace, 'workspaceFolders', 'get').mockReturnValue(null);

            const result = await loginManager['getAuthTokenFromGitRemote']();

            expect(result).toBeNull();
        });

        it('should return null if git command fails', async () => {
            // Mock workspace folders
            const mockWorkspaceFolders = [{ uri: { fsPath: '/path/to/workspace' } }];
            jest.spyOn(require('vscode').workspace, 'workspaceFolders', 'get').mockReturnValue(mockWorkspaceFolders);

            // Mock child_process.exec with an error
            const mockExec = jest.fn((cmd, options, callback) => {
                callback(new Error('git command failed'), '');
                return { on: jest.fn() };
            });
            jest.spyOn(require('child_process'), 'exec').mockImplementation(mockExec);

            const result = await loginManager['getAuthTokenFromGitRemote']();

            expect(result).toBeNull();
        });

        it('should return null if no token is found in git remote output', async () => {
            // Mock workspace folders
            const mockWorkspaceFolders = [{ uri: { fsPath: '/path/to/workspace' } }];
            jest.spyOn(require('vscode').workspace, 'workspaceFolders', 'get').mockReturnValue(mockWorkspaceFolders);

            // Mock child_process.exec with output not containing a token
            const mockExec = jest.fn((cmd, options, callback) => {
                callback(null, 'origin  https://bitbucket.org/user/repo.git (fetch)');
                return { on: jest.fn() };
            });
            jest.spyOn(require('child_process'), 'exec').mockImplementation(mockExec);

            // Mock extractTokenFromGitRemoteRegex to return null
            jest.spyOn(loginManager as any, 'extractTokenFromGitRemoteRegex').mockReturnValue(null);

            const result = await loginManager['getAuthTokenFromGitRemote']();

            expect(result).toBeNull();
        });
    });

    describe('getAuthTokenFromHomeGitCredentials', () => {
        it('should extract token from git credentials file', async () => {
            // Mock fs/promises.readFile
            const mockReadFile = jest.fn().mockResolvedValue('https://x-token-auth:abc123token@bitbucket.org');
            jest.spyOn(require('fs/promises'), 'readFile').mockImplementation(mockReadFile);

            // Mock os.homedir
            jest.spyOn(require('os'), 'homedir').mockReturnValue('/home/user');

            // Mock extractTokenFromGitRemoteRegex
            jest.spyOn(loginManager as any, 'extractTokenFromGitRemoteRegex').mockReturnValue('abc123token');

            const result = await loginManager['getAuthTokenFromHomeGitCredentials']();

            expect(mockReadFile).toHaveBeenCalledWith('/home/user/.git-credentials', 'utf-8');
            expect(loginManager['extractTokenFromGitRemoteRegex']).toHaveBeenCalledWith(
                'https://x-token-auth:abc123token@bitbucket.org',
            );
            expect(result).toBe('abc123token');
        });

        it('should return null if reading credentials file fails', async () => {
            // Mock fs/promises.readFile to throw an error
            jest.spyOn(require('fs/promises'), 'readFile').mockRejectedValue(new Error('File not found'));

            const result = await loginManager['getAuthTokenFromHomeGitCredentials']();

            expect(result).toBeNull();
        });

        it('should return null if no token is found in credentials file', async () => {
            // Mock fs/promises.readFile
            jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue('https://username:password@bitbucket.org');

            // Mock extractTokenFromGitRemoteRegex to return null
            jest.spyOn(loginManager as any, 'extractTokenFromGitRemoteRegex').mockReturnValue(null);

            const result = await loginManager['getAuthTokenFromHomeGitCredentials']();

            expect(result).toBeNull();
        });
    });

    describe('authenticateWithBitbucketToken', () => {
        beforeEach(() => {
            jest.spyOn(loginManager as any, 'getAuthTokenFromGitRemote');
            jest.spyOn(loginManager as any, 'getAuthTokenFromHomeGitCredentials');
        });

        it('should authenticate with token from git remote', async () => {
            // Mock token retrieval methods
            jest.spyOn(loginManager as any, 'getAuthTokenFromGitRemote').mockResolvedValue('abc123token');
            jest.spyOn(loginManager as any, 'getAuthTokenFromHomeGitCredentials').mockResolvedValue(null);

            // Mock BitbucketResponseHandler.user
            const mockUserData = {
                id: 'user123',
                displayName: 'Test User',
                email: 'test@example.com',
                avatarUrl: 'https://example.com/avatar.png',
            };
            jest.spyOn(loginManager['_bitbucketResponseHandler'], 'user').mockResolvedValue(mockUserData);

            // Mock getOAuthSiteDetails
            const mockSiteDetails = {
                id: 'site123',
                product: ProductBitbucket,
                host: 'bitbucket.org',
            } as DetailedSiteInfo;
            jest.spyOn(loginManager, 'getOAuthSiteDetails').mockResolvedValue([mockSiteDetails]);

            // Mock credential manager and site manager
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(siteManager, 'addSites');

            // Mock setTimeout
            jest.spyOn(global, 'setTimeout');

            const result = await loginManager.authenticateWithBitbucketToken();

            expect(loginManager['getAuthTokenFromGitRemote']).toHaveBeenCalled();
            expect(loginManager['_bitbucketResponseHandler'].user).toHaveBeenCalledWith('abc123token');
            expect(credentialManager.saveAuthInfo).toHaveBeenCalled();
            expect(siteManager.addSites).toHaveBeenCalledWith([mockSiteDetails]);
            expect(setTimeout).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should authenticate with token from git credentials file when git remote fails', async () => {
            // Mock token retrieval methods
            jest.spyOn(loginManager as any, 'getAuthTokenFromGitRemote').mockResolvedValue(null);
            jest.spyOn(loginManager as any, 'getAuthTokenFromHomeGitCredentials').mockResolvedValue('abc123token');

            // Mock BitbucketResponseHandler.user
            const mockUserData = {
                id: 'user123',
                displayName: 'Test User',
                email: 'test@example.com',
                avatarUrl: 'https://example.com/avatar.png',
            };
            jest.spyOn(loginManager['_bitbucketResponseHandler'], 'user').mockResolvedValue(mockUserData);

            // Mock getOAuthSiteDetails
            const mockSiteDetails = {
                id: 'site123',
                product: ProductBitbucket,
                host: 'bitbucket.org',
            } as DetailedSiteInfo;
            jest.spyOn(loginManager, 'getOAuthSiteDetails').mockResolvedValue([mockSiteDetails]);

            // Mock credential manager and site manager
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();

            const result = await loginManager.authenticateWithBitbucketToken();

            expect(loginManager['getAuthTokenFromHomeGitCredentials']).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false if no token is found', async () => {
            // Mock token retrieval methods to return null
            jest.spyOn(loginManager as any, 'getAuthTokenFromGitRemote').mockResolvedValue(null);
            jest.spyOn(loginManager as any, 'getAuthTokenFromHomeGitCredentials').mockResolvedValue(null);

            // Mock window.showErrorMessage
            jest.spyOn(require('vscode').window, 'showErrorMessage');

            const result = await loginManager.authenticateWithBitbucketToken();

            expect(require('vscode').window.showErrorMessage).toHaveBeenCalledWith(
                'No hardcoded Bitbucket auth token found',
            );
            expect(result).toBe(false);
        });

        it('should return false if authentication fails', async () => {
            // Mock token retrieval method
            jest.spyOn(loginManager as any, 'getAuthTokenFromGitRemote').mockResolvedValue('abc123token');

            // Mock BitbucketResponseHandler.user to throw an error
            jest.spyOn(loginManager['_bitbucketResponseHandler'], 'user').mockRejectedValue(
                new Error('Authentication failed'),
            );

            // Mock window.showErrorMessage
            jest.spyOn(require('vscode').window, 'showErrorMessage');

            const result = await loginManager.authenticateWithBitbucketToken();

            expect(require('vscode').window.showErrorMessage).toHaveBeenCalledWith(
                'Error authenticating with Bitbucket token: Error: Authentication failed',
            );
            expect(result).toBe(false);
        });

        it('should not add site to site manager when refresh=true', async () => {
            // Mock token retrieval methods
            jest.spyOn(loginManager as any, 'getAuthTokenFromGitRemote').mockResolvedValue('abc123token');

            // Mock BitbucketResponseHandler.user
            const mockUserData = {
                id: 'user123',
                displayName: 'Test User',
                email: 'test@example.com',
                avatarUrl: 'https://example.com/avatar.png',
            };
            jest.spyOn(loginManager['_bitbucketResponseHandler'], 'user').mockResolvedValue(mockUserData);

            // Mock getOAuthSiteDetails
            const mockSiteDetails = {
                id: 'site123',
                product: ProductBitbucket,
                host: 'bitbucket.org',
            } as DetailedSiteInfo;
            jest.spyOn(loginManager, 'getOAuthSiteDetails').mockResolvedValue([mockSiteDetails]);

            // Mock credential manager and site manager
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(siteManager, 'addSites');

            const result = await loginManager.authenticateWithBitbucketToken(true);

            expect(siteManager.addSites).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });
});
