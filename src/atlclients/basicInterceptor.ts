import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { commands, window } from 'vscode';

import { Commands } from '../constants';
import { Logger } from '../logger';
import { AuthInfoState, DetailedSiteInfo, isBasicAuthInfo, isOAuthInfo, isPATAuthInfo } from './authInfo';
import { AuthInterceptor } from './authInterceptor';
import { CredentialManager } from './authStore';

/** Number of consecutive 401/403 responses before invalidating Basic/PAT credentials. */
const BASIC_PAT_INVALIDATE_THRESHOLD = 3;

/**
 * BasicInterceptor detects 401 or 403 responses and applies credential-type-specific handling:
 * - OAuth: attempt token refresh; invalidate only if refresh fails.
 * - Basic/PAT: allow tolerance (invalidate only after multiple consecutive 401/403).
 */
export class BasicInterceptor implements AuthInterceptor {
    private _requestInterceptor: (config: AxiosRequestConfig) => any;
    private _responseInterceptor: (value: AxiosResponse<any>) => AxiosResponse<any>;
    private _errorInterceptor: (error: any) => any;
    private _invalidCredentials = false;
    private _consecutiveAuthErrors = 0;

    constructor(
        private site: DetailedSiteInfo,
        private authStore: CredentialManager,
    ) {
        this._responseInterceptor = (value: AxiosResponse<any>) => {
            this._consecutiveAuthErrors = 0; // reset on successful response
            return value;
        };

        this._requestInterceptor = async (config: AxiosRequestConfig) => {
            if (this._invalidCredentials) {
                Logger.debug(`Blocking request due to previous 40[1|3]`);
                return Promise.reject(new Error('Credentials are invalid. Please update your credentials.'));
            }
            return config;
        };

        this._errorInterceptor = async (e: any) => {
            if (e.response?.status !== 401 && e.response?.status !== 403) {
                return Promise.reject(e);
            }
            const status = e.response?.status;
            const authInfo = await this.authStore.getCachedAuthInfo(this.site);
            if (!authInfo) {
                Logger.debug(`Received ${status} - no cached auth, rejecting`);
                return Promise.reject(e);
            }
            if (isOAuthInfo(authInfo)) {
                const stillValid = await this.authStore.attemptRefreshAfterAuthError(this.site);
                if (!stillValid) {
                    Logger.debug(`Received ${status} - OAuth refresh failed, marking credentials as invalid`);
                    this.showError();
                    this._invalidCredentials = true;
                    // authStore already set state to Invalid and saved in refreshAccessToken
                } else {
                    Logger.debug(`Received ${status} - OAuth refresh succeeded, credentials still valid`);
                }
            } else if (isBasicAuthInfo(authInfo) || isPATAuthInfo(authInfo)) {
                this._consecutiveAuthErrors += 1;
                if (this._consecutiveAuthErrors >= BASIC_PAT_INVALIDATE_THRESHOLD) {
                    Logger.debug(
                        `Received ${status} - ${this._consecutiveAuthErrors} consecutive auth errors for Basic/PAT, marking credentials as invalid`,
                    );
                    this.showError();
                    this._invalidCredentials = true;
                    authInfo.state = AuthInfoState.Invalid;
                    await this.authStore.saveAuthInfo(this.site, authInfo);
                } else {
                    Logger.debug(
                        `Received ${status} - Basic/PAT auth error ${this._consecutiveAuthErrors}/${BASIC_PAT_INVALIDATE_THRESHOLD}, not invalidating yet`,
                    );
                }
            } else {
                Logger.debug(`Received ${status} - unknown credential type, marking credentials as invalid`);
                this.showError();
                this._invalidCredentials = true;
                authInfo.state = AuthInfoState.Invalid;
                await this.authStore.saveAuthInfo(this.site, authInfo);
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
        window
            .showErrorMessage(`Credentials refused for ${this.site.baseApiUrl}`, { modal: false }, `Update Credentials`)
            .then((userChoice) => {
                if (userChoice === 'Update Credentials') {
                    commands.executeCommand(Commands.ShowJiraAuth);
                }
            });
    }
}
