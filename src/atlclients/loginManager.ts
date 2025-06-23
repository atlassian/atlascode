import * as cp from 'child_process';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import * as vscode from 'vscode';

import { authenticatedEvent, editedEvent } from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { SiteManager } from '../siteManager';
import {
    AccessibleResource,
    AuthInfo,
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    isBasicAuthInfo,
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
import { JiraAuthentictor as JiraAuthenticator } from './jiraAuthenticator';
import { OAuthDancer } from './oauthDancer';
import { BitbucketResponseHandler } from './responseHandlers/BitbucketResponseHandler';
import { strategyForProvider } from './strategy';

const CLOUD_TLD = '.atlassian.net';

export class LoginManager {
    private _dancer: OAuthDancer = OAuthDancer.Instance;
    private _jiraAuthenticator: JiraAuthenticator;
    private _bitbucketAuthenticator: BitbucketAuthenticator;
    private _bitbucketResponseHandler: BitbucketResponseHandler;

    constructor(
        private _credentialManager: CredentialManager,
        private _siteManager: SiteManager,
        private _analyticsClient: AnalyticsClient,
    ) {
        this._bitbucketAuthenticator = new BitbucketAuthenticator();
        this._jiraAuthenticator = new JiraAuthenticator();
        // Initialize BitbucketResponseHandler
        const axiosInstance = this._dancer.getAxiosInstance();
        this._bitbucketResponseHandler = new BitbucketResponseHandler(
            strategyForProvider(OAuthProvider.BitbucketCloud),
            this._analyticsClient,
            axiosInstance,
        );
    }

    // this is *only* called when login buttons are clicked by the user
    public async userInitiatedOAuthLogin(
        site: SiteInfo,
        callback: string,
        isOnboarding?: boolean,
        source?: string,
    ): Promise<void> {
        const provider = oauthProviderForSite(site);
        if (!provider) {
            throw new Error(`No provider found for ${site.host}`);
        }

        const resp = await this._dancer.doDance(provider, site, callback);
        await this.saveDetails(provider, site, resp, isOnboarding, source);
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

    private async saveDetails(
        provider: OAuthProvider,
        site: SiteInfo,
        resp: OAuthResponse,
        isOnboarding?: boolean,
        source?: string,
    ) {
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

            await Promise.all(
                siteDetails.map(async (siteInfo) => {
                    await this._credentialManager.saveAuthInfo(siteInfo, oauthInfo);
                    this._siteManager.addSites([siteInfo]);
                    authenticatedEvent(siteInfo, isOnboarding, source).then((e) => {
                        this._analyticsClient.sendTrackEvent(e);
                    });
                }),
            );
        } catch (e) {
            Logger.error(e, `Error authenticating with provider '${provider}'`);
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
    private async getAuthTokenFromGitRemote(): Promise<string | null> {
        try {
            // Get the workspace folder path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                Logger.warn('No workspace folder found');
                return null;
            }
            const workspacePath = workspaceFolders[0].uri.fsPath;
            // Execute git remote -v command
            const gitCommand = 'git remote -v';
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(gitCommand, { cwd: workspacePath }, (error, stdout) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout);
                });
            });
            // Parse the output to find the token
            const remoteLines = result.split('\n');
            for (const line of remoteLines) {
                const token = this.extractTokenFromGitRemoteRegex(line);
                if (token) {
                    Logger.debug('Auth token found in git remote');
                    return token;
                }
            }
            Logger.warn('No auth token found in git remote');
            return null;
        } catch (error) {
            Logger.error(error, 'Error extracting auth token from git remote');
            return null;
        }
    }

    /**
     * Extracts auth token from git remote URL
     * @returns The auth token or null if not found
     */
    private async getAuthTokenFromHomeGitCredentials(): Promise<string | null> {
        try {
            const credentialsFullPath = join(homedir(), '.git-credentials');
            const credentialsContents = await readFile(credentialsFullPath, 'utf-8');
            const token = this.extractTokenFromGitRemoteRegex(credentialsContents);
            if (token) {
                Logger.debug('Auth token found in git credentials file');
                return token;
            }
            Logger.warn('No auth token found in git credentials file');
            return null;
        } catch (error) {
            Logger.error(error, 'Error extracting auth token from git remote');
            return null;
        }
    }

    private async refreshBitbucketToken(siteDetails: DetailedSiteInfo): Promise<boolean> {
        const token = await this._credentialManager.getAuthInfo(siteDetails, false);
        if (token) {
            return this.authenticateWithBitbucketToken(true);
        }
        return false;
    }

    // Add a new method for token-based authentication
    public async authenticateWithBitbucketToken(refresh: boolean = false): Promise<boolean> {
        try {
            const [tokenRemote, tokenCredentialsFile] = await Promise.allSettled([
                this.getAuthTokenFromGitRemote(),
                this.getAuthTokenFromHomeGitCredentials(),
            ]);

            let token: string | null = null;

            if (tokenRemote.status === 'fulfilled' && tokenRemote.value) {
                token = tokenRemote.value;
            } else if (tokenCredentialsFile.status === 'fulfilled' && tokenCredentialsFile.value) {
                token = tokenCredentialsFile.value;
            }

            if (!token) {
                Logger.warn('No hardcoded Bitbucket auth token found');
                vscode.window.showErrorMessage('No hardcoded Bitbucket auth token found');
                return false;
            }
            Logger.debug('Authenticating with Bitbucket using auth token');
            // Use the BitbucketResponseHandler to get user info
            const userData = await this._bitbucketResponseHandler.user(token);
            const [oAuthSiteDetails] = await this.getOAuthSiteDetails(
                ProductBitbucket,
                OAuthProvider.BitbucketCloud,
                userData.id,
                [
                    {
                        id: OAuthProvider.BitbucketCloud,
                        name: ProductBitbucket.name,
                        scopes: [],
                        avatarUrl: '',
                        url: 'https://api.bitbucket.org/2.0',
                    },
                ],
            );
            const oAuthInfo: OAuthInfo = {
                access: token,
                refresh: '',
                recievedAt: Date.now(),
                user: {
                    id: userData.id,
                    displayName: userData.displayName,
                    email: userData.email,
                    avatarUrl: userData.avatarUrl,
                },
                state: AuthInfoState.Valid,
            };
            await this._credentialManager.saveAuthInfo(oAuthSiteDetails, oAuthInfo);
            setTimeout(
                () => {
                    this.refreshBitbucketToken(oAuthSiteDetails);
                },
                2 * 60 * 60 * 1000,
            );
            if (!refresh) {
                this._siteManager.addSites([oAuthSiteDetails]);
                // Fire authenticated event
                authenticatedEvent(oAuthSiteDetails, false).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
                Logger.info('Successfully authenticated with Bitbucket using auth token');
            }
            return true;
        } catch (e) {
            Logger.error(e, 'Error authenticating with Bitbucket token');
            vscode.window.showErrorMessage(`Error authenticating with Bitbucket token: ${e}`);
            return false;
        }
    }

    public async getOAuthSiteDetails(
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

    public async userInitiatedServerLogin(
        site: SiteInfo,
        authInfo: AuthInfo,
        isOnboarding?: boolean,
        source?: string,
    ): Promise<void> {
        if (isBasicAuthInfo(authInfo) || isPATAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForSite(site, authInfo);

                authenticatedEvent(siteDetails, isOnboarding, source).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            } catch (err) {
                Logger.error(err, `Error authenticating with ${site.product.name}`);
                return Promise.reject(`Error authenticating with ${site.product.name}: ${err}`);
            }
        }
    }

    public async updateInfo(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForSite(site, authInfo);
                editedEvent(siteDetails).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            } catch (err) {
                Logger.error(err, `Error authenticating with ${site.product.name}`);
                return Promise.reject(`Error authenticating with ${site.product.name}: ${err}`);
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

    private async saveDetailsForSite(
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
        };

        if (site.host.endsWith(CLOUD_TLD)) {
            // Special case to accomodate for API key login to cloud instances
            siteDetails.isCloud = true;
            siteDetails.userId = json.accountId;
            siteDetails.id = await this.fetchCloudSiteId(siteDetails.host);
        }

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

    private async fetchCloudSiteId(host: string): Promise<string> {
        const response = await fetch(`https://${host}/_edge/tenant_info`);
        const data = await response.json();
        return data.cloudId;
    }
}
