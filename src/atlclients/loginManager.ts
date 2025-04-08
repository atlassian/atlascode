import { readFile } from 'fs/promises';
import * as vscode from 'vscode';

import { authenticatedEvent, editedEvent } from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { HardcodedSite, ValidHardcodedSite } from '../config/model';
import { Container } from '../container';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { SiteManager } from '../siteManager';
import { substitute } from '../util/variable-substitution';
import {
    AccessibleResource,
    AuthInfo,
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    HardCodedAuthInfo,
    isBasicAuthInfo,
    isOAuthInfo,
    isPATAuthInfo,
    OAuthInfo,
    OAuthProvider,
    oauthProviderForSite,
    OAuthResponse,
    PATAuthInfo,
    Product,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from './authInfo';
import { CredentialManager } from './authStore';
import { BitbucketAuthenticator } from './bitbucketAuthenticator';
import { getUserForBBToken } from './getUserForBBToken';
import { JiraAuthentictor as JiraAuthenticator } from './jiraAuthenticator';
import { OAuthDancer } from './oauthDancer';
import { basicAuthEncode } from './strategyCrypto';

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
    public async userInitiatedOAuthLogin(site: SiteInfo, callback: string, isOnboarding?: boolean): Promise<void> {
        const provider = oauthProviderForSite(site);
        if (!provider) {
            throw new Error(`No provider found for ${site.host}`);
        }

        const resp = await this._dancer.doDance(provider, site, callback);
        await this.saveDetails(provider, site, resp, isOnboarding);
    }

    public async initRemoteAuth(state: Object) {
        await this._dancer.doInitRemoteDance(state);
    }

    public async finishRemoteAuth(code: string): Promise<void> {
        const provider = OAuthProvider.JiraCloudRemote;
        const site = {
            host: 'https://jira.atlassian.com',
            product: ProductJira,
        };

        const resp = await this._dancer.doFinishRemoteDance(provider, site, code);

        // TODO: change false here when this is reachable from the onboarding flow
        await this.saveDetails(provider, site, resp, false);
    }

    private async saveDetails(provider: OAuthProvider, site: SiteInfo, resp: OAuthResponse, isOnboarding?: boolean) {
        try {
            const oauthInfo: OAuthInfo = {
                type: 'oauth',
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

            await Promise.all(
                siteDetails.map(async (siteInfo) => {
                    await this._credentialManager.saveAuthInfo(siteInfo, oauthInfo);

                    if (site.product.key === ProductJira.key) {
                        this.updateHasResolutionField(siteInfo).then(() => this._siteManager.addSites([siteInfo]));
                    } else {
                        this._siteManager.addSites([siteInfo]);
                    }
                    authenticatedEvent(siteInfo, isOnboarding).then((e) => {
                        this._analyticsClient.sendTrackEvent(e);
                    });
                }),
            );
        } catch (e) {
            Logger.error(e, 'Error authenticating');
            vscode.window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${e}`);
        }
    }

    // Look for https://x-token-auth:<token>@bitbucket.org pattern
    private extractTokenFromGitRemoteRegex(line: string): string | null {
        const tokenMatch = line.match(/https:\/\/x-token-auth:([^@]+)@bitbucket\.org/);
        if (tokenMatch && tokenMatch[1]) {
            Logger.debug('Auth token found in git remote');
            return tokenMatch[1];
        }
        return null;
    }

    /**
     * Extracts auth token from git remote URL
     * @returns The auth token or null if not found
     */
    private async getAuthTokenFromCredentialsPath(
        credentialsPath: string,
        credentialsFormat: HardcodedSite['credentialsFormat'],
    ): Promise<string | null> {
        try {
            const resolvedPath = substitute(credentialsPath);
            const credentialsContents = (await readFile(resolvedPath, 'utf-8')).trim();

            let token: string | null = null;
            switch (credentialsFormat) {
                case 'git-remote':
                    token = this.extractTokenFromGitRemoteRegex(credentialsContents);
                    break;
                case 'self':
                    token = credentialsContents;
                    break;
            }

            if (token) {
                Logger.debug(`Auth token for initial site found`);
            } else {
                Logger.warn(`No auth token found for initial site`);
            }
            return token;
        } catch (error) {
            Logger.error(error, `Error extracting auth token for initial site`);
            return null;
        }
    }

    /**
     * This function is used to authenticate and add a hardcoded site.
     *
     * The flow is quite constant: for a given setting, simply read a token the given credentials path
     * and update the auth info and site based on the VS Code settings.
     *
     * The only branching happens if we provide existing auth info too. In that case, the authentication fails
     * if the existing auth info is the same as the fetched auth info. This flow is used while refreshing to
     * know if the token got refreshed or not.
     */
    public async authenticateHardcodedSite(
        hardcodedSite: ValidHardcodedSite,
        existingAuthInfo?: AuthInfo,
    ): Promise<boolean> {
        const { product, host, credentialsPath, credentialsFormat, authHeader } = hardcodedSite;

        let siteProduct: Product | null = null;
        switch (product) {
            case 'bitbucket':
                siteProduct = ProductBitbucket;
                break;
            default:
                Logger.warn(`Invalid product for initial site`);
                return false;
        }

        const site: SiteInfo = {
            host,
            product: siteProduct,
        };

        try {
            const token = await this.getAuthTokenFromCredentialsPath(credentialsPath, credentialsFormat);

            if (!token) {
                Logger.warn('No hardcoded Bitbucket auth token found');
                vscode.window.showErrorMessage('No hardcoded Bitbucket auth token found');
                return false;
            }
            Logger.debug('Authenticating with Bitbucket using auth token');

            if (existingAuthInfo && existingAuthInfo.type === 'hardcoded' && existingAuthInfo.token === token) {
                Logger.debug(`Same token found, skipping authentication`);
                return false;
            }
            // The part of the code where the hardcoded site is assumed to be Bitbucket Cloud.
            // This function can be extended to support other sites as needed.
            const userData = await getUserForBBToken(LoginManager.authHeaderMaker(hardcodedSite.authHeader, token));

            const hardcodedAuthInfo: HardCodedAuthInfo = {
                type: 'hardcoded',
                token,
                authHeader,
                user: {
                    id: userData.id,
                    displayName: userData.displayName,
                    email: userData.email,
                    avatarUrl: userData.avatarUrl,
                },
                state: AuthInfoState.Valid,
            };

            const detailedSiteInfo: DetailedSiteInfo = {
                ...site,
                id: site.host,
                name: site.host,
                userId: userData.id,
                credentialId: CredentialManager.generateCredentialId(site.product.key, userData.id),
                avatarUrl: userData.avatarUrl,
                baseLinkUrl: site.host,
                baseApiUrl: site.host,
                isCloud: hardcodedSite.isCloud ?? true,
                hasResolutionField: hardcodedSite.hasResolutionField ?? true,
            };

            await this._credentialManager.saveAuthInfo(detailedSiteInfo, hardcodedAuthInfo);

            this._siteManager.addOrUpdateSite(detailedSiteInfo);
            // Fire authenticated event
            authenticatedEvent(detailedSiteInfo, false).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });
            Logger.info(`Successfully authenticated with Bitbucket using auth token`);

            return true;
        } catch (e) {
            Logger.error(e, 'Error authenticating with Bitbucket token');
            vscode.window.showErrorMessage(`Error authenticating with Bitbucket token: ${e}`);
            return false;
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

    public async userInitiatedServerLogin(site: SiteInfo, authInfo: AuthInfo, isOnboarding?: boolean): Promise<void> {
        if (isBasicAuthInfo(authInfo) || isPATAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForServerSite(site, authInfo);

                authenticatedEvent(siteDetails, isOnboarding).then((e) => {
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

    public static authHeader(credentials: AuthInfo): string {
        if (isOAuthInfo(credentials)) {
            return LoginManager.authHeaderMaker('bearer', credentials.access);
        } else if (isBasicAuthInfo(credentials)) {
            return LoginManager.authHeaderMaker('basic', basicAuthEncode(credentials.username, credentials.password));
        } else if (isPATAuthInfo(credentials)) {
            return LoginManager.authHeaderMaker('bearer', credentials.token);
        } else if (credentials.type === 'hardcoded') {
            return LoginManager.authHeaderMaker(credentials.authHeader, credentials.token);
        } else {
            return '';
        }
    }

    public static authHeaderMaker(type: 'basic' | 'bearer', token: string): string {
        switch (type) {
            case 'basic':
                return `Basic ${token}`;
            case 'bearer':
                return `Bearer ${token}`;
            default:
                throw new Error(`Unknown auth header type: ${type}`);
        }
    }

    private async saveDetailsForServerSite(
        site: SiteInfo,
        credentials: BasicAuthInfo | PATAuthInfo,
    ): Promise<DetailedSiteInfo> {
        const authHeader = LoginManager.authHeader(credentials);
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
                const slugRegex = /[\[\:\/\?#@\!\$&'\(\)\*\+,;\=%\\\[\]]/gi;
                let ausername = res.headers['x-ausername'];
                // convert the %40 and similar to special characters
                ausername = decodeURIComponent(ausername);
                // replace special characters with underscore (_)
                ausername = ausername.replace(slugRegex, '_');
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

        const siteDetails: DetailedSiteInfo = {
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
            hasResolutionField: false,
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

        if (site.product.key === ProductJira.key) {
            await this.updateHasResolutionField(siteDetails);
        }

        this._siteManager.addOrUpdateSite(siteDetails);

        return siteDetails;
    }

    private async updateHasResolutionField(siteInfo: DetailedSiteInfo): Promise<void> {
        const client = await Container.clientManager.jiraClient(siteInfo);
        const fields = await client.getFields();
        siteInfo.hasResolutionField = fields.some((f) => f.id === 'resolution');
    }
}
