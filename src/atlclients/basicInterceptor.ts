import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { commands, window } from 'vscode';

import { Commands } from '../constants';
import { Logger } from '../logger';
import { AuthInfoState, DetailedSiteInfo, isOAuthInfo, ProductBitbucket } from './authInfo';
import { AuthInterceptor } from './authInterceptor';
import { CredentialManager } from './authStore';

/** Callback when 401/403 is received for OAuth (e.g. evict cached client so next request triggers refresh). */
export type OnOAuthUnauthorized = (site: DetailedSiteInfo) => void;

/**
 * BasicInterceptor detects any 401 or 403 responses from the REST service and blocks further requests with the same
 * client. For basic/API token auth, credentials are marked Invalid and persisted. For OAuth, Invalid is not persisted;
 * optional onOAuthUnauthorized evicts cached client so the next request triggers token refresh.
 */
export class BasicInterceptor implements AuthInterceptor {
    private _requestInterceptor: (config: AxiosRequestConfig) => any;
    private _responseInterceptor: (value: AxiosResponse<any>) => AxiosResponse<any>;
    private _errorInterceptor: (error: any) => any;
    private _invalidCredentials = false;

    constructor(
        private site: DetailedSiteInfo,
        private authStore: CredentialManager,
        private onOAuthUnauthorized?: OnOAuthUnauthorized,
    ) {
        this._responseInterceptor = (value: AxiosResponse<any>) => {
            return value;
        };

        this._requestInterceptor = async (config: AxiosRequestConfig) => {
            if (this._invalidCredentials) {
                Logger.debug(`Blocking request due to previous 40[1|3]`);
                return Promise.reject(new Error('Credentials are invalid. Please update your credentials.'));
            }
            return config;
        };

        this._errorInterceptor = (e: any) => {
            if (e.response?.status === 401 || e.response?.status === 403) {
                Logger.debug(`Received ${e.response?.status} - marking credentials as invalid`);
                this.showError();
                this._invalidCredentials = true;
                this.authStore.getAuthInfo(this.site).then((authInfo) => {
                    if (authInfo && !isOAuthInfo(authInfo)) {
                        // Only persist Invalid for basic/API token auth. For OAuth, 401/403 often means
                        // expired access token; the refresh token may still be valid and the next
                        // getAuthInfo will refresh. Persisting Invalid here would force unnecessary re-login.
                        authInfo.state = AuthInfoState.Invalid;
                        this.authStore.saveAuthInfo(this.site, authInfo);
                    } else if (authInfo && isOAuthInfo(authInfo)) {
                        this.onOAuthUnauthorized?.(this.site);
                    }
                });
            }
            return Promise.reject(e);
        };
    }

    public async attachToAxios(transport: AxiosInstance) {
        const credentials = await this.authStore.getAuthInfo(this.site);
        if (credentials?.state === AuthInfoState.Invalid) {
            Logger.debug(`Credentials are already marked as invalid.`);
            this.showError();
            this._invalidCredentials = true;
        }
        transport.interceptors.request.use(this._requestInterceptor);
        transport.interceptors.response.use(this._responseInterceptor, this._errorInterceptor);
    }

    showError() {
        const authCommand =
            this.site.product.key === ProductBitbucket.key ? Commands.ShowBitbucketAuth : Commands.ShowJiraAuth;
        window
            .showErrorMessage(`Credentials refused for ${this.site.baseApiUrl}`, { modal: false }, `Update Credentials`)
            .then((userChoice) => {
                if (userChoice === 'Update Credentials') {
                    commands.executeCommand(authCommand);
                }
            });
    }
}
