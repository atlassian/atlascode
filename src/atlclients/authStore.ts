import crypto from 'crypto';
import PQueue from 'p-queue';
import { Disposable, Event, EventEmitter, ExtensionContext, version, window } from 'vscode';

import { loggedOutEvent } from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { CommandContext, setCommandContext } from '../commandContext';
import { Container } from '../container';
import { Logger } from '../logger';
import { keychain } from '../util/keychain';
import { Time } from '../util/time';
import {
    AuthChangeType,
    AuthInfo,
    AuthInfoEvent,
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    emptyAuthInfo,
    getSecretForAuthInfo,
    isBasicAuthInfo,
    isOAuthInfo,
    OAuthInfo,
    OAuthProvider,
    oauthProviderForSite,
    Product,
    ProductBitbucket,
    ProductJira,
    ProductRovoDev,
    RemoveAuthInfoEvent,
    UpdateAuthInfoEvent,
} from './authInfo';
import { Negotiator } from './negotiate';
import { OAuthRefesher } from './oauthRefresher';

const keychainServiceNameV3 = version.endsWith('-insider') ? 'atlascode-insiders-authinfoV3' : 'atlascode-authinfoV3';

enum Priority {
    Read = 0,
    Write,
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CheckedScopes = {
    isApiToken?: boolean;
    checkedScopes: { [key: string]: boolean };
};

export class CredentialManager implements Disposable {
    private _memStore: Map<string, Map<string, AuthInfo>> = new Map<string, Map<string, AuthInfo>>();
    private _queue = new PQueue({ concurrency: 1 });
    private _refresher = new OAuthRefesher();
    private negotiator: Negotiator;
    private _refreshInFlight = new Map<string, Promise<void>>();
    private _failedRefreshCache = new Map<string, { attemptsCount: number; lastAttemptAt: Date }>();

    constructor(
        context: ExtensionContext,
        private _analyticsClient: AnalyticsClient,
    ) {
        this._memStore.set(ProductJira.key, new Map<string, AuthInfo>());
        this._memStore.set(ProductBitbucket.key, new Map<string, AuthInfo>());
        this.negotiator = new Negotiator(context.globalState);
    }

    private _onDidAuthChange = new EventEmitter<AuthInfoEvent>();
    public get onDidAuthChange(): Event<AuthInfoEvent> {
        return this._onDidAuthChange.event;
    }

    dispose() {
        this._memStore.clear();
        this._onDidAuthChange.dispose();
    }

    /**
     * Gets the auth info for the given site. Will return value stored in the in-memory store if
     * it's available, otherwise will return the value in the secretstorage.
     */
    public async getAuthInfo(site: DetailedSiteInfo, allowCache = true): Promise<AuthInfo | undefined> {
        const authInfo = await this.getAuthInfoForProductAndCredentialId(site, allowCache);
        return this.softRefreshOAuth(site, authInfo);
    }

    public async checkScopes(site: DetailedSiteInfo, scopes: string[]): Promise<CheckedScopes | undefined> {
        // Scopes are only applicable to cloud sites
        if (!site.host.endsWith('.atlassian.net')) {
            return undefined;
        }

        const authInfo = await this.getAuthInfo(site, true);

        if (isOAuthInfo(authInfo)) {
            const allowedScopes = authInfo.scopes || [];
            const checkedScopes = scopes.reduce(
                (acc, scope) => {
                    acc[scope] = allowedScopes.includes(scope);
                    return acc;
                },
                {} as CheckedScopes['checkedScopes'],
            );

            return {
                isApiToken: allowedScopes.length === 0,
                checkedScopes,
            };
        }
        // Basic auth for cloud site means API token
        if (isBasicAuthInfo(authInfo)) {
            return {
                isApiToken: true,
                checkedScopes: {},
            };
        }
        return undefined;
    }

