import axios, { AxiosInstance } from 'axios';
import EventEmitter from 'eventemitter3';
import * as express from 'express';
import * as http from 'http';
import Mustache from 'mustache';
import PCancelable from 'p-cancelable';
import pTimeout from 'p-timeout';
import { promisify } from 'util';
import { v4 } from 'uuid';
import * as vscode from 'vscode';
import { Disposable } from 'vscode';

import { AxiosUserAgent } from '../constants';
import { Container } from '../container';
import { getAgent } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { Resources } from '../resources';
import { ConnectionTimeout, Time } from '../util/time';
import { OAuthProvider, OAuthResponse, ProductBitbucket, ProductJira, SiteInfo } from './authInfo';
import { addCurlLogging } from './interceptors';
import { responseHandlerForStrategy } from './responseHandler';
import { Strategy, strategyForProvider } from './strategy';

declare interface ResponseEvent {
    provider: OAuthProvider;
    req: express.Request;
    res: express.Response;
    timeout?: boolean;
}

export class OAuthDancer implements Disposable {
    private static _instance: OAuthDancer;

    private _srv: http.Server | undefined;
    private _app: any;
    private _axios: AxiosInstance;
    private _authsInFlight: Map<OAuthProvider, PCancelable<OAuthResponse>> = new Map();
    private _strategiesInFlight: Map<OAuthProvider, Strategy> = new Map();
    private _oauthResponseEventEmitter: EventEmitter = new EventEmitter();
    private _shutdownCheck: any;
    private _shutdownCheckInterval = 5 * Time.MINUTES;
    private _browserTimeout = 5 * Time.MINUTES;

