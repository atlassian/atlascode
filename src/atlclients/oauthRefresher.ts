import axios, { AxiosInstance } from 'axios';
import { Disposable } from 'vscode';

import { AxiosUserAgent } from '../constants';
import { Container } from '../container';
import { getAgent } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { ConnectionTimeout } from '../util/time';
import { OAuthProvider, ProductBitbucket, ProductJira } from './authInfo';
import { addCurlLogging } from './interceptors';
import { strategyForProvider } from './strategy';
import { Tokens, tokensFromResponseData } from './tokens';

export interface TokenResponse {
    tokens?: Tokens;
    shouldInvalidate: boolean;
    shouldSlowDown?: boolean;
}

export class OAuthRefesher implements Disposable {
    private _axios: AxiosInstance;

    constructor() {
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

    dispose() {}

    public async getNewTokens(provider: OAuthProvider, refreshToken: string): Promise<TokenResponse> {
        Logger.debug(`Starting token refresh`);
        const product = provider.startsWith('jira') ? ProductJira : ProductBitbucket;

        if (!refreshToken) {
            const error = new Error('Refresh token is missing or empty');
            Logger.error(error, 'Error while refreshing tokens: refresh token is missing');
            return { tokens: undefined, shouldInvalidate: true };
        }

        const response: TokenResponse = { tokens: undefined, shouldInvalidate: false };
        try {
            const strategy = strategyForProvider(provider);

            const tokenResponse = await this._axios(strategy.tokenUrl(), {
                method: 'POST',
                headers: strategy.refreshHeaders(),
                data: strategy.tokenRefreshData(refreshToken),
                ...getAgent(),
            });

            if (product === ProductJira) {
                response.tokens = tokensFromResponseData(tokenResponse.data);
                Logger.debug(`have new tokens`);
            } else {
                const data = tokenResponse.data;

                response.tokens = {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    receivedAt: Date.now(),
                };

                if (data.expires_in) {
                    response.tokens['expiration'] = Date.now() + data.expires_in * 1000;
                }
            }
        } catch (err) {
            const responseStatusDescription = err.response?.status ? ` ${err.response.status}` : '';
            const axiosErrorData = ` (Axios message: ${err?.response?.data?.error}. Axios description: ${err?.response?.data?.error_description})`;

            if (!err.response && err.code === 'ENOTFOUND') {
                Logger.debug(`Network error while refreshing tokens. Hostname: "${err.hostname}". Will retry later.`);
                response.shouldSlowDown = true;
            } else if (err.response?.status === 401 || err.response?.status === 403) {
                Logger.debug(
                    `Auth error (${err.response.status}) while refreshing tokens. Credentials will be invalidated.`,
                );
                response.shouldInvalidate = true;
                response.shouldSlowDown = true;
            } else {
                // Log as debug - authStore will log as error if retries exhausted
                Logger.debug(`Error while refreshing tokens` + responseStatusDescription + axiosErrorData);
                response.shouldSlowDown = true;
            }
        }
        return response;
    }
}
