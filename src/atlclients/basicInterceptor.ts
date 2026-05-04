import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { commands, window } from 'vscode';

import { Commands } from '../constants';
import { Logger } from '../logger';
import { AuthInfoState, DetailedSiteInfo, ProductBitbucket } from './authInfo';
import { AuthInterceptor } from './authInterceptor';
import { CredentialManager } from './authStore';

/**
 * BasicInterceptor detects any 401 or 403 responses from the REST service and blocks further requests with the same
 * client. It delegates to CredentialManager.handleApiUnauthorized; the auth store decides whether to persist Invalid
 * and takes care of evicting cached clients for OAuth so the next request triggers token refresh.
 */
export class BasicInterceptor implements AuthInterceptor {
    private _requestInterceptor: (config: AxiosRequestConfig) => any;
    private _responseInterceptor: (value: AxiosResponse<any>) => AxiosResponse<any>;
    private _errorInterceptor: (error: any) => any;
    private _invalidCredentials = false;

    constructor(
        private site: DetailedSiteInfo,
        private authStore: CredentialManager,
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
                this.authStore.handleApiUnauthorized(this.site);
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
