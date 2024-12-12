import * as vscode from 'vscode';

import {
    AccessibleResource,
    AuthInfo,
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    OAuthInfo,
    OAuthProvider,
    OAuthResponse,
    PATAuthInfo,
    Product,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
    isBasicAuthInfo,
    isPATAuthInfo,
    oauthProviderForSite,
} from './authInfo';
import { authenticatedEvent, editedEvent } from '../analytics';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';

import { BitbucketAuthenticator } from './bitbucketAuthenticator';
import { CredentialManager } from './authStore';
import { JiraAuthentictor as JiraAuthenticator } from './jiraAuthenticator';
import { Logger } from '../logger';
import { OAuthDancer } from './oauthDancer';
import { SiteManager } from '../siteManager';

export class LoginManager {
    private _dancer: OAuthDancer = OAuthDancer.Instance;
    private _jiraAuthenticator: JiraAuthenticator;
    private _bitbucketAuthenticator: BitbucketAuthenticator;

    constructor(
        private _credentialManager: CredentialManager,
        private _siteManager: SiteManager,
        private _analyticsClient: AnalyticsClient,
    ) {
        this._bitbucketAuthenticator = new BitbucketAuthenticator();
        this._jiraAuthenticator = new JiraAuthenticator();
    }

    // this is *only* called when login buttons are clicked by the user
    public async userInitiatedOAuthLogin(site: SiteInfo, callback: string): Promise<void> {
        const provider = oauthProviderForSite(site)!;
        if (!provider) {
            throw new Error(`No provider found for ${site.host}`);
        }
        const resp = await this._dancer.doDance(provider, site, callback);
        this.saveDetails(provider, site, resp);
    }

    private async saveDetails(provider: OAuthProvider, site: SiteInfo, resp: OAuthResponse) {
        try {
            const oauthInfo: OAuthInfo = {
                access: resp.access,
                refresh: resp.refresh,
                iat: resp.iat,
                expirationDate: resp.expirationDate,
                recievedAt: resp.receivedAt,
                user: resp.user,
                state: AuthInfoState.Valid,
            };

            const siteDetails = await this.getOAuthSiteDetails(
                site.product,
                provider,
                resp.user.id,
                resp.accessibleResources,
            );

            siteDetails.forEach(async (siteInfo) => {
                await this._credentialManager.saveAuthInfo(siteInfo, oauthInfo);
                this._siteManager.addSites([siteInfo]);
                authenticatedEvent(siteInfo).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            });
        } catch (e) {
            Logger.error(e, 'Error authenticating');
            vscode.window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${e}`);
        }
    }

    private async getOAuthSiteDetails(
        product: Product,
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[],
    ): Promise<DetailedSiteInfo[]> {
        switch (product.key) {
            case ProductBitbucket.key:
                return this._bitbucketAuthenticator.getOAuthSiteDetails(provider, userId, resources);
            case ProductJira.key:
                return this._jiraAuthenticator.getOAuthSiteDetails(provider, userId, resources);
        }

        return [];
    }

    public async userInitiatedServerLogin(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo) || isPATAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForServerSite(site, authInfo);
                authenticatedEvent(siteDetails).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            } catch (err) {
                const errorString = `Error authenticating with ${site.product.name}: ${err}`;
                Logger.error(new Error(errorString));
                return Promise.reject(errorString);
            }
        }
    }

    public async updatedServerInfo(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForServerSite(site, authInfo);
                editedEvent(siteDetails).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            } catch (err) {
                const errorString = `Error authenticating with ${site.product.name}: ${err}`;
                Logger.error(new Error(errorString));
                return Promise.reject(errorString);
            }
        }
    }

    private authHeader(credentials: BasicAuthInfo | PATAuthInfo) {
        if (isBasicAuthInfo(credentials)) {
            return 'Basic ' + new Buffer(credentials.username + ':' + credentials.password).toString('base64');
        } else if (isPATAuthInfo(credentials)) {
            return `Bearer ${credentials.token}`;
        }
        Logger.warn(`Trying to construct auth header for non basic / non PAT auth info`);
        return '';
    }

    private async saveDetailsForServerSite(
        site: SiteInfo,
        credentials: BasicAuthInfo | PATAuthInfo,
    ): Promise<DetailedSiteInfo> {
        const authHeader = this.authHeader(credentials);
        // For cloud instances we can use the user ID as the credential ID (they're globally unique). Server instances
        // will have a much smaller pool of user IDs so we use an arbitrary UUID as the credential ID.

        let siteDetailsUrl = '';
        let avatarUrl = '';
        let apiUrl = '';
        const protocol = site.protocol ? site.protocol : 'https:';
        const contextPath = site.contextPath ? site.contextPath : '';
        const transport = getAxiosInstance();
        switch (site.product.key) {
            case ProductJira.key:
                siteDetailsUrl = `${protocol}//${site.host}${contextPath}/rest/api/2/myself`;
                avatarUrl = `${protocol}//${site.host}${contextPath}/images/fav-jcore.png`;
                apiUrl = `${protocol}//${site.host}${contextPath}/rest`;
                break;
            case ProductBitbucket.key:
                apiUrl = `${protocol}//${site.host}${contextPath}`;
                // Needed when using a API key to login (credentials is PATAuthInfo):
                const res = await transport(`${apiUrl}/rest/api/latest/build/capabilities`, {
                    method: 'GET',
                    headers: {
                        Authorization: authHeader,
                    },
                    ...getAgent(site),
                });
                let ausername = res.headers['x-ausername'];
                siteDetailsUrl = `${apiUrl}/rest/api/1.0/users/${ausername}`;
                avatarUrl = `${apiUrl}/users/${ausername}/avatar.png?s=64`;
                break;
        }

        const res = await transport(siteDetailsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            ...getAgent(site),
        });
        const json = res.data;

        const userId = site.product.key === ProductJira.key ? json.name : json.slug;
        const baseLinkUrl = `${site.host}${contextPath}`;
        const siteId = isBasicAuthInfo(credentials) ? baseLinkUrl : site.product.key;
        const username = isBasicAuthInfo(credentials) ? credentials.username : userId;
        const credentialId = CredentialManager.generateCredentialId(siteId, username);

        const siteDetails = {
            product: site.product,
            isCloud: false,
            avatarUrl: avatarUrl,
            host: site.host,
            baseApiUrl: apiUrl,
            baseLinkUrl: `${protocol}//${baseLinkUrl}`,
            contextPath: contextPath,
            id: site.host,
            name: site.host,
            userId: userId,
            credentialId: credentialId,
            customSSLCertPaths: site.customSSLCertPaths,
            pfxPath: site.pfxPath,
            pfxPassphrase: site.pfxPassphrase,
        };

        if (site.product.key === ProductJira.key) {
            credentials.user = {
                displayName: json.displayName,
                id: userId,
                email: json.emailAddress,
                avatarUrl: json.avatarUrls['48x48'],
            };
        } else {
            credentials.user = {
                displayName: json.displayName,
                id: userId,
                email: json.emailAddress,
                avatarUrl: json.avatarUrl,
            };
        }

        await this._credentialManager.saveAuthInfo(siteDetails, credentials);
        this._siteManager.addOrUpdateSite(siteDetails);

        return siteDetails;
    }
}
