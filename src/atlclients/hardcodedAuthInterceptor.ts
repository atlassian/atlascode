import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { Logger } from '../logger';
import { AuthInfoState, DetailedSiteInfo } from './authInfo';
import { AuthInterceptor } from './authInterceptor';
import { CredentialManager } from './authStore';
import { LoginManager } from './loginManager';

/**
 * HardcodedAuthInterceptor detects any 401 or 403 responses from the REST service and retries the request via the
 * refresh flow.
 *
 * This is not generic rigt now and is tied a bit to the hardcoded auth flow right now.
 *
 * At an idea level, the magic starts when we receive a 401 response. Then, we try to refresh the token.
 * if successful, we _copy_ the auth header from the refreshed token within the interceptor itself and all new requests
 * will use the interceptor's auth header instead of the original one.
 *
 * Moreover, to ensure multiple requests are blocked until the refresh is successful, we use a promise reference.
 * We use the same promise reference for all requests: we know that a token is about to be refreshed: better to wait for the new header
 * instead of making a request with the old header and failing.
 *
 * THERE IS NO RETRY COUNT. This is the part where the hardcoded auth flow expectation is baked in. The credentials file will be changed
 * not very often. Also, we are very conservative about the 401 retries: as soon as the refresh token fails even once, we give up and return
 * an error. We store this error state in the interceptor itself: all subsequent requests will be blocked as well without even attmpting
 * an API call.
 */
export class HardcodedAuthInterceptor implements AuthInterceptor {
    // Internal structure that indicates a refresh is happening if it is not undefined
    private isRefreshing: Promise<void> | undefined;

    // Internal structure that holds the latest auth header after the latest successful refresh
    private authHeader: string | undefined;

    // Short-circuits requests and fails them if true
    private invalidCredentials = false;

    // Internal function that refreshes the auth header
    // It uses `isRefreshing` to block parallel refresh attempts; subsequent calls to this function will wait for the
    // first call to complete and then return the same promise
    private refreshAuthHeader(): Promise<void> {
        if (this.isRefreshing) {
            return this.isRefreshing;
        }

        /**
         * A lot of heavy work happens within this promise.
         * At the end of this promise, either the new auth header is set or the credentials are marked as invalid.
         *
         * This promise always resolves to make the implementation easier
         */
        this.isRefreshing = new Promise(async (resolve) => {
            // refresh was not successful: 401 is necessary now
            const refreshed = await this.authStore.refreshOrMarkAsInvalid(this.site);
            if (refreshed) {
                // refresh was successful: get the latest auth info
                const authInfo = await this.authStore.getAuthInfo(this.site, false);
                // sanity checks: we expect all these checks to be true if we have reached this point
                if (authInfo && authInfo.state === AuthInfoState.Valid && authInfo.type === 'hardcoded') {
                    this.authHeader = LoginManager.authHeader(authInfo);
                    resolve();
                }
            }

            // Unsuccessful in all other cases: mark the credentials as invalid
            this.invalidCredentials = true;
            this.authHeader = undefined;

            resolve();
            // unset the isRefreshing reference for all control flow branches: akin to releasing a lock
            this.isRefreshing = undefined;
        });

        return this.isRefreshing;
    }

    constructor(
        private site: DetailedSiteInfo,
        private authStore: CredentialManager,
    ) {}

    public async attachToAxios(transport: AxiosInstance) {
        const requestInterceptor: (config: AxiosRequestConfig) => any = async (config: AxiosRequestConfig) => {
            await this.isRefreshing;

            if (this.invalidCredentials) {
                Logger.debug(`Blocking request due to previous 401`);
                return undefined;
            }

            // Wait if we are refreshing the auth header; new auth header comes after it
            // use the latest auth header if it is available in the request
            if (this.authHeader) {
                config.headers = { ...config.headers, Authorization: this.authHeader };
            }

            return config;
        };

        const responseHandler = (response: AxiosResponse) => {
            return response;
        };

        const errorHandler = async (e: any) => {
            if (e?.response?.status === 401) {
                if (e.config !== undefined) {
                    await this.refreshAuthHeader();

                    if (this.invalidCredentials) {
                        return undefined;
                    }

                    // We definitely refreshed the auth header: use the latest one
                    return transport({ ...e.config.headers, Authorization: this.authHeader });
                }
            }

            return Promise.reject(e);
        };
        transport.interceptors.request.use(requestInterceptor);
        transport.interceptors.response.use(responseHandler, errorHandler);
    }
}