    async getApiTokenIfExists(site: DetailedSiteInfo): Promise<BasicAuthInfo | undefined> {
        // Only applicable to cloud sites
        if (!site.host.endsWith('.atlassian.net')) {
            return undefined;
        }

        // this.getAuthInfo relies on credentialId, which can be different between oauth and API token
        // We can't rely on site.credentialId, so let's check the site from scratch
        // TODO: switch this to use this.getAuthInfo after some time when enough users are on the new logic
        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        const selectedSite = sites.find((s) => s.id === site.id);
        if (!selectedSite) {
            return undefined;
        }

        const authInfo = await this.getAuthInfo(selectedSite);
        if (isBasicAuthInfo(authInfo)) {
            return authInfo;
        }

        return undefined;
    }

    async findApiTokenForSite(site?: DetailedSiteInfo | string): Promise<BasicAuthInfo | undefined> {
        const siteToCheck = typeof site === 'string' ? Container.siteManager.getSiteForId(ProductJira, site) : site;

        if (!siteToCheck || !siteToCheck.host.endsWith('.atlassian.net')) {
            return undefined;
        }

        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        const selectedSiteEmail = (await this.getAuthInfo(siteToCheck))?.user.email;

        // For a cloud site - check if we have another cloud site with the same user and API key
        const promises = sites
            .filter((site) => site.host.endsWith('.atlassian.net'))
            .map(async (site) => {
                const authInfo = await this.getAuthInfo(site);
                if (authInfo?.user.email === selectedSiteEmail && isBasicAuthInfo(authInfo)) {
                    // There's another site with the same user and cloud, so we can use that API key for suggestions
                    return authInfo as BasicAuthInfo;
                }
                return undefined;
            });

        const results = await Promise.all(promises);
        return results.find((authInfo) => authInfo !== undefined);
    }

    public async getAllValidAuthInfo(
        product: Product,
        siteFilter?: (site: DetailedSiteInfo) => boolean,
    ): Promise<AuthInfo[]> {
        // Get all unique sites by credentialId
        let sites = Container.siteManager.getSitesAvailable(product);
        if (siteFilter) {
            sites = sites.filter(siteFilter);
        }
        const uniquelyCredentialedSites = Array.from(new Map(sites.map((site) => [site.credentialId, site])).values());

        const authInfos = await Promise.all(uniquelyCredentialedSites.map((site) => this.getAuthInfo(site, true)));

        return authInfos.filter(
            (authInfo): authInfo is AuthInfo => !!authInfo && authInfo.state !== AuthInfoState.Invalid,
        );
    }

    // Gets valid auth info for cloud sites, deduplicated by user email (used for notifications and handles OAuth + API token for the same user)
    public async getCloudAuthInfo(product: Product): Promise<AuthInfo[]> {
        const authInfos = await this.getAllValidAuthInfo(product, (site) => site.isCloud);

        const uniqueByEmail = new Map<string, AuthInfo>();
        authInfos.forEach((authInfo) => {
            const email = authInfo.user.email;
            if (email && !uniqueByEmail.has(email)) {
                uniqueByEmail.set(email, authInfo);
            }
        });
        return Array.from(uniqueByEmail.values());
    }

    /**
     * Saves the auth info to both the in-memory store and the secretstorage.
     */
    public async saveAuthInfo(site: DetailedSiteInfo, info: AuthInfo): Promise<void> {
        this.appendMetaData(info);
        Logger.debug(`Saving auth info for site: ${site.baseApiUrl} credentialID: ${site.credentialId}`);
        let productAuths = this._memStore.get(site.product.key);

        if (!productAuths) {
            productAuths = new Map<string, AuthInfo>();
        }

        const existingInfo = await this.getAuthInfoForProductAndCredentialId(site, false);

        this._memStore.set(site.product.key, productAuths.set(site.credentialId, info));

        const hasNewInfo =
            !existingInfo ||
            getSecretForAuthInfo(existingInfo) !== getSecretForAuthInfo(info) ||
            existingInfo.user.id !== info.user.id ||
            existingInfo.state !== info.state;

        if (hasNewInfo) {
            Logger.debug(`Saving new information to secretstorage.`);
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx !== undefined) {
                setCommandContext(cmdctx, info !== emptyAuthInfo ? true : false);
            }

            try {
                this.addSiteInformationToSecretStorage(site.product.key, site.credentialId, info);
                const updateEvent: UpdateAuthInfoEvent = { type: AuthChangeType.Update, site: site };
                this._onDidAuthChange.fire(updateEvent);
            } catch (e) {
                Logger.debug('error saving auth info to secretstorage: ', e);
            }
        }
    }

