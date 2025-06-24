import { JiraClient, JiraCloudClient, JiraServerClient } from '@atlassianlabs/jira-pi-client';
import { getProxyHostAndPort } from '@atlassianlabs/pi-client-common';
import { AxiosResponse } from 'axios';
import PQueue from 'p-queue';
import { ConfigurationChangeEvent, Disposable, ExtensionContext } from 'vscode';
import { commands, window } from 'vscode';

import { CloudPullRequestApi } from '../bitbucket/bitbucket-cloud/pullRequests';
import { CloudRepositoriesApi } from '../bitbucket/bitbucket-cloud/repositories';
import { ServerPullRequestApi } from '../bitbucket/bitbucket-server/pullRequests';
import { ServerRepositoriesApi } from '../bitbucket/bitbucket-server/repositories';
import { ClientError, HTTPClient } from '../bitbucket/httpClient';
import { BitbucketApi } from '../bitbucket/model';
import { configuration } from '../config/configuration';
import { cannotGetClientFor } from '../constants';
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
import { Time } from '../util/time';
import {
    AuthInfo,
    AuthInfoState,
    DetailedSiteInfo,
    isBasicAuthInfo,
    isOAuthInfo,
    isPATAuthInfo,
    ProductJira,
} from './authInfo';
import { BasicInterceptor } from './basicInterceptor';

const oauthTTL: number = 45 * Time.MINUTES;
const serverTTL: number = Time.FOREVER;

export class ClientManager implements Disposable {
    private _clients: CacheMap = new CacheMap();
    private _queue = new PQueue({ concurrency: 1 });
    private _agentChanged: boolean = false;
    private hasWarnedOfFailure = false;

    constructor(context: ExtensionContext) {
        context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
        );
        this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    dispose() {
        this._clients.clear();
    }

    /*
     * Method called when another process requests that a sites tokens be refreshed.
     */
    public requestSite(site: DetailedSiteInfo) {
        const tag = Math.floor(Math.random() * 1000);

        Logger.debug(`${tag}: clientManager requestSite ${site.baseApiUrl}`);

        if (site.isCloud) {
            if (site.product.key === ProductJira.key) {
                Logger.debug(`${tag}: requesting Jira site due to another process`);
                this.jiraClient(site);
            } else {
                Logger.debug(`${tag}: requesting Bitbucket site due to another process`);
                this.bbClient(site);
            }
            Logger.debug(`${tag}: finished requesting`);
        }
    }

    private onSitesDidChange(e: SitesAvailableUpdateEvent) {
        this._agentChanged = true;
    }

    // used to add and remove the proxy agent when charles setting changes.
    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (
            initializing ||
            configuration.changed(e, 'enableCharles') ||
            configuration.changed(e, 'charlesCertPath') ||
            configuration.changed(e, 'charlesDebugOnly') ||
            configuration.changed(e, 'enableCurlLogging') ||
            configuration.changed(e, 'enableHttpsTunnel')
        ) {
            this._agentChanged = true;
        }

