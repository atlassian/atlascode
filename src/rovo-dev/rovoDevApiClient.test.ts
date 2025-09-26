import { RovoDevApiClient } from './rovoDevApiClient';

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
        client = new RovoDevApiClient('localhost', 8080);
        mockFetch.mockClear();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with correct base URL', () => {
            const testClient = new RovoDevApiClient('example.com', 3000);
            expect(testClient.baseApiUrl).toBe('http://example.com:3000');
        });

        it('should handle IP address and port', () => {
            const testClient = new RovoDevApiClient('192.168.1.1', 9000);
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
});