    private appendMetaData(info: AuthInfo): void {
        if (isOAuthInfo(info)) {
            // set expiration date if not present
            this.setExpirationDate(info);
        }
    }

    private setExpirationDate(info: OAuthInfo): void {
        // Skip if expiration date is already set
        if (info.expirationDate) {
            return;
        }

        // Try to extract expiration from JWT token
        const expirationFromJwt = this.extractExpirationFromJwt(info.access);
        if (expirationFromJwt) {
            info.expirationDate = expirationFromJwt;
            return;
        }

        // Fallback: set expiration to 1 hour from token creation/receipt
        const baseTime = info.iat || info.recievedAt || Date.now();
        info.expirationDate = baseTime + Time.HOURS;
    }

    private extractExpirationFromJwt(accessToken: string): number | null {
        try {
            const tokenParts = accessToken.split('.');
            if (tokenParts.length !== 3) {
                Logger.debug('Invalid JWT token format, expected 3 parts');
                return null;
            }

            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));

            return payload.exp ? payload.exp * 1000 : null;
        } catch (error) {
            Logger.debug('Failed to parse JWT token for expiration', error);
            return null;
        }
    }

    private async getAuthInfoForProductAndCredentialId(
        site: DetailedSiteInfo,
        allowCache: boolean,
    ): Promise<AuthInfo | undefined> {
        Logger.debug(`Retrieving auth info for product: ${site.product.key} credentialID: ${site.credentialId}`);
        let foundInfo: AuthInfo | undefined = undefined;
        const productAuths = this._memStore.get(site.product.key);

        if (allowCache && productAuths && productAuths.has(site.credentialId)) {
            foundInfo = productAuths.get(site.credentialId);
            if (foundInfo) {
                // clone the object so editing it and saving it back doesn't trip up equality checks
                // in saveAuthInfo
                foundInfo = Object.assign({}, foundInfo);
            }
        }

        if (!foundInfo) {
            try {
                let infoEntry = await this.getAuthInfoFromSecretStorage(site.product.key, site.credentialId);
                // if no authinfo found in secretstorage
                if (!infoEntry) {
                    // we first check if keychain exists and if it does then we migrate users from keychain to secretstorage
                    // without them having to relogin manually
                    if (keychain) {
                        infoEntry = await this.getAuthInfoFromKeychain(site.product.key, site.credentialId);
                        if (infoEntry) {
                            Logger.debug(
                                `adding info from keychain to secretstorage for product: ${site.product.key} credentialID: ${site.credentialId}`,
                            );
                            await this.addSiteInformationToSecretStorage(
                                site.product.key,
                                site.credentialId,
                                infoEntry,
                            );
                            // Once authinfo has been stored in the secretstorage, info in keychain is no longer needed so removing it
                            await this.removeSiteInformationFromKeychain(site.product.key, site.credentialId);
                        } else if (Container.siteManager.getSiteForId(site.product, site.id)) {
                            // if keychain does not have any auth info for the current site but the site has been saved, we need to remove it
                            Logger.error(
                                new Error(
                                    `removing dead site for product ${site.product.key} credentialID: ${site.credentialId}`,
                                ),
                                `Removing dead site for product ${site.product.key}: auth info not found in keychain`,
                            );
                            await Container.clientManager.removeClient(site);
                            await Container.siteManager.removeSite(site, false, false);
                        }
                    } else {
                        // else if keychain does not exist, we check if the current site has been saved, if yes then we should remove it
                        if (Container.siteManager.getSiteForId(site.product, site.id)) {
                            Logger.debug(
                                new Error(
                                    `removing dead site for product ${site.product.key} credentialID: ${site.credentialId}`,
                                ),
                                `Removing dead site for product ${site.product.key}: keychain not found`,
                            );
                            await Container.clientManager.removeClient(site);
                            await Container.siteManager.removeSite(site, false, false);
                        }
                    }
                }
                if (isOAuthInfo(infoEntry)) {
                    if (!infoEntry.recievedAt) {
                        infoEntry.recievedAt = 0;
                    }
                }
                if (infoEntry && productAuths) {
                    this._memStore.set(site.product.key, productAuths.set(site.credentialId, infoEntry));

                    foundInfo = infoEntry;
                }
            } catch (e) {
                Logger.info(`secretstorage error ${e}`);
            }
        }

        return foundInfo;
    }

    private async softRefreshOAuth(site: DetailedSiteInfo, authInfo: AuthInfo | undefined) {
        const credentials = authInfo;

        if (!isOAuthInfo(credentials)) {
            return authInfo; // not an OAuth info, no need to refresh
        }
        const GRACE_PERIOD = 10 * Time.MINUTES;

        if (credentials.expirationDate) {
            const diff = credentials.expirationDate - Date.now();
            Logger.debug(
                `${Math.floor(diff / 1000)} seconds remaining for ${site.name} refresh token. ${diff > GRACE_PERIOD ? 'No refresh needed yet.' : 'refreshing...'}`,
            );

            if (diff > GRACE_PERIOD) {
                return credentials; // no need to refresh, we have enough time left
            }
            Logger.debug(`Need new auth token.`);
        }

        const key = `${site.product.key}:${site.credentialId}`;

        if (this.negotiator.thisIsTheResponsibleProcess()) {
            Logger.debug(`Refreshing credentials.`);
            let inFlight = this._refreshInFlight.get(key);

            if (!inFlight) {
                inFlight = (async () => {
                    try {
                        await Container.credentialManager.refreshAccessToken(site);
                    } finally {
                        this._refreshInFlight.delete(key);
                    }
                })();

                this._refreshInFlight.set(key, inFlight);
            }
            try {
                await inFlight;
            } catch (e) {
                Logger.error(e, 'error refreshing token');
                return Promise.reject(
                    `Your ${site.product.name} session has expired. Please sign in again to continue.`,
                );
            }
        } else {
            Logger.debug(`This process isn't in charge of refreshing credentials.`);
            await this.negotiator.requestTokenRefreshForSite(JSON.stringify(site));
            await sleep(5000);
        }

        return this.getAuthInfoForProductAndCredentialId(site, false);
    }

    private async addSiteInformationToSecretStorage(productKey: string, credentialId: string, info: AuthInfo) {
        await this._queue.add(
            async () => {
                try {
                    await Container.context.secrets.store(`${productKey}-${credentialId}`, JSON.stringify(info));
                } catch (e) {
                    Logger.error(e, `Error writing to secretstorage`);
                }
            },
            { priority: Priority.Write },
        );
    }
    private async getSiteInformationFromSecretStorage(
        productKey: string,
        credentialId: string,
    ): Promise<string | undefined> {
        let info: string | undefined = undefined;
        await this._queue.add(
            async () => {
                info = await Container.context.secrets.get(`${productKey}-${credentialId}`);
            },
            { priority: Priority.Read },
        );
        return info;
    }
    private async removeSiteInformationFromSecretStorage(productKey: string, credentialId: string): Promise<boolean> {
        let wasKeyDeleted = false;
        await this._queue.add(
            async () => {
                const storedInfo = await Container.context.secrets.get(`${productKey}-${credentialId}`);
                if (storedInfo) {
                    await Container.context.secrets.delete(`${productKey}-${credentialId}`);
                    wasKeyDeleted = true;
                }
            },
            { priority: Priority.Write },
        );
        return wasKeyDeleted;
    }
    private async removeSiteInformationFromKeychain(productKey: string, credentialId: string): Promise<boolean> {
        let wasKeyDeleted = false;
        await this._queue.add(
            async () => {
                if (keychain) {
                    wasKeyDeleted = await keychain.deletePassword(
                        keychainServiceNameV3,
                        `${productKey}-${credentialId}`,
                    );
                }
            },
            { priority: Priority.Write },
        );
        return wasKeyDeleted;
    }

    private async getAuthInfoFromSecretStorage(
        productKey: string,
        credentialId: string,
        serviceName?: string,
    ): Promise<AuthInfo | undefined> {
        Logger.debug(`Retrieving secretstorage info for product: ${productKey} credentialID: ${credentialId}`);
        let authInfo: string | undefined = undefined;
        authInfo = await this.getSiteInformationFromSecretStorage(productKey, credentialId);
        if (!authInfo) {
            return undefined;
        }
        const info: AuthInfo = JSON.parse(authInfo);

        // When in doubt, assume credentials are valid
        if (info.state === undefined) {
            info.state = AuthInfoState.Valid;
        }
        return info;
    }
    private async getAuthInfoFromKeychain(
        productKey: string,
        credentialId: string,
        serviceName?: string,
    ): Promise<AuthInfo | undefined> {
        Logger.debug(`Retrieving keychain info for product: ${productKey} credentialID: ${credentialId}`);
        let svcName = keychainServiceNameV3;

        if (serviceName) {
            svcName = serviceName;
        }

        let authInfo: string | null = null;
        await this._queue.add(
            async () => {
                if (keychain) {
                    authInfo = await keychain.getPassword(svcName, `${productKey}-${credentialId}`);
                }
            },
            { priority: Priority.Read },
        );

        if (!authInfo) {
            return undefined;
        }

        const info: AuthInfo = JSON.parse(authInfo);

        // When in doubt, assume credentials are valid
        if (info.state === undefined) {
            info.state = AuthInfoState.Valid;
        }

        return info;
    }

    /**
     * Calls the OAuth provider and updates the access token.
     */
    private async refreshAccessToken(site: DetailedSiteInfo): Promise<void> {
        const credentials = await this.getAuthInfoForProductAndCredentialId(site, false);
        if (!isOAuthInfo(credentials)) {
            return undefined;
        }

        const failedRefresh = this._failedRefreshCache.get(site.credentialId);
        if (failedRefresh) {
            const RETRY_DELAY = 5 * Time.MINUTES;
            if (failedRefresh.attemptsCount > 5) {
                const timeSinceLastAttempt = Date.now() - failedRefresh.lastAttemptAt.getTime();
                // if we already had multiple failed attempts recently, don't try again yet until enough time has passed
                if (timeSinceLastAttempt < RETRY_DELAY) {
                    Logger.debug(
                        `Skipping token refresh for credentialID: ${site.credentialId} due to previous failures.`,
                    );
                    return undefined;
                } else {
                    // reset attempts count after delay has passed
                    if (this._failedRefreshCache.has(site.credentialId)) {
                        this._failedRefreshCache.delete(site.credentialId);
                    }
                }
            }
        }

        Logger.debug(`refreshingAccessToken for ${site.baseApiUrl} credentialID: ${site.credentialId}`);

        const provider: OAuthProvider | undefined = oauthProviderForSite(site);

        if (provider && credentials) {
            const tokenResponse = await this._refresher.getNewTokens(provider, credentials.refresh);
            if (tokenResponse.tokens) {
                const newTokens = tokenResponse.tokens;
                credentials.access = newTokens.accessToken;
                credentials.expirationDate = newTokens.expiration;
                credentials.recievedAt = newTokens.receivedAt;
                if (newTokens.refreshToken) {
                    credentials.refresh = newTokens.refreshToken;
                    credentials.iat = newTokens.iat ?? 0;
                }

                await this.saveAuthInfo(site, credentials);
                if (this._failedRefreshCache.has(site.credentialId)) {
                    this._failedRefreshCache.delete(site.credentialId);
                }
                Logger.debug(`Successfully saved refreshed tokens for credentialId: ${site.credentialId}`);
            } else if (tokenResponse.shouldInvalidate || tokenResponse.shouldSlowDown) {
                if (tokenResponse.shouldSlowDown) {
                    const newAttemptsCount = (this._failedRefreshCache.get(site.credentialId)?.attemptsCount ?? 0) + 1;
                    this._failedRefreshCache.set(site.credentialId, {
                        attemptsCount: newAttemptsCount,
                        lastAttemptAt: new Date(),
                    });
                    // Only log error after hitting retry limit
                    if (newAttemptsCount >= 5) {
                        Logger.error(
                            new Error(
                                `Token refresh failed after ${newAttemptsCount} attempts for credentialId: ${site.credentialId}`,
                            ),
                        );
                    }
                }
                if (tokenResponse.shouldInvalidate) {
                    Logger.error(
                        new Error(
                            `Token refresh failed - credentials invalidated for credentialId: ${site.credentialId}`,
                        ),
                    );
                }
                credentials.state = AuthInfoState.Invalid;
                await this.saveAuthInfo(site, credentials);
            }
        }
    }

    /**
     * Removes an auth item from both the in-memory store and the secretstorage.
     */
    public async removeAuthInfo(site: DetailedSiteInfo): Promise<boolean> {
        const productAuths = this._memStore.get(site.product.key);
        let wasKeyDeleted = false;
        let wasMemDeleted = false;
        let userId = '';
        if (productAuths) {
            userId = productAuths.get(site.credentialId)?.user.id || '';
            wasMemDeleted = productAuths.delete(site.credentialId);
            this._memStore.set(site.product.key, productAuths);
        }

        wasKeyDeleted = await this.removeSiteInformationFromSecretStorage(site.product.key, site.credentialId);
        if (wasMemDeleted || wasKeyDeleted) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx) {
                setCommandContext(cmdctx, false);
            }

            const name = site.name;

            const removeEvent: RemoveAuthInfoEvent = {
                type: AuthChangeType.Remove,
                product: site.product,
                credentialId: site.credentialId,
                userId: userId,
            };
            this._onDidAuthChange.fire(removeEvent);

            window.showInformationMessage(`You have been logged out of ${site.product.name}: ${name}`);

            loggedOutEvent(site).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });
            return true;
        }

        return false;
    }

    private commandContextFor(product: Product): string | undefined {
        switch (product.key) {
            case ProductJira.key:
                return CommandContext.IsJiraAuthenticated;
            case ProductBitbucket.key:
                return CommandContext.IsBBAuthenticated;
            case ProductRovoDev.key:
                return CommandContext.IsRovoDevAuthenticated;
        }
        return undefined;
    }

    public static generateCredentialId(siteId: string, userId: string): string {
        return crypto.createHash('md5').update(`${siteId}::${userId}`).digest('hex');
    }

    // RovoDev-specific methods (not site-based)
    private static readonly ROVODEV_CREDENTIAL_ID = 'rovodev-single';

    public async getRovoDevAuthInfo(): Promise<AuthInfo | undefined> {
        Logger.debug(`Retrieving RovoDev auth info`);
        try {
            const authInfo = await this.getAuthInfoFromSecretStorage(
                ProductRovoDev.key,
                CredentialManager.ROVODEV_CREDENTIAL_ID,
            );

            // Set context based on whether credentials exist
            const cmdctx = this.commandContextFor(ProductRovoDev);
            if (cmdctx !== undefined) {
                setCommandContext(cmdctx, authInfo !== undefined && authInfo !== emptyAuthInfo);
            }

            return authInfo;
        } catch (e) {
            Logger.error(e, `secretstorage error for RovoDev: ${e}`);
            return undefined;
        }
    }

    public async saveRovoDevAuthInfo(info: AuthInfo): Promise<void> {
        Logger.debug(`Saving RovoDev auth info`);
        const cmdctx = this.commandContextFor(ProductRovoDev);
        if (cmdctx !== undefined) {
            setCommandContext(cmdctx, info !== emptyAuthInfo ? true : false);
        }

        try {
            await this.addSiteInformationToSecretStorage(
                ProductRovoDev.key,
                CredentialManager.ROVODEV_CREDENTIAL_ID,
                info,
            );
        } catch (e) {
            Logger.error(e, 'error saving RovoDev auth info to secretstorage');
        }
    }

    public async removeRovoDevAuthInfo(): Promise<boolean> {
        Logger.debug(`Removing RovoDev auth info`);
        const wasKeyDeleted = await this.removeSiteInformationFromSecretStorage(
            ProductRovoDev.key,
            CredentialManager.ROVODEV_CREDENTIAL_ID,
        );

        if (wasKeyDeleted) {
            const cmdctx = this.commandContextFor(ProductRovoDev);
            if (cmdctx) {
                setCommandContext(cmdctx, false);
            }

            return true;
        }

        return false;
    }
}
