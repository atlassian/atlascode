import { RovoDevTelemetryProvider } from '../rovoDevTelemetryProvider';
import {
    AgentMode,
    RovoDevAvailableModesResponse,
    RovoDevCancelResponse,
    RovoDevChatRequest,
    RovoDevGetAgentModelResponse,
    RovoDevGetAgentModeResponse,
    RovoDevGetAvailableAgentModelsResponse,
    RovoDevHealthcheckResponse,
    RovoDevSavedPromptsResponse,
    RovoDevSetAgentModelRequest,
    RovoDevSetAgentModelResponse,
    RovoDevSetAgentModeRequest,
    RovoDevSetAgentModeResponse,
    RovoDevStatusAPIResponse,
    ToolPermissionChoice,
} from './rovoDevApiClientInterfaces';

function statusIsSuccessful(status: number | undefined) {
    return !!status && Math.floor(status / 100) === 2;
}

export class RovoDevApiError extends Error {
    constructor(
        message: string,
        public httpStatus: number,
        public apiResponse: Response | undefined,
    ) {
        super(message);
    }
}

export interface RovoDevSession {
    id: string;
    title: string;
    created: string;
    last_saved: string;
    initial_prompt: string;
    prompts: string[];
    latest_result: string;
    workspace_path: string;
    parent_session_id: string | null;
    num_messages: number;
    log_dir: string;
}

/** Implements the http client for the RovoDev CLI server */
export class RovoDevApiClient {
    private readonly _authBearerHeader: string | undefined;

    private readonly _baseApiUrl: string;
    /** Base API's URL for the RovoDev service */
    public get baseApiUrl() {
        return this._baseApiUrl;
    }

    /** Constructs a new instance for the Rovo Dev API client.
     * @param {string} hostnameOrIp The hostname or IP address for the Rovo Dev service.
     * @param {number} port The http port for the Rovo Dev service.
     */
    constructor(hostnameOrIp: string, port: number, sessionToken: string) {
        this._baseApiUrl = `http://${hostnameOrIp}:${port}`;
        this._authBearerHeader = sessionToken ? 'Bearer ' + sessionToken : undefined;
    }

    private async fetchApi(
        restApi: string,
        method: 'GET' | 'DELETE',
        body?: undefined,
        abortSignal?: AbortSignal | null,
    ): Promise<Response>;
    private async fetchApi(
        restApi: string,
        method: 'POST' | 'PATCH',
        body?: BodyInit | null,
        abortSignal?: AbortSignal | null,
    ): Promise<Response>;
    private async fetchApi(
        restApi: string,
        method: 'POST' | 'PATCH' | 'PUT',
        body?: BodyInit | null,
    ): Promise<Response>;
    private async fetchApi(
        restApi: string,
        method: 'GET' | 'DELETE' | 'POST' | 'PATCH' | 'PUT',
        body?: BodyInit | null,
        abortSignal?: AbortSignal | null,
    ): Promise<Response> {
        const headers: Record<string, string> = {
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
        };

        if (this._authBearerHeader) {
            headers['Authorization'] = this._authBearerHeader;
        }

        let response: Response;
        try {
            response = await fetch(this._baseApiUrl + restApi, {
                method,
                headers,
                body,
                signal: abortSignal ?? undefined,
            });
        } catch (err) {
            const reason = err.cause?.code || err.message || err;
            const error = new RovoDevApiError(`Failed to fetch '${restApi} API: ${reason}'`, 0, undefined);
            // Skip logging for healthcheck calls since they're polled frequently during startup
            if (restApi !== '/healthcheck') {
                RovoDevTelemetryProvider.logError(error, String(reason));
            }
            throw error;
        }

        if (statusIsSuccessful(response.status)) {
            return response;
        } else {
            const message = `Failed to fetch '${restApi} API: HTTP ${response.status}'`;
            const error = new RovoDevApiError(message, response.status, response);
            // Skip logging for healthcheck calls since they're polled frequently during startup
            if (restApi !== '/healthcheck') {
                RovoDevTelemetryProvider.logError(error, message);
            }
            throw error;
        }
    }

