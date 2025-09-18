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

export interface RovoDevChatRequestContextFileEntry {
    type: 'file';
    file_path: string;
    selection?: {
        start: number;
        end: number;
    };
    note?: string;
}

export interface RovoDevChatRequestContextOtherEntry {
    type: Exclude<string, 'file'>;
    content: string;
}

export interface RovoDevChatRequest {
    message: string;
    context: (RovoDevChatRequestContextFileEntry | RovoDevChatRequestContextOtherEntry)[];
    enable_deep_plan?: boolean;
}

export interface AbstractRovoDevHealthcheckResponse {
    version: string;
    sessionId: string | null; // from response header
}

export interface RovoDevHealthcheckBasicResponse extends AbstractRovoDevHealthcheckResponse {
    status: 'healthy' | 'unhealthy' | 'entitlement check failed';
}

export interface RovoDevHealthcheckEntitlementCheckFailedResponse extends AbstractRovoDevHealthcheckResponse {
    status: 'pending user review';
    mcp_servers: Record<string, string>;
}

export type RovoDevHealthcheckResponse =
    | RovoDevHealthcheckBasicResponse
    | RovoDevHealthcheckEntitlementCheckFailedResponse;

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

    /** Invokes the POST `/v2/sessions/create` API
     * @returns {Promise<string>} A value representing the new session id.
     */
    public async createSession(): Promise<string | null> {
        const response = await this.fetchApi('/v2/sessions/create', 'POST');
        return response.headers.get('x-session-id');
    }

    /** Invokes the POST `/v2/chat` API.
     * @param {string} message The message (prompt) to send to Rovo Dev.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(message: string): Promise<Response>;
    /** Invokes the POST `/v2/chat` API.
     * @param {RovoDevChatRequest} message The chat payload to send to Rovo Dev.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(message: RovoDevChatRequest): Promise<Response>;
    public chat(message: string | RovoDevChatRequest): Promise<Response> {
        if (typeof message === 'string') {
            message = {
                message: message,
                context: [],
            };
        }

        return this.fetchApi('/v2/chat', 'POST', JSON.stringify(message));
    }

    /** Invokes the POST `/v2/replay` API
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

    /** Invokes the POST `/v2/clear` API
     * @returns {Promise<string>} The message returned by the clear API.
     */
    public async clear(): Promise<string> {
        const response = await this.fetchApi('/v2/clear', 'POST');
        const responseJson = await response.json();
        return responseJson.message;
    }

    /** Invokes the POST `/v2/prune` API
     * @returns {Promise<string>} The message returned by the prune API.
     */
    public async prune(): Promise<string> {
        const response = await this.fetchApi('/v2/prune', 'POST');
        const responseJson = await response.json();
        return responseJson.message;
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
    public async healthcheck(): Promise<RovoDevHealthcheckResponse> {
        const response = await this.fetchApi('/healthcheck', 'GET');
        const jsonResponse = (await response.json()) as RovoDevHealthcheckResponse;
        jsonResponse.sessionId = response.headers.get('x-session-id');
        return jsonResponse;
    }

    /** Invokes the POST `/shutdown` API. */
    public async shutdown(): Promise<void> {
        await this.fetchApi('/shutdown', 'POST');
    }

    /** Invokes the POST `/accept-mcp-terms` API.
     * @param {true} acceptAll Indicates all server terms should be accepted.
     */
    public async acceptMcpTerms(acceptAll: true): Promise<void>;
    /** Invokes the POST `/accept-mcp-terms` API.
     * @param {string} serverName Specify the server name for which the acceptance decision is being provided.
     * @param {'accept' | 'deny'} decision Specify the acceptance decision.
     */
    public async acceptMcpTerms(serverName: string, decision: 'accept' | 'deny'): Promise<void>;
    public async acceptMcpTerms(serverName: string | true, decision?: 'accept' | 'deny'): Promise<void> {
        const message =
            typeof serverName === 'string'
                ? {
                      servers: [
                          {
                              server_name: serverName,
                              decision: decision === 'accept' ? 'accept' : 'deny',
                          },
                      ],
                      accept_all: 'false',
                  }
                : {
                      servers: [],
                      accept_all: 'true',
                  };

        await this.fetchApi('/accept-mcp-terms', 'POST', JSON.stringify(message));
    }
}
