import axios, { AxiosInstance, AxiosResponse, CancelToken } from 'axios';

import { AuthInterceptor } from '../atlclients/authInterceptor';
import { addCurlLogging } from '../atlclients/interceptors';
import { AxiosUserAgent } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { ConnectionTimeout } from '../util/time';

export interface RequestRange {
    start: number;
    end: number;
}

export class HTTPClient {
    private transport: AxiosInstance;

    constructor(
        private baseUrl: string,
        private authHeader: string,
        private agent: any,
        private errorHandler: (errJson: AxiosResponse) => Promise<Error>,
        authInterceptor?: AuthInterceptor,
    ) {
        this.transport = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': AxiosUserAgent,
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                Authorization: this.authHeader,
            },
            ...this.agent,
        });

        if (Container.config.enableCurlLogging) {
            addCurlLogging(this.transport);
        }

        // We need to be sure that the auth interceptor is the first one since the one created in
        // this class will strip off the headers.
        if (authInterceptor) {
            authInterceptor.attachToAxios(this.transport).then(() => {
                this.transport.interceptors.response.use(
                    (response) => response,
                    async (error) => {
                        return error.response
                            ? Promise.reject(await this.errorHandler(error.response))
                            : Promise.reject(error);
                    },
                );
            });
        }
    }

    /**
     * Performs a GET request on the passed url with all the authentication and other headers that would normally be
     * applied. This is necessary for some internal APIs. For anything for which it's not required
     * [[get(urlSlug: string, queryParams?: any)]] should be used.
     *
     * @param url  The full URL to get.
     */
    async getUrl(url: string, cancelToken?: CancelToken): Promise<any> {
        try {
            const res = await this.transport(url, {
                method: 'GET',
                cancelToken: cancelToken,
            });
            return { data: res.data, headers: res.headers };
        } catch (e) {
            Logger.error(e, `Error getting URL: ${url}`);
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }
        }
    }

    async get(urlSlug: string, queryParams?: any, cancelToken?: CancelToken) {
        let url = `${urlSlug.startsWith('http') ? '' : this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);
        return this.getUrl(url, cancelToken);
    }

    async getRaw(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: 'GET',
            // axios tries to parse response as JSON by default
            // prevent that and pass through the raw data
            transformResponse: (data) => data,
        });
        return { data: res.data, headers: res.headers };
    }

    async getArrayBuffer(urlSlug: string, queryParams?: any) {
        let url = `${urlSlug.startsWith('http') ? '' : this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: 'GET',
            responseType: 'arraybuffer',
        });
        return { data: Buffer.from(res.data, 'binary').toString('base64'), headers: res.headers };
    }

    async getOctetStream(urlSlug: string, range?: RequestRange, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);

        const headers: Record<string, string> = {
            accept: 'application/octet-stream',
        };

        if (range) {
            headers['Range'] = `bytes=${range.start}-${range.end}`;
        }

        const res = await this.transport(url, {
            method: 'GET',
            headers: headers,
        });
        return { data: res.data, headers: res.headers };
    }

    async post(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${urlSlug.startsWith('http') ? '' : this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);
        try {
            const res = await this.transport(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: this.authHeader,
                },
                data: JSON.stringify(body),
                ...this.agent,
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }
        }
    }

    async put(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${urlSlug.startsWith('http') ? '' : this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: 'PUT',
            data: JSON.stringify(body),
        });

        return { data: res.data, headers: res.headers };
    }

    async delete(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${urlSlug.startsWith('http') ? '' : this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: 'DELETE',
            data: JSON.stringify(body),
        });

        return { data: res.data, headers: res.headers };
    }

    generateUrl(urlSlug: string, queryParams?: any): string {
        let url = `${this.baseUrl}${urlSlug}`;
        url = HTTPClient.addQueryParams(url, queryParams);

        return url;
    }

    public static queryObjectToString(queryParams?: any): string {
        let result = '';
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            result = `${result}?${sp.toString()}`;
        }

        return result;
    }

    public static addQueryParams(url: string, queryParams?: any): string {
        return `${url}${HTTPClient.queryObjectToString(queryParams)}`;
    }
}

// ClientError wraps Error with a toJSON() method so that it can be passed as
// part of a message to the webviews because Error fields are not enumerable
// by default
export class ClientError implements Error {
    constructor(
        public name: string,
        public message: string,
    ) {}

    toJSON() {
        return {
            name: this.name,
            message: this.message,
        };
    }
}