    /** Invokes the POST `/v3/cancel` API.
     * @returns {Promise<RovoDevCancelResponse>} An object representing the API response.
     */
    public async cancel(): Promise<RovoDevCancelResponse> {
        const response = await this.fetchApi('/v3/cancel', 'POST');
        return await response.json();
    }

    /** Invokes the GET `/v3/sessions/current_session` API
     * @returns {Promise<RovoDevSession>} An object representing the current session.
     */
    public async getCurrentSession(): Promise<RovoDevSession> {
        const response = await this.fetchApi('/v3/sessions/current_session', 'GET');
        return await response.json();
    }

    /** Invokes the GET `/v3/sessions/list` API
     * @returns {Promise<RovoDevSession[]>} The list of sessions.
     */
    public async listSessions(): Promise<RovoDevSession[]> {
        const response = await this.fetchApi('/v3/sessions/list', 'GET');
        const obj = await response.json();
        return obj.sessions || [];
    }

    /** Invokes the POST `/v3/sessions/{session_id}/restore` API
     */
    public async restoreSession(sessionId: string): Promise<void> {
        const response = await this.fetchApi(`/v3/sessions/${sessionId}/restore`, 'POST');
        await response.json();
    }

    /** Invokes the POST `/v3/sessions/{session_id}/fork` API
     * @returns {Promise<string>} A value representing the new session id.
     */
    public async forkSession(sessionId: string): Promise<string> {
        const response = await this.fetchApi(`/v3/sessions/${sessionId}/fork`, 'POST');
        const obj = await response.json();
        return obj.session_id;
    }

    /** Invokes the POST `/v3/sessions/create` API
     * @returns {Promise<string>} A value representing the new session id.
     */
    public async createSession(): Promise<string | null> {
        const response = await this.fetchApi('/v3/sessions/create', 'POST');
        return response.headers.get('x-session-id');
    }

    /** Invokes the DELETE `/v3/sessions/{session_id}` API
     */
    public async deleteSession(sessionId: string): Promise<void> {
        const response = await this.fetchApi(`/v3/sessions/${sessionId}`, 'DELETE');
        await response.json();
    }

    /** Invokes the POST `/v3/set_chat_message` API, then the GET `/v3/stream_chat` API.
     * @param {string} message The message (prompt) to send to Rovo Dev.
     * @param {boolean?} pause_on_call_tools_start Set to `true` to pause before every tool execution. Defaults to `false`.
     * @param {AbortSignal?} abortSignal An optional AbortSignal to cancel the request.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(
        message: string,
        pause_on_call_tools_start?: boolean,
        abortSignal?: AbortSignal | null,
    ): Promise<Response>;
    /** Invokes the POST `/v3/set_chat_message` API, then the GET `/v3/stream_chat` API.
     * @param {RovoDevChatRequest} message The chat payload to send to Rovo Dev.
     * @param {boolean?} pause_on_call_tools_start Set to `true` to pause before every tool execution. Defaults to `false`.
     * @param {AbortSignal?} abortSignal An optional AbortSignal to cancel the request.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public chat(
        message: RovoDevChatRequest,
        pause_on_call_tools_start?: boolean,
        abortSignal?: AbortSignal | null,
    ): Promise<Response>;
    public async chat(
        message: string | RovoDevChatRequest,
        pause_on_call_tools_start?: boolean,
        abortSignal?: AbortSignal | null,
    ): Promise<Response> {
        if (typeof message === 'string') {
            message = {
                message: message,
                context: [],
            };
        }

        await this.fetchApi('/v3/set_chat_message', 'POST', JSON.stringify(message));

        const qs = `pause_on_call_tools_start=${pause_on_call_tools_start ? 'true' : 'false'}`;
        return await this.fetchApi(`/v3/stream_chat?${qs}`, 'GET', undefined, abortSignal);
    }

    /** Invokes the POST `/v3/resume_tool_calls` API.
     * @param {Record<string, 'allow' | 'deny' | 'undecided'>} permissionChoices A map of `toolCallId : choice` representing the choice
     *   taken for the tool permission request. If provided choice is `'undecided'`, it's defaulted to `'deny'`.
     */
    public async resumeToolCall(permissionChoices: Record<string, ToolPermissionChoice | 'undecided'>): Promise<void> {
        const defaultDenyMessage = 'I denied the execution of this tool call';

        const decisions: { tool_call_id: string; deny_message?: string }[] = [];

        for (const key in permissionChoices) {
            const choice = permissionChoices[key];
            decisions.push({ tool_call_id: key, deny_message: choice === 'allow' ? undefined : defaultDenyMessage });
        }

        const message = { decisions };

        await this.fetchApi('/v3/resume_tool_calls', 'POST', JSON.stringify(message));
    }

