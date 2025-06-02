import crypto from 'crypto';
import PQueue from 'p-queue';
import { Disposable, Event, EventEmitter, version, window } from 'vscode';

import { loggedOutEvent } from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { CommandContext, setCommandContext } from '../commandContext';
import { Container } from '../container';
import { Logger } from '../logger';
import { keychain } from '../util/keychain';
import {
    AuthChangeType,
    AuthInfo,
    AuthInfoEvent,
    AuthInfoState,
    DetailedSiteInfo,
    emptyAuthInfo,
    getSecretForAuthInfo,
    isOAuthInfo,
    OAuthProvider,
    oauthProviderForSite,
    Product,
    ProductBitbucket,
    ProductJira,
    RemoveAuthInfoEvent,
    UpdateAuthInfoEvent,
} from './authInfo';
import { OAuthRefesher } from './oauthRefresher';
import { Tokens } from './tokens';
const keychainServiceNameV3 = version.endsWith('-insider') ? 'atlascode-insiders-authinfoV3' : 'atlascode-authinfoV3';

enum Priority {
    Read = 0,
    Write,
}

export class CredentialManager implements Disposable {
    private _memStore: Map<string, Map<string, AuthInfo>> = new Map<string, Map<string, AuthInfo>>();
    private _queue = new PQueue({ concurrency: 1 });
    private _refresher = new OAuthRefesher();

    constructor(private _analyticsClient: AnalyticsClient) {
        this._memStore.set(ProductJira.key, new Map<string, AuthInfo>());
        this._memStore.set(ProductBitbucket.key, new Map<string, AuthInfo>());
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
        return this.getAuthInfoForProductAndCredentialId(site, allowCache);
    }

    /**
     * Saves the auth info to both the in-memory store and the secretstorage.
     */
    public async saveAuthInfo(site: DetailedSiteInfo, info: AuthInfo): Promise<void> {
        Logger.debug(`Saving auth info for site: ${site.baseApiUrl} credentialID: ${site.credentialId}`);
        let productAuths = this._memStore.get(site.product.key);

        if (!productAuths) {
            productAuths = new Map<string, AuthInfo>();
        }

        const existingInfo = await this.getAuthInfo(site, false);

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
                            Container.siteManager.removeSite(site);
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
                            Container.siteManager.removeSite(site);
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
        //return foundInfo ? foundInfo : Promise.reject(`no authentication info found for site ${site.hostname}`);
    }

    /**
     * Deletes the secretstorage item.
     *
     * @remarks
     * This only deletes the secretstorage item, leaving the in-memory store un-touched. It's
     * meant to be used during migrations.
     */
    public async deleteSecretStorageItem(productKey: string) {
        try {
            // secretstorage can be accessed using the ExtensionContext provided by vscode to the activate function and the Container class has the
            // "ExtensionContext" stored as it's private static member, hence using it to access vscode's secretstorage
            await Container.context.secrets.delete(productKey);
        } catch (e) {
            Logger.info(`secretstorage error ${e}`);
        }
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
    public async refreshAccessToken(site: DetailedSiteInfo): Promise<Tokens | undefined> {
        const credentials = await this.getAuthInfo(site);
        if (!isOAuthInfo(credentials)) {
            return undefined;
        }
        Logger.debug(`refreshingAccessToken for ${site.baseApiUrl} credentialID: ${site.credentialId}`);

        const provider: OAuthProvider | undefined = oauthProviderForSite(site);
        const newTokens = undefined;
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

                this.saveAuthInfo(site, credentials);
            } else if (tokenResponse.shouldInvalidate) {
                credentials.state = AuthInfoState.Invalid;
                this.saveAuthInfo(site, credentials);
            }
        }
        return newTokens;
    }

    /**
     * Removes an auth item from both the in-memory store and the secretstorage.
     */
    public async removeAuthInfo(site: DetailedSiteInfo): Promise<boolean> {
        const productAuths = this._memStore.get(site.product.key);
        let wasKeyDeleted = false;
        let wasMemDeleted = false;
        if (productAuths) {
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
        }
        return undefined;
    }

    public static generateCredentialId(siteId: string, userId: string): string {
        return crypto.createHash('md5').update(`${siteId}::${userId}`).digest('hex');
    }
}