        if ((initializing && Container.config.enableHttpsTunnel) || configuration.changed(e, 'enableHttpsTunnel')) {
            const [proxyHost, proxyPort] = getProxyHostAndPort();
            if (Container.config.enableHttpsTunnel) {
                Logger.debug(`setting up https tunnel to ${proxyHost}:${proxyPort}`);
            }
        }
    }

    public async bbClient(site: DetailedSiteInfo): Promise<BitbucketApi> {
        return this.getClient<BitbucketApi>(site, (info) => {
            let result: BitbucketApi;
            if (site.isCloud) {
                result = {
                    repositories: isOAuthInfo(info)
                        ? new CloudRepositoriesApi(this.createOAuthHTTPClient(site, info.access))
                        : undefined!,
                    pullrequests: isOAuthInfo(info)
                        ? new CloudPullRequestApi(this.createOAuthHTTPClient(site, info.access))
                        : undefined!,
                    pipelines: isOAuthInfo(info)
                        ? new PipelineApiImpl(this.createOAuthHTTPClient(site, info.access))
                        : undefined!,
                };
            } else {
                result = {
                    repositories:
                        isBasicAuthInfo(info) || isPATAuthInfo(info)
                            ? new ServerRepositoriesApi(this.createHTTPClient(site, info))
                            : undefined!,
                    pullrequests:
                        isBasicAuthInfo(info) || isPATAuthInfo(info)
                            ? new ServerPullRequestApi(this.createHTTPClient(site, info))
                            : undefined!,
                    pipelines: undefined,
                };
            }

            return result;
        });
    }

    public async removeClient(site: DetailedSiteInfo) {
        this._clients.deleteItem(this.keyForSite(site));
    }

    public async jiraClient(site: DetailedSiteInfo): Promise<JiraClient<DetailedSiteInfo>> {
        const tag = Math.floor(Math.random() * 1000);

        let newClient: JiraClient<DetailedSiteInfo> | undefined = undefined;
        try {
            newClient = await this._queue.add(async () => {
                return this.getClient<JiraClient<DetailedSiteInfo>>(site, (info) => {
                    Logger.debug(`getClient factory`);
                    let client: any = undefined;

                    if (isOAuthInfo(info)) {
                        Logger.debug(`${tag}: creating client for ${site.baseApiUrl}`);
                        client = new JiraCloudClient(
                            site,
                            oauthJiraTransportFactory(site),
                            jiraTokenAuthProvider(info.access),
                            getAgent,
                        );
                    } else if (isBasicAuthInfo(info) && site.isCloud) {
                        Logger.debug(`${tag}: creating cloud client for ${site.baseApiUrl}`);
                        client = new JiraCloudClient(
                            site,
                            basicJiraTransportFactory(site),
                            jiraBasicAuthProvider(info.username, info.password),
                            getAgent,
                        );
                    } else if (isBasicAuthInfo(info)) {
                        client = new JiraServerClient(
                            site,
                            basicJiraTransportFactory(site),
                            jiraBasicAuthProvider(info.username, info.password),
                            getAgent,
                        );
                    } else if (isPATAuthInfo(info)) {
                        client = new JiraServerClient(
                            site,
                            basicJiraTransportFactory(site),
                            jiraTokenAuthProvider(info.token),
                            getAgent,
                        );
                    }
                    Logger.debug(`${tag}: client created`);
                    return client;
                });
            });
        } catch (e) {
            Logger.error(e, `Failed to refresh tokens`);
            throw e;
        }
        return newClient!;
    }

    private createOAuthHTTPClient(site: DetailedSiteInfo, token: string): HTTPClient {
        return new HTTPClient(
            site.baseApiUrl,
            `Bearer ${token}`,
            getAgent(site),
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = response.data;

                if (errJson.error && errJson.error.message) {
                    errString = errJson.error.message;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            },
        );
    }

    private createHTTPClient(site: DetailedSiteInfo, info: AuthInfo): HTTPClient {
        let auth = '';
        if (isBasicAuthInfo(info)) {
            Logger.info('Using Username and Password Auth');
            auth = `Basic ${Buffer.from(info.username + ':' + info.password).toString('base64')}`;
        } else if (isPATAuthInfo(info)) {
            Logger.info('Using PAT Auth');
            auth = `Bearer ${info.token}`;
        } else {
            Logger.warn('Auth format not recognized');
        }

        return new HTTPClient(
            site.baseApiUrl,
            auth,
            getAgent(site),
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = await response.data;

                if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors.length > 0) {
                    const e = errJson.errors[0];
                    errString = e.message || errString;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            },
            new BasicInterceptor(site, Container.credentialManager),
        );
    }

    private keyForSite(site: DetailedSiteInfo): string {
        return `${site.credentialId} - ${site.baseApiUrl}`;
    }

    private async createClient<T>(site: DetailedSiteInfo, factory: (info: AuthInfo) => any): Promise<T | undefined> {
        let client: T | undefined = undefined;

        Logger.debug(`Creating client for ${site.baseApiUrl}`);
        const credentials = await Container.credentialManager.getAuthInfo(site, false);

        if (credentials?.state === AuthInfoState.Invalid) {
            Logger.error(new Error('Error creating client: credentials state is Invalid'));
            if (!this.hasWarnedOfFailure) {
                window
                    .showErrorMessage(
                        `There was an error connecting to ${site.name}. Please log in again.`,
                        'View Atlascode settings',
                    )
                    .then((userChoice) => {
                        if (userChoice === 'View Atlascode settings') {
                            commands.executeCommand('atlascode.showConfigPage');
                        }
                    });
                this.hasWarnedOfFailure = true;
            }
            return undefined;
        }

        if (credentials) {
            client = factory(credentials);

            // Figure out the TTL
            let ttl = oauthTTL;
            if (isOAuthInfo(credentials)) {
                if (credentials.expirationDate) {
                    const diff = credentials.expirationDate - Date.now();
                    ttl = diff;
                }
            } else {
                ttl = serverTTL;
            }

            this._clients.setItem(this.keyForSite(site), client, ttl);
        } else {
            Logger.debug(`No credentials for ${site.name}!`);
        }

        Logger.debug(`returning new client`);
        return client;
    }

    private async getClient<T>(site: DetailedSiteInfo, factory: (info: AuthInfo) => any): Promise<T> {
        let client: T | undefined = undefined;
        client = this._clients.getItem<T>(this.keyForSite(site));
        if (!client) {
            client = await this.createClient(site, factory);
        }

        if (this._agentChanged) {
            Logger.debug(`Agent changed. Creating a new client`);
            const credentials = await Container.credentialManager.getAuthInfo(site, false);

            if (credentials) {
                client = factory(credentials);

                this._clients.updateItem(this.keyForSite(site), client);
            }
            this._agentChanged = false;
        }

        return client ? client : Promise.reject(new Error(`${cannotGetClientFor}: ${site.product.name}`));
    }
}
