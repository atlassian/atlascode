import { Memento } from 'vscode';

import { forceCastTo } from '../../testsutil';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { SiteManager } from '../siteManager';
import {
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    OAuthProvider,
    OAuthResponse,
    PATAuthInfo,
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
            expect(loginManager['saveDetails']).toHaveBeenCalledWith(provider, site, resp, undefined);
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

            jest.spyOn(oauthDancer, 'doFinishRemoteDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'saveDetails');

            await loginManager.finishRemoteAuth(code);

            expect(oauthDancer.doFinishRemoteDance).toHaveBeenCalledWith(provider, site, code);
            expect(loginManager['saveDetails']).toHaveBeenCalledWith(provider, site, resp, false);
        });
    });

    describe('userInitiatedServerLogin', () => {
        it('should call saveDetailsForServerSite with correct parameters for BasicAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockResolvedValue(Promise.resolve(siteDetails));
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['saveDetailsForServerSite']).toHaveBeenCalledWith(site, authInfoData);
            expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
        });

        it('should call saveDetailsForServerSite with correct parameters for PATAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const authInfoData = { token: 'token' } as unknown as PATAuthInfo;
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockResolvedValue(siteDetails);
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(false);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(true);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['saveDetailsForServerSite']).toHaveBeenCalledWith(site, authInfoData);
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

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockRejectedValue(
                new Error('Authentication failed'),
            );
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);

            await expect(loginManager.userInitiatedServerLogin(site, authInfoData)).rejects.toEqual(
                'Error authenticating with Jira: Error: Authentication failed',
            );
        });
    });

    describe('updatedServerInfo', () => {
        it('should call saveDetailsForServerSite with correct parameters for BasicAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockResolvedValue(site);
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.updatedServerInfo(site, authInfoData);

            expect(loginManager['saveDetailsForServerSite']).toHaveBeenCalledWith(site, authInfoData);
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

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockRejectedValue(
                new Error('Authentication failed'),
            );
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);

            await expect(loginManager.updatedServerInfo(site, authInfoData)).rejects.toEqual(
                'Error authenticating with Jira: Error: Authentication failed',
            );
        });
    });
});
