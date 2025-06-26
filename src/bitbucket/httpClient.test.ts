import axios, { CancelToken } from 'axios';

import { AuthInterceptor } from '../atlclients/authInterceptor';
import { addCurlLogging } from '../atlclients/interceptors';
import { AxiosUserAgent } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { ConnectionTimeout } from '../util/time';
import { ClientError, HTTPClient, RequestRange } from './httpClient';

// Mock all external dependencies
jest.mock('axios');
jest.mock('../atlclients/authInterceptor');
jest.mock('../atlclients/interceptors');
jest.mock('../container');
jest.mock('../logger');
jest.mock('../constants', () => ({
    AxiosUserAgent: 'test-user-agent',
}));
jest.mock('../util/time', () => ({
    ConnectionTimeout: 30000,
    Time: {
        SECONDS: 1000,
        MINUTES: 60000,
        HOURS: 3600000,
        DAYS: 86400000,
        WEEKS: 604800000,
        MONTHS: 2592000000,
        FOREVER: Infinity,
    },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HTTPClient', () => {
    let httpClient: HTTPClient;
    let mockAuthInterceptor: jest.Mocked<AuthInterceptor>;
    let mockErrorHandler: jest.Mock;
    let mockTransport: jest.Mock;

    const baseUrl = 'https://api.bitbucket.org/2.0';
    const authHeader = 'Bearer test-token';
    const agent = { httpsAgent: {} };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup transport mock as both a function and an object with interceptors
        mockTransport = jest.fn();
        (mockTransport as any).interceptors = {
            response: {
                use: jest.fn(),
            },
        };

        // Setup axios mock to return our mocked transport
        mockedAxios.create.mockReturnValue(mockTransport as any);

        // Setup error handler mock
        mockErrorHandler = jest.fn().mockResolvedValue(new Error('Test error'));

        // Setup auth interceptor mock
        mockAuthInterceptor = {
            attachToAxios: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<AuthInterceptor>;

        // Setup container config mock
        (Container as any).config = {
            enableCurlLogging: false,
        };

        // Default transport response
        mockTransport.mockImplementation((config: any) => {
            if (typeof config === 'string') {
                return Promise.resolve({
                    data: { test: 'data' },
                    headers: { 'content-type': 'application/json' },
                });
            }
            return Promise.resolve({
                data: { test: 'data' },
                headers: { 'content-type': 'application/json' },
            });
        });

        httpClient = new HTTPClient(baseUrl, authHeader, agent, mockErrorHandler);
    });

    describe('constructor', () => {
        it('should create axios instance with correct configuration', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                timeout: ConnectionTimeout,
                headers: {
                    'User-Agent': AxiosUserAgent,
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                    Authorization: authHeader,
                },
                ...agent,
            });
        });

        it('should add curl logging when enabled', () => {
            (Container as any).config.enableCurlLogging = true;
            new HTTPClient(baseUrl, authHeader, agent, mockErrorHandler);
            expect(addCurlLogging).toHaveBeenCalled();
        });

        it('should setup auth interceptor when provided', async () => {
            new HTTPClient(baseUrl, authHeader, agent, mockErrorHandler, mockAuthInterceptor);
            expect(mockAuthInterceptor.attachToAxios).toHaveBeenCalled();
        });
    });

    describe('getUrl', () => {
        it('should perform GET request to full URL', async () => {
            const url = 'https://api.example.com/test';
            const expectedResponse = {
                data: { test: 'data' },
                headers: { 'content-type': 'application/json' },
            };

            mockTransport.mockResolvedValue(expectedResponse);

            const result = await httpClient.getUrl(url);

            expect(mockTransport).toHaveBeenCalledWith(url, {
                method: 'GET',
                cancelToken: undefined,
            });
            expect(result).toEqual({
                data: expectedResponse.data,
                headers: expectedResponse.headers,
            });
        });

        it('should handle cancel token', async () => {
            const url = 'https://api.example.com/test';
            const cancelToken = {} as CancelToken;

            await httpClient.getUrl(url, cancelToken);

            expect(mockTransport).toHaveBeenCalledWith(url, {
                method: 'GET',
                cancelToken,
            });
        });

        it('should handle errors with response', async () => {
            const url = 'https://api.example.com/test';
            const errorResponse = { status: 404, data: { error: 'Not found' } };
            const error = { response: errorResponse };

            mockTransport.mockRejectedValue(error);
            mockErrorHandler.mockResolvedValue(new Error('Handled error'));

            await expect(httpClient.getUrl(url)).rejects.toThrow('Handled error');
            expect(mockErrorHandler).toHaveBeenCalledWith(errorResponse);
        });

        it('should handle errors without response', async () => {
            const url = 'https://api.example.com/test';
            const error = new Error('Network error');

            mockTransport.mockRejectedValue(error);

            await expect(httpClient.getUrl(url)).rejects.toThrow('Network error');
            expect(Logger.error).toHaveBeenCalledWith(error, 'Error getting URL', url);
        });
    });

    describe('get', () => {
        it('should construct URL with baseUrl for relative paths', async () => {
            const urlSlug = '/repositories';
            const expectedUrl = `${baseUrl}${urlSlug}`;

            await httpClient.get(urlSlug);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'GET',
                cancelToken: undefined,
            });
        });

        it('should use full URL when urlSlug starts with http', async () => {
            const urlSlug = 'https://api.example.com/test';

            await httpClient.get(urlSlug);

            expect(mockTransport).toHaveBeenCalledWith(urlSlug, {
                method: 'GET',
                cancelToken: undefined,
            });
        });

        it('should add query parameters', async () => {
            const urlSlug = '/repositories';
            const queryParams = { page: 1, limit: 50 };
            const expectedUrl = `${baseUrl}${urlSlug}?page=1&limit=50`;

            await httpClient.get(urlSlug, queryParams);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'GET',
                cancelToken: undefined,
            });
        });
    });

    describe('getRaw', () => {
        it('should perform GET request with raw response transform', async () => {
            const urlSlug = '/raw-data';
            const expectedUrl = `${baseUrl}${urlSlug}`;

            await httpClient.getRaw(urlSlug);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'GET',
                transformResponse: expect.any(Function),
            });
        });

        it('should preserve raw data with transform function', async () => {
            const urlSlug = '/raw-data';
            const rawData = 'raw string data';

            mockTransport.mockResolvedValue({
                data: rawData,
                headers: { 'content-type': 'text/plain' },
            });

            const result = await httpClient.getRaw(urlSlug);

            expect(result.data).toBe(rawData);
        });
    });

    describe('getArrayBuffer', () => {
        it('should perform GET request with arraybuffer response type', async () => {
            const urlSlug = '/binary-data';
            const expectedUrl = `${baseUrl}${urlSlug}`;
            const binaryData = new ArrayBuffer(8);

            mockTransport.mockResolvedValue({
                data: binaryData,
                headers: { 'content-type': 'application/octet-stream' },
            });

            const result = await httpClient.getArrayBuffer(urlSlug);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'GET',
                responseType: 'arraybuffer',
            });
            expect(result.data).toBe(Buffer.from(binaryData).toString('base64'));
        });

        it('should handle full URLs', async () => {
            const urlSlug = 'https://api.example.com/binary-data';
            const binaryData = new ArrayBuffer(8);

            mockTransport.mockResolvedValue({
                data: binaryData,
                headers: { 'content-type': 'application/octet-stream' },
            });

            await httpClient.getArrayBuffer(urlSlug);

            expect(mockTransport).toHaveBeenCalledWith(urlSlug, {
                method: 'GET',
                responseType: 'arraybuffer',
            });
        });
    });

    describe('getOctetStream', () => {
        it('should perform GET request with octet-stream headers', async () => {
            const urlSlug = '/stream-data';
            const expectedUrl = `${baseUrl}${urlSlug}`;

            await httpClient.getOctetStream(urlSlug);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'GET',
                headers: {
                    accept: 'application/octet-stream',
                },
            });
        });

        it('should add Range header when range is provided', async () => {
            const urlSlug = '/stream-data';
            const range: RequestRange = { start: 0, end: 1023 };

            await httpClient.getOctetStream(urlSlug, range);

            expect(mockTransport).toHaveBeenCalledWith(`${baseUrl}${urlSlug}`, {
                method: 'GET',
                headers: {
                    accept: 'application/octet-stream',
                    Range: 'bytes=0-1023',
                },
            });
        });

        it('should add query parameters', async () => {
            const urlSlug = '/stream-data';
            const queryParams = { format: 'raw' };
            const expectedUrl = `${baseUrl}${urlSlug}?format=raw`;

            await httpClient.getOctetStream(urlSlug, undefined, queryParams);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'GET',
                headers: {
                    accept: 'application/octet-stream',
                },
            });
        });
    });

    describe('post', () => {
        it('should perform POST request with JSON body', async () => {
            const urlSlug = '/create';
            const body = { name: 'test', value: 123 };
            const expectedUrl = `${baseUrl}${urlSlug}`;

            await httpClient.post(urlSlug, body);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: authHeader,
                },
                data: JSON.stringify(body),
                ...agent,
            });
        });

        it('should handle full URLs', async () => {
            const urlSlug = 'https://api.example.com/create';
            const body = { test: 'data' };

            await httpClient.post(urlSlug, body);

            expect(mockTransport).toHaveBeenCalledWith(urlSlug, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: authHeader,
                },
                data: JSON.stringify(body),
                ...agent,
            });
        });

        it('should handle errors with response', async () => {
            const urlSlug = '/create';
            const body = { test: 'data' };
            const errorResponse = { status: 400, data: { error: 'Bad request' } };
            const error = { response: errorResponse };

            mockTransport.mockRejectedValue(error);
            mockErrorHandler.mockResolvedValue(new Error('Handled error'));

            await expect(httpClient.post(urlSlug, body)).rejects.toThrow('Handled error');
            expect(mockErrorHandler).toHaveBeenCalledWith(errorResponse);
        });

        it('should handle errors without response', async () => {
            const urlSlug = '/create';
            const body = { test: 'data' };
            const error = new Error('Network error');

            mockTransport.mockRejectedValue(error);

            await expect(httpClient.post(urlSlug, body)).rejects.toThrow('Network error');
        });
    });

    describe('put', () => {
        it('should perform PUT request with JSON body', async () => {
            const urlSlug = '/update';
            const body = { id: 1, name: 'updated' };
            const expectedUrl = `${baseUrl}${urlSlug}`;

            await httpClient.put(urlSlug, body);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'PUT',
                data: JSON.stringify(body),
            });
        });

        it('should handle full URLs', async () => {
            const urlSlug = 'https://api.example.com/update';
            const body = { test: 'data' };

            await httpClient.put(urlSlug, body);

            expect(mockTransport).toHaveBeenCalledWith(urlSlug, {
                method: 'PUT',
                data: JSON.stringify(body),
            });
        });
    });

    describe('delete', () => {
        it('should perform DELETE request with JSON body', async () => {
            const urlSlug = '/delete';
            const body = { id: 1 };
            const expectedUrl = `${baseUrl}${urlSlug}`;

            await httpClient.delete(urlSlug, body);

            expect(mockTransport).toHaveBeenCalledWith(expectedUrl, {
                method: 'DELETE',
                data: JSON.stringify(body),
            });
        });

        it('should handle full URLs', async () => {
            const urlSlug = 'https://api.example.com/delete';
            const body = { test: 'data' };

            await httpClient.delete(urlSlug, body);

            expect(mockTransport).toHaveBeenCalledWith(urlSlug, {
                method: 'DELETE',
                data: JSON.stringify(body),
            });
        });
    });

    describe('generateUrl', () => {
        it('should generate URL with baseUrl', () => {
            const urlSlug = '/test';
            const result = httpClient.generateUrl(urlSlug);
            expect(result).toBe(`${baseUrl}${urlSlug}`);
        });

        it('should generate URL with query parameters', () => {
            const urlSlug = '/test';
            const queryParams = { param1: 'value1', param2: 'value2' };
            const result = httpClient.generateUrl(urlSlug, queryParams);
            expect(result).toBe(`${baseUrl}${urlSlug}?param1=value1&param2=value2`);
        });
    });

    describe('queryObjectToString', () => {
        it('should return empty string for undefined params', () => {
            const result = HTTPClient.queryObjectToString();
            expect(result).toBe('');
        });

        it('should return empty string for null params', () => {
            const result = HTTPClient.queryObjectToString(null);
            expect(result).toBe('');
        });

        it('should convert object to query string', () => {
            const queryParams = { page: 1, limit: 50, sort: 'name' };
            const result = HTTPClient.queryObjectToString(queryParams);
            expect(result).toBe('?page=1&limit=50&sort=name');
        });

        it('should handle special characters', () => {
            const queryParams = { search: 'test & query', filter: 'a=b' };
            const result = HTTPClient.queryObjectToString(queryParams);
            expect(result).toContain('search=test+%26+query');
            expect(result).toContain('filter=a%3Db');
        });

        it('should handle boolean and number values', () => {
            const queryParams = { active: true, count: 42, ratio: 3.14 };
            const result = HTTPClient.queryObjectToString(queryParams);
            expect(result).toBe('?active=true&count=42&ratio=3.14');
        });
    });

    describe('addQueryParams', () => {
        it('should add query params to URL', () => {
            const url = 'https://api.example.com/test';
            const queryParams = { page: 1, limit: 50 };
            const result = HTTPClient.addQueryParams(url, queryParams);
            expect(result).toBe('https://api.example.com/test?page=1&limit=50');
        });

        it('should return original URL when no params', () => {
            const url = 'https://api.example.com/test';
            const result = HTTPClient.addQueryParams(url);
            expect(result).toBe(url);
        });

        it('should handle URL that already has query params', () => {
            const url = 'https://api.example.com/test?existing=param';
            const queryParams = { page: 1 };
            const result = HTTPClient.addQueryParams(url, queryParams);
            expect(result).toBe('https://api.example.com/test?existing=param?page=1');
        });
    });
});

describe('ClientError', () => {
    it('should create error with name and message', () => {
        const error = new ClientError('TestError', 'Test message');
        expect(error.name).toBe('TestError');
        expect(error.message).toBe('Test message');
    });

    it('should implement toJSON method', () => {
        const error = new ClientError('TestError', 'Test message');
        const json = error.toJSON();
        expect(json).toEqual({
            name: 'TestError',
            message: 'Test message',
        });
    });

    it('should be serializable', () => {
        const error = new ClientError('TestError', 'Test message');
        const serialized = JSON.stringify(error);
        const parsed = JSON.parse(serialized);
        expect(parsed).toEqual({
            name: 'TestError',
            message: 'Test message',
        });
    });
});
