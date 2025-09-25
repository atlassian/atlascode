function statusIsSuccessful(status: number | undefined) {
    return !!status && Math.floor(status / 100) === 2;
}

class RovoDevApiError extends Error {
    constructor(
        message: string,
        public httpStatus: number,
        public apiResponse: Response | undefined,
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

export interface RovoDevHealthcheckResponse {
    status: 'unknown' | 'healthy' | 'unhealthy' | 'entitlement check failed' | 'pending user review';
    version: string;
    mcp_servers: Record<string, string>;
    sessionId: string | null; // from response header
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

    private async fetchApi(restApi: string, method: 'GET'): Promise<Response>;
    private async fetchApi(restApi: string, method: 'POST', body?: BodyInit | null): Promise<Response>;
    private async fetchApi(restApi: string, method: 'GET' | 'POST', body?: BodyInit | null): Promise<Response> {
        let response: Response;
        try {
            response = await fetch(this._baseApiUrl + restApi, {
                method,
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                },
                body,
            });
        } catch (error) {
            const reason = error.cause?.code || error.message || error;
            throw new RovoDevApiError(`Failed to fetch '${restApi} API: ${reason}`, 0, undefined);
        }

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

    /** Invokes the POST `/v3/cancel` API.
     * @returns {Promise<RovoDevCancelResponse>} An object representing the API response.
     */
    public async cancel(): Promise<RovoDevCancelResponse> {
        const response = await this.fetchApi('/v3/cancel', 'POST');
        return await response.json();
    }

    /** Invokes the POST `/v3/sessions/create` API
     * @returns {Promise<string>} A value representing the new session id.
     */
    public async createSession(): Promise<string | null> {
        const response = await this.fetchApi('/v3/sessions/create', 'POST');
        return response.headers.get('x-session-id');
    }

    /** Invokes the POST `/v3/set_chat_message` API, then the GET `/v3/stream_chat` API.
     * @param {string} message The message (prompt) to send to Rovo Dev.
     * @param {boolean?} pause_on_call_tools_start Set to `true` to pause before every tool execution. Defaults to `false`.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(message: string, pause_on_call_tools_start?: boolean): Promise<Response>;
    /** Invokes the POST `/v3/set_chat_message` API, then the GET `/v3/stream_chat` API.
     * @param {RovoDevChatRequest} message The chat payload to send to Rovo Dev.
     * @param {boolean?} pause_on_call_tools_start Set to `true` to pause before every tool execution. Defaults to `false`.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(message: RovoDevChatRequest, pause_on_call_tools_start?: boolean): Promise<Response>;
    public async chat(message: string | RovoDevChatRequest, pause_on_call_tools_start?: boolean): Promise<Response> {
        if (typeof message === 'string') {
            message = {
                message: message,
                context: [],
            };
        }

        await this.fetchApi('/v3/set_chat_message', 'POST', JSON.stringify(message));

        const qs = `pause_on_call_tools_start=${pause_on_call_tools_start ? 'true' : 'false'}`;
        return await this.fetchApi(`/v3/stream_chat?${qs}`, 'GET');
    }

    /** Invokes the POST `/v3/resume_tool_calls` API.
     * @param {string[]} toolCallIds A list of tool call IDs to allow.
     */
    public async resumeToolCall(toolCallIds: string[]): Promise<void>;
    /** Invokes the POST `/v3/resume_tool_calls` API.
     * @param {string} toolCallId The ID of the tool call to either allow or deny.
     * @param {string?} denyMessage The deny message for this tool call, or `undefined` to allow the tool call. Defaults to `undefined`.
     */
    public async resumeToolCall(toolCallId: string, denyMessage?: string): Promise<void>;
    public async resumeToolCall(toolCallId: string | string[], denyMessage?: string): Promise<void> {
        const message = Array.isArray(toolCallId)
            ? {
                  decisions: toolCallId.map((tool_call_id) => ({ tool_call_id })),
              }
            : {
                  decisions: [
                      {
                          tool_call_id: toolCallId,
                          deny_message: denyMessage || undefined,
                      },
                  ],
              };

        await this.fetchApi('/v3/resume_tool_calls', 'POST', JSON.stringify(message));
    }

    /** Invokes the POST `/v3/replay` API
     * @returns {Promise<Response>} An object representing the API response.
     */
    public replay(): Promise<Response> {
        return this.fetchApi('/v3/replay', 'POST');
    }

    /** Invokes the GET `/v3/cache-file-path` API.
     * @param {string} file_path
     * @returns {Promise<string>} The file path for the cached version without Rovo Dev changes.
     */
    public async getCacheFilePath(file_path: string): Promise<string> {
        const qs = `file_path=${encodeURIComponent(file_path)}`;
        const response = await this.fetchApi(`/v3/cache-file-path?${qs}`, 'GET');
        const data = await response.json();
        return data.cached_file_path;
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
