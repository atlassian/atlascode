import { it } from '@jest/globals';
import { AxiosInstance } from 'axios';
import { forceCastTo } from 'testsutil';
import { Memento } from 'vscode';

import * as analytics from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { Container } from '../container';
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

jest.mock('./oauthDancer', () => ({
    OAuthDancer: {
        Instance: {
            doDance: () => {},
            doInitRemoteDance: () => {},
            doFinishRemoteDance: () => {},
        },
    },
}));

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: () => Promise.resolve(),
            removeClient: jest.fn(),
        },
        siteManager: {
            getSitesAvailable: jest.fn(),
            removeSite: jest.fn(),
            addOrUpdateSite: jest.fn(),
        },
    },
}));

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

describe('LoginManager', () => {
    let loginManager: LoginManager;
    let credentialManager: CredentialManager;
    let siteManager: SiteManager;
    let analyticsClient: AnalyticsClient;
    let oauthDancer: OAuthDancer;

    beforeEach(() => {
        credentialManager = new CredentialManager(Container.context, forceCastTo<AnalyticsClient>(undefined));
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

        it('removes token site when connecting a new one', async () => {
            const existingTokenSite = forceCastTo<DetailedSiteInfo>({
                host: 'mock-token-site.atlassian.net',
                name: 'mock-token-site.atlassian.net',
                product: ProductJira,
                isCloud: true,
                contextPath: '/',
            });

            jest.spyOn(siteManager, 'getSitesAvailable').mockReturnValue([existingTokenSite]);

            const showInfoMessageSpy = jest
                .spyOn(require('vscode').window, 'showInformationMessage')
                .mockResolvedValue('OK');

            expect(loginManager['isSiteAddedViaToken'](existingTokenSite)).toBe(true);

            await loginManager['removeTokenConnectedSites']();

            expect(Container.clientManager.removeClient).toHaveBeenCalledWith(existingTokenSite);
            expect(Container.siteManager.removeSite).toHaveBeenCalledWith(existingTokenSite, true, true);

            expect(showInfoMessageSpy).toHaveBeenCalledWith(
                'Currently only one Jira site can be connected via API token at a time. The previous Jira site has been disconnected to connect the new one.',
            );
        });

        it('restores OAuth site when removing API token site', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                json: jest.fn().mockResolvedValue({ cloudId: 'test-cloud-id' }),
            });

            const apiTokenSite = forceCastTo<DetailedSiteInfo>({
                host: 'example.atlassian.net',
                name: 'example.atlassian.net',
                product: ProductJira,
                isCloud: true,
                contextPath: '/',
                userId: 'user-123',
            });

            const oauthSite = forceCastTo<DetailedSiteInfo>({
                host: 'different.atlassian.net',
                name: 'different',
                product: ProductJira,
                isCloud: true,
                userId: 'user-123',
                credentialId: 'oauth-cred-id',
            });

            const mockOAuthInfo = {
                access: 'access-token',
                refresh: 'refresh-token',
                user: {
                    id: 'user-123',
                    displayName: 'Test User',
                    email: 'test@example.com',
                    avatarUrl: 'https://avatar.url/test.png',
                },
                state: AuthInfoState.Valid,
            };

            jest.spyOn(siteManager, 'getSitesAvailable').mockReturnValue([apiTokenSite, oauthSite]);
            jest.spyOn(credentialManager, 'getAuthInfo').mockResolvedValue(mockOAuthInfo);
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(siteManager, 'addSites').mockImplementation();

            await loginManager['removeTokenConnectedSites']();

            expect(Container.clientManager.removeClient).toHaveBeenCalledWith(apiTokenSite);
            expect(Container.siteManager.removeSite).toHaveBeenCalledWith(apiTokenSite, true, true);

            expect(global.fetch).toHaveBeenCalledWith('https://example.atlassian.net/_edge/tenant_info');
            expect(credentialManager.getAuthInfo).toHaveBeenCalledWith(oauthSite, false);
            expect(credentialManager.saveAuthInfo).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'example.atlassian.net',
                    baseLinkUrl: 'https://example.atlassian.net',
                    baseApiUrl: 'https://api.atlassian.com/ex/jira/test-cloud-id/rest',
                    id: 'test-cloud-id',
                    name: 'example',
                }),
                mockOAuthInfo,
            );
            expect(siteManager.addSites).toHaveBeenCalledWith([
                expect.objectContaining({
                    host: 'example.atlassian.net',
                    baseLinkUrl: 'https://example.atlassian.net',
                    baseApiUrl: 'https://api.atlassian.com/ex/jira/test-cloud-id/rest',
                    id: 'test-cloud-id',
                    name: 'example',
                }),
            ]);
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
});
