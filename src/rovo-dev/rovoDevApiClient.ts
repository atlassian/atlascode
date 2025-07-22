function statusIsSuccessful(status: number | undefined) {
    return !!status && Math.floor(status / 100) === 2;
}

class RovoDevApiError extends Error {
    constructor(
        message: string,
        public httpStatus: number,
        public apiResponse: Response,
    ) {
        super(message);
    }
}

export interface RovoDevHealthcheckResponse {
    status: string;
    version: string;
}

export interface RovoDevCancelResponse {
    message: string;
    cancelled: boolean;
}

/** Implements the http client for the RovoDev CLI server */
export class RovoDevApiClient {
    private readonly _baseApiUrl: string;
    /** Base API's URL for the RovoDev service */
    public get baseApiUrl() {
        return this._baseApiUrl;
    }

    /** Constructs a new instance for the Rovo Dev API client.
     * @param {string} hostnameOrIp The hostname or IP address for the Rovo Dev service.
     * @param {number} port The http port for the Rovo Dev service.
     */
    constructor(hostnameOrIp: string, port: number) {
        this._baseApiUrl = `http://${hostnameOrIp}:${port}`;
    }

    private async fetchApi(restApi: string, method: 'GET' | 'POST'): Promise<Response>;
    private async fetchApi(restApi: string, method: 'POST', body: BodyInit | null): Promise<Response>;
    private async fetchApi(restApi: string, method: 'GET' | 'POST', body?: BodyInit | null): Promise<Response> {
        const response = await fetch(this._baseApiUrl + restApi, {
            method,
            headers: {
                accept: 'text/event-stream',
                'Content-Type': 'application/json',
            },
            body,
        });

        if (statusIsSuccessful(response.status)) {
            return response;
        } else {
            throw new RovoDevApiError(
                `Failed to fetch '${restApi} API: HTTP ${response.status}`,
                response.status,
                response,
            );
        }
    }

    /** Invokes the POST `/v2/cancel` API.
     * @returns {Promise<RovoDevCancelResponse>} An object representing the API response.
     */
    public async cancel(): Promise<RovoDevCancelResponse> {
        const response = await this.fetchApi('/v2/cancel', 'POST');
        return await response.json();
    }

    /** Invokes the POST `/v2/reset` API. */
    public async reset(): Promise<void> {
        await this.fetchApi('/v2/reset', 'POST');
    }

    /** Invokes the POST `/v2/chat` API.
     * @param {string} message The message (prompt) to send to Rovo Dev.
     * @param {boolean} [enable_deep_plan=false] [optional] A value indicating if the deep planner tool should be enabled when processing this prompt. Default value is `false`.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(message: string, enable_deep_plan: boolean = false): Promise<Response> {
        const body = JSON.stringify({
            message: message,
            enable_deep_plan,
        });

        return this.fetchApi('/v2/chat', 'POST', body);
    }

    /** Invokes the POST `/v2/replay` API
     *
     * @returns {Promise<Response>} An object representing the API response.
     */
    public replay(): Promise<Response> {
        return this.fetchApi('/v2/replay', 'POST');
    }

    /** Invokes the GET `/v2/tools` API
     * @not_implemented
     */
    public getTools() {
        throw new Error('Method not implemented: tools');
    }

    /** Invokes the POST `/v2/tool` API
     * @param {string} tool_name The name of the tool we want to invoke.
     * @param {Record<string, string>} args The arguments for the tool.
     * @not_implemented
     */
    public tool(tool_name: string, args: Record<string, string>) {
        throw new Error('Method not implemented: tool');
    }

    /** Invokes the GET `/v2/cache-file-path` API.
     * @param {string} file_path
     * @returns {Promise<string>} The file path for the cached version without Rovo Dev changes.
     */
    public async getCacheFilePath(file_path: string): Promise<string> {
        const qs = `file_path=${encodeURIComponent(file_path)}`;
        const response = await this.fetchApi(`/v2/cache-file-path?${qs}`, 'GET');
        const data = await response.json();
        return data.cached_file_path;
    }

    /** Invokes the POST `/v2/invalidate-file-cache` API.
     * @not_implemented
     */
    public invalidateFileCache() {
        throw new Error('Method not implemented: invalidate-file-cache');
    }

    /** Invokes the GET `/healthcheck` API.
     * @returns {Promise<RovoDevHealthcheckResponse>} An object representing the API response.
     */
    public async healtcheckInfo(): Promise<RovoDevHealthcheckResponse> {
        const response = await this.fetchApi('/healthcheck', 'GET');
        return await response.json();
    }

    /** Invokes the GET `/healthcheck` API.
     * @returns {Promise<boolean>} A value indicating if the service is healthy.
     */
    public async healthcheck(): Promise<boolean> {
        try {
            const data = await this.healtcheckInfo();
            return data.status === 'healthy';
        } catch {
            return false;
        }
    }
}
