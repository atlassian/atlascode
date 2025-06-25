function statusIsSuccessful(status: number | undefined) {
    return !!status && Math.floor(status / 100) === 2;
}

/** Implements the http client for the RovoDev CLI server */
export class RovoDevApiClient {
    private readonly _baseApiUrl: string;
    /** Base API's URL for the RovoDev service */
    public get baseApiUrl() {
        return this._baseApiUrl;
    }

    constructor(hostnameOrIp: string, port: number) {
        this._baseApiUrl = `http://${hostnameOrIp}:${port}`;
    }

    private fetchApi(restApi: string, method: 'GET' | 'POST'): Promise<Response>;
    private fetchApi(restApi: string, method: 'POST', body: BodyInit | null): Promise<Response>;
    private fetchApi(restApi: string, method: 'GET' | 'POST', body?: BodyInit | null): Promise<Response> {
        return fetch(this._baseApiUrl + restApi, {
            method,
            headers: {
                accept: 'text/event-stream',
                'Content-Type': 'application/json',
            },
            body,
        });
    }

    private async fetchApiSafe<T>(fetchOp: Promise<T>): Promise<T | undefined> {
        try {
            return await fetchOp;
        } catch {
            return undefined;
        }
    }

    private async invokeBooleanApi(restApi: string, method: 'GET' | 'POST', safeInvoke?: boolean) {
        const fetchOp = this.fetchApi(restApi, method);

        const response = safeInvoke ? await this.fetchApiSafe(fetchOp) : await fetchOp;

        return statusIsSuccessful(response?.status);
    }

    /** Invokes the POST /v2/cancel rest API */
    public async cancel(safeInvoke?: boolean): Promise<boolean> {
        try {
            const response = await this.fetchApi('/v2/cancel', 'POST');
            const data = await response.json();
            return data.cancelled;
        } catch (error) {
            if (safeInvoke) {
                return false;
            } else {
                throw error;
            }
        }
    }

    /** Invokes the POST /v2/reset rest API */
    public reset(safeInvoke?: boolean): Promise<boolean> {
        return this.invokeBooleanApi('/v2/reset', 'POST', safeInvoke);
    }

    /** Invokes the POST /v2/chat rest API
     * @param message
     */
    public chat(message: string): Promise<Response> {
        const body = JSON.stringify({
            message: message,
        });

        return this.fetchApi('/v2/chat', 'POST', body);
    }

    /** Invokes the POST /v2/replay rest API */
    public replay(): Promise<Response> {
        return this.fetchApi('/v2/replay', 'POST');
    }

    /** Invokes the GET /v2/tools rest API
     * @not_implemented !!!
     */
    public tools() {
        throw new Error('Method not implemented: tools');
    }

    /** Invokes the POST /v2/tool rest API
     * @param tool_name
     * @param args
     * @not_implemented !!!
     */
    public tool(tool_name: string, args: Record<string, string>) {
        throw new Error('Method not implemented: tool');
    }

    /** Invokes the GET /healthcheck rest API */
    public async healthcheck(safeInvoke?: boolean): Promise<boolean> {
        return this.invokeBooleanApi('/healthcheck', 'GET', safeInvoke);
    }
}
