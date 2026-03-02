import { RovoDevApiClient } from './rovoDevApiClient';

jest.mock('../rovoDevTelemetryProvider', () => ({
    RovoDevTelemetryProvider: {
        logError: jest.fn(),
    },
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockStandardResponseHeaders = () => {
    const headers: Record<string, string> = {
        'x-session-id': 'sessionId',
    };
    return {
        get: (key: string) => headers[key] || null,
    };
};

describe('RovoDevApiClient', () => {
    let client: RovoDevApiClient;
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        client = new RovoDevApiClient('localhost', 8080, 'sessionToken');
        mockFetch.mockClear();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with correct base URL', () => {
            const testClient = new RovoDevApiClient('example.com', 3000, 'sessionToken');
            expect(testClient.baseApiUrl).toBe('http://example.com:3000');
        });

        it('should handle IP address and port', () => {
            const testClient = new RovoDevApiClient('192.168.1.1', 9000, 'sessionToken');
            expect(testClient.baseApiUrl).toBe('http://192.168.1.1:9000');
        });
    });

    describe('baseApiUrl getter', () => {
        it('should return the correct base API URL', () => {
            expect(client.baseApiUrl).toBe('http://localhost:8080');
        });
    });

    describe('fetchApi method', () => {
        it('should make successful GET request', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ success: true }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const response = await (client as any).fetchApi('/test', 'GET');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/test', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(response).toBe(mockResponse);
        });

        it('should make successful POST request with body', async () => {
            const mockResponse = {
                status: 201,
                json: jest.fn().mockResolvedValue({ created: true }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const body = JSON.stringify({ data: 'test' });
            const response = await (client as any).fetchApi('/test', 'POST', body);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/test', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body,
            });
            expect(response).toBe(mockResponse);
        });

        it('should throw RovoDevApiError for unsuccessful response', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect((client as any).fetchApi('/test', 'GET')).rejects.toThrow(
                "Failed to fetch '/test API: HTTP 404",
            );
        });

        it('should handle server error responses', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect((client as any).fetchApi('/error', 'POST')).rejects.toThrow(
                "Failed to fetch '/error API: HTTP 500",
            );
        });
    });

    describe('cancel method', () => {
        it('should return true when cancellation is successful', async () => {
            const mockResponseObject = { message: 'message', cancelled: true };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockResponseObject),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.cancel();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/cancel', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });

            expect(result).toEqual(mockResponseObject);
        });

        it('should return false when cancellation fails', async () => {
            const mockResponseObject = { message: 'failure message', cancelled: false };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockResponseObject),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.cancel();

            expect(result).toEqual(mockResponseObject);
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.cancel()).rejects.toThrow("Failed to fetch '/v3/cancel API: HTTP 500");
        });
    });

    describe('chat method', () => {
        it('should send chat message successfully', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const message = 'Hello, how can I help?';
            const response = await client.chat(message);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    Authorization: 'Bearer sessionToken',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, context: [] }),
            });
            expect(response).toBe(mockResponse);

            // after the POST /v3/set_chat_message, we expect a GET /v3/stream_chat to be called
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/stream_chat?pause_on_call_tools_start=false',
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                },
            );
        });

        it('should send chat message successfully, pasing on call tools', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const message = 'Hello, how can I help?';
            const response = await client.chat(message, true);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ message, context: [] }),
            });
            expect(response).toBe(mockResponse);

            // after the POST /v3/set_chat_message, we expect a GET /v3/stream_chat to be called
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/stream_chat?pause_on_call_tools_start=true',
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                },
            );
        });

        it('should request a deep plan successfully', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const message = 'Hello, how can I help?';
            const response = await client.chat({
                message,
                enable_deep_plan: true,
                context: [],
            });

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ message, enable_deep_plan: true, context: [] }),
            });
            expect(response).toBe(mockResponse);

            // after the POST /v3/set_chat_message, we expect a GET /v3/stream_chat to be called
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/stream_chat?pause_on_call_tools_start=false',
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                },
            );
        });

        it('should handle empty message', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const response = await client.chat('');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ message: '', context: [] }),
            });
            expect(response).toBe(mockResponse);

            // after the POST /v3/set_chat_message, we expect a GET /v3/stream_chat to be called
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/stream_chat?pause_on_call_tools_start=false',
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                },
            );
        });

        it('should handle special characters in message', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const message = 'Test with "quotes" and \n newlines';
            const response = await client.chat(message);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ message, context: [] }),
            });
            expect(response).toBe(mockResponse);

            // after the POST /v3/set_chat_message, we expect a GET /v3/stream_chat to be called
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/stream_chat?pause_on_call_tools_start=false',
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                },
            );
        });
    });

    describe('replay method', () => {
        it('should make successful replay request', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const response = await client.replay();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/replay', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(response).toBe(mockResponse);
        });

        it('should throw error when replay fails', async () => {
            const mockResponse = {
                status: 503,
                statusText: 'Service Unavailable',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.replay()).rejects.toThrow("Failed to fetch '/v3/replay API: HTTP 503");
        });
    });

    describe('getCacheFilePath method', () => {
        it('should return cached file path', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ cached_file_path: '/tmp/cache/file.txt' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const filePath = '/path/to/file.txt';
            const result = await client.getCacheFilePath(filePath);

            expect(mockFetch).toHaveBeenCalledWith(
                `http://localhost:8080/v3/cache-file-path?file_path=${encodeURIComponent(filePath)}`,
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                    body: undefined,
                },
            );
            expect(result).toBe('/tmp/cache/file.txt');
        });

        it('should handle file paths with special characters', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ cached_file_path: '/tmp/cache/special file.txt' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const filePath = '/path/to/special file with spaces & symbols.txt';
            const result = await client.getCacheFilePath(filePath);

            expect(mockFetch).toHaveBeenCalledWith(
                `http://localhost:8080/v3/cache-file-path?file_path=${encodeURIComponent(filePath)}`,
                {
                    method: 'GET',
                    headers: {
                        accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sessionToken',
                    },
                    body: undefined,
                },
            );
            expect(result).toBe('/tmp/cache/special file.txt');
        });

        it('should throw error when cache file path request fails', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getCacheFilePath('/path/to/file.txt')).rejects.toThrow(
                "Failed to fetch '/v3/cache-file-path?file_path=%2Fpath%2Fto%2Ffile.txt API: HTTP 404",
            );
        });
    });

    describe('createSession method', () => {
        it('should return session id from response headers', async () => {
            const mockResponse = {
                status: 200,
                headers: {
                    get: (key: string) => (key === 'x-session-id' ? 'mock-session-id' : null),
                },
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);
            const sessionId = await client.createSession();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/sessions/create', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(sessionId).toBe('mock-session-id');
        });

        it('should return null if x-session-id header is missing', async () => {
            const mockResponse = {
                status: 200,
                headers: {
                    get: (_: string) => null,
                },
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);
            const sessionId = await client.createSession();
            expect(sessionId).toBeNull();
        });

        it('should throw error if API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: {
                    get: (_: string) => null,
                },
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);
            await expect(client.createSession()).rejects.toThrow("Failed to fetch '/v3/sessions/create API: HTTP 500");
        });
    });

    describe('healtcheckInfo method', () => {
        it('should return healthcheck info when service responds successfully', async () => {
            const mockHealthcheckResponse = {
                status: 'healthy',
                version: '1.0.0',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockHealthcheckResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.healthcheck();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/healthcheck', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockHealthcheckResponse);
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should return unhealthy status info', async () => {
            const mockHealthcheckResponse = {
                status: 'unhealthy',
                version: '1.0.0',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockHealthcheckResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.healthcheck();

            expect(result).toEqual(mockHealthcheckResponse);
            expect(result.status).toBe('unhealthy');
        });

        it('should throw error when healthcheck endpoint fails', async () => {
            const mockResponse = {
                status: 503,
                statusText: 'Service Unavailable',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.healthcheck()).rejects.toThrow("Failed to fetch '/healthcheck API: HTTP 503");
        });

        it('should throw error when healthcheck endpoint returns 404', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.healthcheck()).rejects.toThrow("Failed to fetch '/healthcheck API: HTTP 404");
        });
    });

    describe('RovoDevApiError', () => {
        it('should create error with correct properties', () => {
            const mockResponse = {
                status: 404,
                headers: mockStandardResponseHeaders(),
            } as Response;
            const error = new (class RovoDevApiError extends Error {
                constructor(
                    message: string,
                    public httpStatus: number,
                    public apiResponse: Response,
                ) {
                    super(message);
                }
            })('Test error', 404, mockResponse);

            expect(error.message).toBe('Test error');
            expect(error.httpStatus).toBe(404);
            expect(error.apiResponse).toBe(mockResponse);
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('acceptMcpTerms method', () => {
        it('should send accept all terms request', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Accepted all terms' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.acceptMcpTerms(true)).resolves.toBeUndefined();
            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/accept-mcp-terms', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ servers: [], accept_all: 'true' }),
            });
        });

        it('should send accept decision for a server', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Accepted server terms' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.acceptMcpTerms('server1', 'accept')).resolves.toBeUndefined();
            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/accept-mcp-terms', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    servers: [{ server_name: 'server1', decision: 'accept' }],
                    accept_all: 'false',
                }),
            });
        });

        it('should send deny decision for a server', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Denied server terms' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.acceptMcpTerms('server2', 'deny')).resolves.toBeUndefined();
            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/accept-mcp-terms', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ servers: [{ server_name: 'server2', decision: 'deny' }], accept_all: 'false' }),
            });
        });

        it('should throw error if API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.acceptMcpTerms(true)).rejects.toThrow(
                "Failed to fetch '/accept-mcp-terms API: HTTP 500",
            );
        });
    });

    describe('shutdown method', () => {
        it('should send shutdown request successfully', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.shutdown()).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/shutdown', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
        });

        it('should throw error when shutdown fails', async () => {
            const mockResponse = {
                status: 503,
                statusText: 'Service Unavailable',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.shutdown()).rejects.toThrow("Failed to fetch '/shutdown API: HTTP 503");
        });

        it('should handle network errors during shutdown', async () => {
            const networkError = new Error('Network error');
            mockFetch.mockRejectedValue(networkError);

            await expect(client.shutdown()).rejects.toThrow("Failed to fetch '/shutdown API: Network error");
        });
    });

    describe('status method', () => {
        it('should return status information successfully', async () => {
            const mockStatusResponse = {
                cliVersion: { version: '1.0.0', sessionId: 'session-123' },
                workingDirectory: '/path/to/working/dir',
                account: {
                    email: 'user@example.com',
                    accountId: 'account-123',
                    orgId: 'org-123',
                    isServerAvailable: true,
                },
                memory: { memoryPaths: ['/path/to/memory'], hasMemoryFiles: true, errorMessage: null },
                model: { modelName: 'gpt-4', humanReadableName: 'GPT-4', errorMessage: null },
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockStatusResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.status();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/status', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockStatusResponse);
        });

        it('should handle status with error messages', async () => {
            const mockStatusResponse = {
                cliVersion: { version: '1.0.0', sessionId: 'session-123' },
                workingDirectory: '/path/to/working/dir',
                account: {
                    email: 'user@example.com',
                    accountId: 'account-123',
                    orgId: 'org-123',
                    isServerAvailable: false,
                },
                memory: { memoryPaths: [], hasMemoryFiles: false, errorMessage: 'Memory error' },
                model: { modelName: '', humanReadableName: '', errorMessage: 'Model initialization failed' },
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockStatusResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.status();

            expect(result).toEqual(mockStatusResponse);
            expect(result.memory.errorMessage).toBe('Memory error');
            expect(result.model.errorMessage).toBe('Model initialization failed');
        });

        it('should throw error when status endpoint fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.status()).rejects.toThrow("Failed to fetch '/v3/status API: HTTP 500");
        });
    });

    describe('getCurrentSession method', () => {
        it('should return current session successfully', async () => {
            const mockSession = {
                id: 'session-123',
                title: 'My Session',
                created: '2024-01-01T00:00:00Z',
                last_saved: '2024-01-01T01:00:00Z',
                initial_prompt: 'Initial prompt text',
                prompts: ['prompt1', 'prompt2'],
                latest_result: 'Latest result text',
                workspace_path: '/path/to/workspace',
                parent_session_id: null,
                num_messages: 5,
                log_dir: '/path/to/logs',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSession),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getCurrentSession();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/sessions/current_session', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockSession);
        });

        it('should return session with parent_session_id', async () => {
            const mockSession = {
                id: 'session-456',
                title: 'Child Session',
                created: '2024-01-02T00:00:00Z',
                last_saved: '2024-01-02T01:00:00Z',
                initial_prompt: 'Child prompt',
                prompts: ['prompt1'],
                latest_result: 'Result',
                workspace_path: '/path/to/workspace',
                parent_session_id: 'session-123',
                num_messages: 2,
                log_dir: '/path/to/logs',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSession),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getCurrentSession();

            expect(result.parent_session_id).toBe('session-123');
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getCurrentSession()).rejects.toThrow(
                "Failed to fetch '/v3/sessions/current_session API: HTTP 404",
            );
        });
    });

    describe('listSessions method', () => {
        it('should return list of sessions', async () => {
            const mockSessions = [
                {
                    id: 'session-1',
                    title: 'Session 1',
                    created: '2024-01-01T00:00:00Z',
                    last_saved: '2024-01-01T01:00:00Z',
                    initial_prompt: 'Prompt 1',
                    prompts: ['prompt1'],
                    latest_result: 'Result 1',
                    workspace_path: '/path/to/workspace1',
                    parent_session_id: null,
                    num_messages: 3,
                    log_dir: '/path/to/logs1',
                },
                {
                    id: 'session-2',
                    title: 'Session 2',
                    created: '2024-01-02T00:00:00Z',
                    last_saved: '2024-01-02T01:00:00Z',
                    initial_prompt: 'Prompt 2',
                    prompts: ['prompt2'],
                    latest_result: 'Result 2',
                    workspace_path: '/path/to/workspace2',
                    parent_session_id: null,
                    num_messages: 5,
                    log_dir: '/path/to/logs2',
                },
            ];
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ sessions: mockSessions }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.listSessions();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/sessions/list', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockSessions);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no sessions exist', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ sessions: [] }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.listSessions();

            expect(result).toEqual([]);
        });

        it('should return empty array when sessions property is missing', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({}),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.listSessions();

            expect(result).toEqual([]);
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.listSessions()).rejects.toThrow("Failed to fetch '/v3/sessions/list API: HTTP 500");
        });
    });

    describe('restoreSession method', () => {
        it('should restore session successfully', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Session restored' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.restoreSession('session-123')).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/sessions/session-123/restore', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
        });

        it('should handle session IDs with special characters', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Session restored' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.restoreSession('session-with-special_chars.123')).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/sessions/session-with-special_chars.123/restore',
                expect.any(Object),
            );
        });

        it('should throw error when session does not exist', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.restoreSession('non-existent-session')).rejects.toThrow(
                "Failed to fetch '/v3/sessions/non-existent-session/restore API: HTTP 404",
            );
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.restoreSession('session-123')).rejects.toThrow(
                "Failed to fetch '/v3/sessions/session-123/restore API: HTTP 500",
            );
        });
    });

    describe('forkSession method', () => {
        it('should fork session and return new session id', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ session_id: 'new-session-456' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.forkSession('session-123');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/sessions/session-123/fork', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toBe('new-session-456');
        });

        it('should handle forking session with special characters', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ session_id: 'forked-session-789' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.forkSession('session-with_special.chars');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/sessions/session-with_special.chars/fork',
                expect.any(Object),
            );
            expect(result).toBe('forked-session-789');
        });

        it('should throw error when session does not exist', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.forkSession('non-existent-session')).rejects.toThrow(
                "Failed to fetch '/v3/sessions/non-existent-session/fork API: HTTP 404",
            );
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.forkSession('session-123')).rejects.toThrow(
                "Failed to fetch '/v3/sessions/session-123/fork API: HTTP 500",
            );
        });
    });

    describe('deleteSession method', () => {
        it('should delete session successfully', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Session deleted' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.deleteSession('session-123')).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/sessions/session-123', {
                method: 'DELETE',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
        });

        it('should handle deleting session with special characters', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ message: 'Session deleted' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.deleteSession('session-with_special.chars')).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/v3/sessions/session-with_special.chars',
                expect.any(Object),
            );
        });

        it('should throw error when session does not exist', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.deleteSession('non-existent-session')).rejects.toThrow(
                "Failed to fetch '/v3/sessions/non-existent-session API: HTTP 404",
            );
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.deleteSession('session-123')).rejects.toThrow(
                "Failed to fetch '/v3/sessions/session-123 API: HTTP 500",
            );
        });
    });

    describe('chat method with context', () => {
        it('should send chat message with file context', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const chatRequest = {
                message: 'Explain this file',
                context: [
                    {
                        type: 'file' as const,
                        file_path: '/path/to/file.ts',
                    },
                ],
            };

            const response = await client.chat(chatRequest);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify(chatRequest),
            });
            expect(response).toBe(mockResponse);
        });

        it('should send chat message with file context and selection', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const chatRequest = {
                message: 'Explain this code',
                context: [
                    {
                        type: 'file' as const,
                        file_path: '/path/to/file.ts',
                        selection: {
                            start: 10,
                            end: 20,
                        },
                        note: 'Focus on this function',
                    },
                ],
            };

            const response = await client.chat(chatRequest);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify(chatRequest),
            });
            expect(response).toBe(mockResponse);
        });

        it('should send chat message with multiple context items', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const chatRequest = {
                message: 'Review these changes',
                context: [
                    {
                        type: 'file' as const,
                        file_path: '/path/to/file1.ts',
                    },
                    {
                        type: 'file' as const,
                        file_path: '/path/to/file2.ts',
                        selection: {
                            start: 5,
                            end: 15,
                        },
                    },
                    {
                        type: 'other',
                        content: 'Additional context information',
                    },
                ],
            };

            const response = await client.chat(chatRequest);

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/set_chat_message', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify(chatRequest),
            });
            expect(response).toBe(mockResponse);
        });
    });

    describe('constructor without session token', () => {
        it('should create instance without authentication header when session token is empty', () => {
            const testClient = new RovoDevApiClient('localhost', 8080, '');
            expect(testClient.baseApiUrl).toBe('http://localhost:8080');
            // The auth header should be undefined, but we can't directly test private properties
            // We can verify by making a request and checking the headers
        });

        it('should not include Authorization header when session token is empty', async () => {
            const testClient = new RovoDevApiClient('localhost', 8080, '');
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ status: 'healthy', version: '1.0.0' }),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await testClient.healthcheck();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/healthcheck', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    // No Authorization header
                },
                body: undefined,
            });
        });
    });

    describe('fetchApi network error handling', () => {
        it('should handle network error with error.cause.code', async () => {
            const networkError = {
                message: 'Network request failed',
                cause: { code: 'ECONNREFUSED' },
            };
            mockFetch.mockRejectedValue(networkError);

            await expect(client.healthcheck()).rejects.toThrow("Failed to fetch '/healthcheck API: ECONNREFUSED");
        });

        it('should handle network error with only error.message', async () => {
            const networkError = new Error('Connection timeout');
            mockFetch.mockRejectedValue(networkError);

            await expect(client.healthcheck()).rejects.toThrow("Failed to fetch '/healthcheck API: Connection timeout");
        });

        it('should handle network error with neither cause nor message', async () => {
            const networkError = { toString: () => 'Unknown error' };
            mockFetch.mockRejectedValue(networkError);

            await expect(client.healthcheck()).rejects.toThrow("Failed to fetch '/healthcheck API: Unknown error");
        });
    });

    describe('resumeToolCall method', () => {
        it('should send allow decision for single tool call', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-1': 'allow' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/resume_tool_calls', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    decisions: [
                        {
                            tool_call_id: 'tool-call-1',
                            deny_message: undefined,
                        },
                    ],
                }),
            });
        });

        it('should send deny decision for single tool call', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-2': 'deny' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/resume_tool_calls', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    decisions: [
                        {
                            tool_call_id: 'tool-call-2',
                            deny_message: 'I denied the execution of this tool call',
                        },
                    ],
                }),
            });
        });

        it('should handle undecided choice as deny', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-3': 'undecided' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/resume_tool_calls', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    decisions: [
                        {
                            tool_call_id: 'tool-call-3',
                            deny_message: 'I denied the execution of this tool call',
                        },
                    ],
                }),
            });
        });

        it('should handle multiple tool calls with mixed choices', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-allow': 'allow' as const,
                'tool-call-deny': 'deny' as const,
                'tool-call-undecided': 'undecided' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/resume_tool_calls', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    decisions: [
                        {
                            tool_call_id: 'tool-call-allow',
                            deny_message: undefined,
                        },
                        {
                            tool_call_id: 'tool-call-deny',
                            deny_message: 'I denied the execution of this tool call',
                        },
                        {
                            tool_call_id: 'tool-call-undecided',
                            deny_message: 'I denied the execution of this tool call',
                        },
                    ],
                }),
            });
        });

        it('should handle empty permission choices', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {};

            await expect(client.resumeToolCall(permissionChoices)).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/resume_tool_calls', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    decisions: [],
                }),
            });
        });

        it('should handle tool call IDs with special characters', async () => {
            const mockResponse = {
                status: 200,
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-with-special-chars_123@test.com': 'allow' as const,
                'tool/call\\with:slashes': 'deny' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/resume_tool_calls', {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({
                    decisions: [
                        {
                            tool_call_id: 'tool-call-with-special-chars_123@test.com',
                            deny_message: undefined,
                        },
                        {
                            tool_call_id: 'tool/call\\with:slashes',
                            deny_message: 'I denied the execution of this tool call',
                        },
                    ],
                }),
            });
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-1': 'allow' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).rejects.toThrow(
                "Failed to fetch '/v3/resume_tool_calls API: HTTP 500",
            );
        });

        it('should throw error when API call fails with 404', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const permissionChoices = {
                'tool-call-1': 'deny' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).rejects.toThrow(
                "Failed to fetch '/v3/resume_tool_calls API: HTTP 404",
            );
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network connection failed');
            mockFetch.mockRejectedValue(networkError);

            const permissionChoices = {
                'tool-call-1': 'allow' as const,
            };

            await expect(client.resumeToolCall(permissionChoices)).rejects.toThrow(
                "Failed to fetch '/v3/resume_tool_calls API: Network connection failed",
            );
        });
    });

    describe('getAgentMode method', () => {
        it('should return current agent mode successfully', async () => {
            const mockAgentModeResponse = {
                mode: 'ask' as const,
                message: 'Agent mode is set to ask',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockAgentModeResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAgentMode();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-mode', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockAgentModeResponse);
            expect(result.mode).toBe('ask');
        });

        it('should return default mode', async () => {
            const mockAgentModeResponse = {
                mode: 'default' as const,
                message: 'Agent mode is set to default',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockAgentModeResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAgentMode();

            expect(result.mode).toBe('default');
            expect(result.message).toBe('Agent mode is set to default');
        });

        it('should return plan mode', async () => {
            const mockAgentModeResponse = {
                mode: 'plan' as const,
                message: 'Agent mode is set to plan',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockAgentModeResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAgentMode();

            expect(result.mode).toBe('plan');
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getAgentMode()).rejects.toThrow("Failed to fetch '/v3/agent-mode API: HTTP 500");
        });

        it('should throw error when API returns 404', async () => {
            const mockResponse = {
                status: 404,
                statusText: 'Not Found',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getAgentMode()).rejects.toThrow("Failed to fetch '/v3/agent-mode API: HTTP 404");
        });
    });

    describe('setAgentMode method', () => {
        it('should set agent mode to ask successfully', async () => {
            const mockSetAgentModeResponse = {
                mode: 'ask' as const,
                message: 'Agent mode set to ask',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSetAgentModeResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.setAgentMode('ask');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-mode', {
                method: 'PUT',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ mode: 'ask' }),
            });
            expect(result).toEqual(mockSetAgentModeResponse);
            expect(result.mode).toBe('ask');
        });

        it('should set agent mode to default successfully', async () => {
            const mockSetAgentModeResponse = {
                mode: 'default' as const,
                message: 'Agent mode set to default',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSetAgentModeResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.setAgentMode('default');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-mode', {
                method: 'PUT',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ mode: 'default' }),
            });
            expect(result.mode).toBe('default');
        });

        it('should set agent mode to plan successfully', async () => {
            const mockSetAgentModeResponse = {
                mode: 'plan' as const,
                message: 'Agent mode set to plan',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSetAgentModeResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.setAgentMode('plan');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-mode', {
                method: 'PUT',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ mode: 'plan' }),
            });
            expect(result.mode).toBe('plan');
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.setAgentMode('ask')).rejects.toThrow("Failed to fetch '/v3/agent-mode API: HTTP 500");
        });

        it('should throw error when API returns 400 (invalid mode)', async () => {
            const mockResponse = {
                status: 400,
                statusText: 'Bad Request',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.setAgentMode('invalid' as any)).rejects.toThrow(
                "Failed to fetch '/v3/agent-mode API: HTTP 400",
            );
        });
    });

    describe('getAvailableModes method', () => {
        it('should return list of available modes successfully', async () => {
            const mockAvailableModesResponse = {
                modes: [
                    { mode: 'ask', description: 'Ask questions without editing code' },
                    { mode: 'default', description: 'Default agent mode' },
                    { mode: 'plan', description: 'Generate plans before executing' },
                ],
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockAvailableModesResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAvailableModes();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/available-modes', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockAvailableModesResponse);
            expect(result.modes).toHaveLength(3);
            expect(result.modes[0].mode).toBe('ask');
            expect(result.modes[0].description).toBe('Ask questions without editing code');
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getAvailableModes()).rejects.toThrow(
                "Failed to fetch '/v3/available-modes API: HTTP 500",
            );
        });
    });

    describe('getAgentModel method', () => {
        it('should return current agent model successfully', async () => {
            const mockGetAgentModelResponse = {
                model_name: 'GPT-4',
                model_id: 'gpt-4',
                credit_multiplier: '1.5',
                message: 'Current model is GPT-4',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockGetAgentModelResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAgentModel();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-model', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockGetAgentModelResponse);
            expect(result.model_id).toBe('gpt-4');
            expect(result.model_name).toBe('GPT-4');
            expect(result.credit_multiplier).toBe('1.5');
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getAgentModel()).rejects.toThrow("Failed to fetch '/v3/agent-model API: HTTP 500");
        });
    });

    describe('setAgentModel method', () => {
        it('should set agent model successfully', async () => {
            const mockSetAgentModelResponse = {
                model_name: 'GPT-4',
                model_id: 'gpt-4',
                message: 'Agent model set to GPT-4',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSetAgentModelResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.setAgentModel('gpt-4');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-model', {
                method: 'PUT',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ model_id: 'gpt-4' }),
            });
            expect(result.model_id).toBe('gpt-4');
            expect(result.message).toBe('Agent model set to GPT-4');
        });

        it('should handle different model IDs', async () => {
            const mockSetAgentModelResponse = {
                model_name: 'Claude 3',
                model_id: 'claude-3',
                message: 'Agent model set to Claude 3',
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockSetAgentModelResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.setAgentModel('claude-3');

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-model', {
                method: 'PUT',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: JSON.stringify({ model_id: 'claude-3' }),
            });
            expect(result.model_id).toBe('claude-3');
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.setAgentModel('gpt-4')).rejects.toThrow(
                "Failed to fetch '/v3/agent-model API: HTTP 500",
            );
        });

        it('should throw error when API returns 400 (invalid model)', async () => {
            const mockResponse = {
                status: 400,
                statusText: 'Bad Request',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.setAgentModel('invalid-model')).rejects.toThrow(
                "Failed to fetch '/v3/agent-model API: HTTP 400",
            );
        });
    });

    describe('getAvailableAgentModels method', () => {
        it('should return list of available agent models successfully', async () => {
            const mockAvailableModelsResponse = {
                models: [
                    {
                        name: 'GPT-4',
                        model_id: 'gpt-4',
                        description: 'Most capable model',
                        credit_multiplier: '1.5',
                    },
                    {
                        name: 'GPT-3.5 Turbo',
                        model_id: 'gpt-3.5-turbo',
                        description: 'Fast and efficient',
                        credit_multiplier: '1.0',
                    },
                    {
                        name: 'Claude 3',
                        model_id: 'claude-3',
                        description: 'Anthropic model',
                        credit_multiplier: '2.0',
                    },
                ],
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockAvailableModelsResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAvailableAgentModels();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v3/agent-models', {
                method: 'GET',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sessionToken',
                },
                body: undefined,
            });
            expect(result).toEqual(mockAvailableModelsResponse);
            expect(result.models).toHaveLength(3);
            expect(result.models[0].model_id).toBe('gpt-4');
            expect(result.models[0].name).toBe('GPT-4');
            expect(result.models[0].credit_multiplier).toBe('1.5');
        });

        it('should handle empty models list', async () => {
            const mockAvailableModelsResponse = {
                models: [],
            };
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockAvailableModelsResponse),
                headers: mockStandardResponseHeaders(),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await client.getAvailableAgentModels();

            expect(result.models).toHaveLength(0);
        });

        it('should throw error when API call fails', async () => {
            const mockResponse = {
                status: 500,
                statusText: 'Internal Server Error',
                headers: mockStandardResponseHeaders(),
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(client.getAvailableAgentModels()).rejects.toThrow(
                "Failed to fetch '/v3/agent-models API: HTTP 500",
            );
        });
    });
});