    /** Invokes the POST `/v3/replay` API
     * @param {AbortSignal?} abortSignal An optional AbortSignal to cancel the request.
     * @returns {Promise<Response>} An object representing the API response.
     */
    public replay(abortSignal?: AbortSignal | null): Promise<Response> {
        return this.fetchApi('/v3/replay', 'POST', undefined, abortSignal);
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

    /** Invokes the GET `/v3/status` API. */
    public async status(): Promise<RovoDevStatusAPIResponse> {
        const response = await this.fetchApi('/v3/status', 'GET');
        return await response.json();
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

    /** Invokes the GET `/v3/agent-mode` API.
     * @returns {Promise<RovoDevGetAgentModeResponse>} An object representing the current agent mode.
     */
    public async getAgentMode(): Promise<RovoDevGetAgentModeResponse> {
        const response = await this.fetchApi('/v3/agent-mode', 'GET');
        return await response.json();
    }

    /** Invokes the PUT `/v3/agent-mode` API.
     * @param {AgentMode} mode The agent mode to set ('ask', 'default', or 'plan').
     * @returns {Promise<RovoDevSetAgentModeResponse>} An object representing the API response.
     */
    public async setAgentMode(mode: AgentMode): Promise<RovoDevSetAgentModeResponse> {
        const request: RovoDevSetAgentModeRequest = { mode };
        const response = await this.fetchApi('/v3/agent-mode', 'PUT', JSON.stringify(request));
        return await response.json();
    }

    /** Invokes the GET `/v3/available-modes` API.
     * @returns {Promise<RovoDevAvailableModesResponse>} An object representing all available agent modes.
     */
    public async getAvailableModes(): Promise<RovoDevAvailableModesResponse> {
        const response = await this.fetchApi('/v3/available-modes', 'GET');
        return await response.json();
    }

    /** Invokes the GET `/v3/agent-model` API.
     * @returns {Promise<RovoDevGetAgentModelResponse>} An object representing the current agent model.
     */
    public async getAgentModel(): Promise<RovoDevGetAgentModelResponse> {
        const response = await this.fetchApi('/v3/agent-model', 'GET');
        return await response.json();
    }

    /** Invokes the PUT `/v3/agent-model` API.
     * @param {string} modelId The agent model ID to switch to.
     * @returns {Promise<RovoDevSetAgentModelResponse>} An object representing the API response.
     */
    public async setAgentModel(modelId: string): Promise<RovoDevSetAgentModelResponse> {
        const request: RovoDevSetAgentModelRequest = { model_id: modelId };
        const response = await this.fetchApi('/v3/agent-model', 'PUT', JSON.stringify(request));
        return await response.json();
    }

    /** Invokes the GET `/v3/agent-models` API.
     * @returns {Promise<RovoDevGetAvailableAgentModelsResponse>} An object representing all available agent models.
     */
    public async getAvailableAgentModels(): Promise<RovoDevGetAvailableAgentModelsResponse> {
        const response = await this.fetchApi('/v3/agent-models', 'GET');
        return await response.json();
    }

    public async getSavedPrompts(): Promise<RovoDevSavedPromptsResponse> {
        const response = await this.fetchApi(`/v3/prompts`, 'GET');

        const jsonResponse = (await response.json()) as RovoDevSavedPromptsResponse;
        return jsonResponse;
    }
}