    private constructor() {
        this._app = this.createApp();

        this._axios = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': AxiosUserAgent,
                'Accept-Encoding': 'gzip, deflate',
            },
        });

        if (Container.config.enableCurlLogging) {
            addCurlLogging(this._axios);
        }
    }

    public static get Instance(): OAuthDancer {
        return this._instance || (this._instance = new this());
    }

    dispose() {
        this.forceShutdownAll();
    }

    private addPathForProvider(app: any, provider: OAuthProvider) {
        app.get('/' + provider, (req: any, res: any) => {
            this._oauthResponseEventEmitter.emit('response', {
                provider: provider,
                req: req,
                res: res,
            });
        });
    }

    private createApp(): any {
        const app = express();

        this.addPathForProvider(app, OAuthProvider.BitbucketCloud);
        this.addPathForProvider(app, OAuthProvider.BitbucketCloudStaging);
        this.addPathForProvider(app, OAuthProvider.JiraCloud);
        this.addPathForProvider(app, OAuthProvider.JiraCloudStaging);

        app.get('/timeout', (req, res) => {
            this._oauthResponseEventEmitter.emit('response', {
                provider: req.query.provider,
                req: req,
                res: res,
                timeout: true,
            });
        });

        return app;
    }

    public async doInitRemoteDance(state: any) {
        const provider = OAuthProvider.JiraCloudRemote;
        const strategy = strategyForProvider(provider);

        const stateBase64 = Buffer.from(JSON.stringify(state)).toString('base64');
        const uri = vscode.Uri.parse(strategy.authorizeUrl(stateBase64));
        vscode.window.showInformationMessage(`Opening browser to ${uri.toString(true)}`);
        vscode.env.openExternal(uri);
    }

    public async doFinishRemoteDance(provider: OAuthProvider, site: SiteInfo, code: string): Promise<OAuthResponse> {
        const strategy = strategyForProvider(provider);
        const agent = getAgent(site);
        const responseHandler = responseHandlerForStrategy(strategy!, agent, this._axios);
        const tokens = await responseHandler.tokens(code as string);
        const accessibleResources = await responseHandler.accessibleResources(tokens.accessToken);
        if (accessibleResources.length === 0) {
            throw new Error(`No accessible resources found for ${provider}`);
        }
        const user = await responseHandler.user(tokens.accessToken, accessibleResources[0]);

        return {
            access: tokens.accessToken,
            refresh: tokens.refreshToken!,
            expirationDate: tokens.expiration,
            iat: tokens.iat,
            receivedAt: tokens.receivedAt,
            user: user,
            accessibleResources: accessibleResources,
        };
    }

    public async doDance(provider: OAuthProvider, site: SiteInfo, callback: string): Promise<OAuthResponse> {
        const currentlyInflight = this._authsInFlight.get(provider);
        if (currentlyInflight) {
            currentlyInflight.cancel(`Authentication for ${provider} has been cancelled.`);
            this._authsInFlight.delete(provider);
        }

        const strategy = strategyForProvider(provider);
        this._strategiesInFlight.set(provider, strategy);

        const state = v4();
        const cancelPromise = new PCancelable<OAuthResponse>((resolve, reject, onCancel) => {
            const myState = state;
            const responseListener = async (respEvent: ResponseEvent) => {
                if (respEvent.timeout) {
                    this._authsInFlight.delete(respEvent.provider);

                    Logger.debug('oauth timed out', respEvent.req.query);
                    respEvent.res.send(
                        Mustache.render(Resources.html.get('authFailureHtml')!, {
                            errMessage: 'Authorization did not complete in the time alotted.',
                            actionMessage: 'Please try again.',
                            vscodeurl: callback,
                        }),
                    );
                    reject(`Authorization did not complete in the time alotted for '${respEvent.provider}'`);
                    return;
                }

                const product = respEvent.provider.startsWith('jira') ? ProductJira : ProductBitbucket;

                if (
                    respEvent.req.query &&
                    respEvent.req.query.code &&
                    respEvent.req.query.state &&
                    respEvent.req.query.state === myState
                ) {
                    try {
                        const strategy = this._strategiesInFlight.get(respEvent.provider);
                        if (!strategy) {
                            reject(
                                `Auth failure. No strategy for provider ${respEvent.provider}. There may have been overlapping requests.`,
                            );
                        }
                        this._strategiesInFlight.delete(respEvent.provider);
                        const agent = getAgent(site);
                        const responseHandler = responseHandlerForStrategy(strategy!, agent, this._axios);
                        const tokens = await responseHandler.tokens(respEvent.req.query.code as string);
                        const accessibleResources = await responseHandler.accessibleResources(tokens.accessToken);
                        if (accessibleResources.length === 0) {
                            throw new Error(`No accessible resources found for ${provider}`);
                        }
                        const user = await responseHandler.user(tokens.accessToken, accessibleResources[0]);

                        this._authsInFlight.delete(respEvent.provider);

                        respEvent.res.send(
                            Mustache.render(Resources.html.get('authSuccessHtml')!, {
                                product: product,
                                vscodeurl: callback,
                            }),
                        );

                        const oauthResponse: OAuthResponse = {
                            access: tokens.accessToken,
                            refresh: tokens.refreshToken!,
                            expirationDate: tokens.expiration,
                            iat: tokens.iat,
                            receivedAt: tokens.receivedAt,
                            user: user,
                            accessibleResources: accessibleResources,
                        };
                        this.maybeShutdown();
                        resolve(oauthResponse);
                    } catch (err) {
                        this._authsInFlight.delete(respEvent.provider);
                        this._strategiesInFlight.delete(respEvent.provider);

                        respEvent.res.send(
                            Mustache.render(Resources.html.get('authFailureHtml')!, {
                                errMessage: `Error authenticating with ${provider}: ${err}`,
                                actionMessage: 'Give it a moment and try again.',
                                vscodeurl: callback,
                            }),
                        );

                        reject(`Error authenticating with ${provider}: ${err}`);
                    }
                }
            };

            this._oauthResponseEventEmitter.addListener('response', responseListener);

            onCancel(() => {
                this._authsInFlight.delete(provider);
                this.maybeShutdown();
            });
        });

        this._authsInFlight.set(provider, cancelPromise);

        if (!this._srv) {
            this._srv = http.createServer(this._app);
            const listenPromise = promisify(this._srv.listen.bind(this._srv));
            try {
                await listenPromise(31415, () => {});
                Logger.debug('auth server started on port 31415');
            } catch (err) {
                Logger.error(err, 'Unable to start auth listener on localhost:31415');
                return Promise.reject(`Unable to start auth listener on localhost:31415: ${err}`);
            }

            this.startShutdownChecker();
        }

        vscode.env.openExternal(vscode.Uri.parse(strategy.authorizeUrl(state)));

        return pTimeout<OAuthResponse, OAuthResponse>(
            cancelPromise,
            this._browserTimeout,
            (): Promise<OAuthResponse> => {
                vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:31415/timeout?provider=${provider}`));
                return Promise.reject(`'Authorization did not complete in the time alotted for '${provider}'`);
            },
        );
    }

    private maybeShutdown() {
        if (this._authsInFlight.entries.length < 1) {
            if (this._shutdownCheck) {
                clearInterval(this._shutdownCheck);
            }

            if (this._srv) {
                this._srv.close();
                this._srv = undefined;
                Logger.debug('auth server on port 31415 has been shutdown');
            }
        }
    }

    private forceShutdownAll() {
        this._authsInFlight.forEach((promise) => {
            promise.cancel();
        });

        this._authsInFlight.clear();

        if (this._shutdownCheck) {
            clearInterval(this._shutdownCheck);
        }

        if (this._srv) {
            this._srv.close();
            this._srv = undefined;
            Logger.debug('auth server on port 31415 has been shutdown');
        }
    }

    private startShutdownChecker() {
        //make sure we clear the old one in case they click multiple times
        const oldTimer = this._shutdownCheck;
        if (oldTimer) {
            clearInterval(oldTimer);
        }

        this._shutdownCheck = setInterval(this.maybeShutdown, this._shutdownCheckInterval);
    }
}
