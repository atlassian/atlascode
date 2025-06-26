import { AxiosInstance, AxiosRequestConfig } from 'axios';
import curlirize from 'axios-curlirize';

import { Logger } from '../logger';
import { addCurlLogging, rewriteSecureImageRequests } from './interceptors';

// Mock dependencies
jest.mock('axios-curlirize');
jest.mock('../logger');

const mockedCurlirize = jest.mocked(curlirize);
const mockedLogger = jest.mocked(Logger);

describe('interceptors', () => {
    let mockAxiosInstance: jest.Mocked<AxiosInstance>;
    let mockRequestUse: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a mock AxiosInstance
        mockRequestUse = jest.fn();
        mockAxiosInstance = {
            interceptors: {
                request: {
                    use: mockRequestUse,
                },
                response: {
                    use: jest.fn(),
                },
            },
        } as any;
    });

    describe('addCurlLogging', () => {
        it('should call curlirize with transport and callback', () => {
            addCurlLogging(mockAxiosInstance);

            expect(mockedCurlirize).toHaveBeenCalledWith(mockAxiosInstance, expect.any(Function));
        });

        it('should log curl command when no error occurs', () => {
            addCurlLogging(mockAxiosInstance);

            // Get the callback that was passed to curlirize
            const callback = mockedCurlirize.mock.calls[0][1];
            const result = {
                command:
                    'curl -X GET -H "Accept-Encoding:gzip, deflate" -H "Content-Type: application/json" "https://example.com"',
                object: {},
            };

            callback(result, null);

            expect(mockedLogger.debug).toHaveBeenCalledWith('-'.repeat(70));
            expect(mockedLogger.debug).toHaveBeenCalledWith(
                'curl -X GET -H "Content-Type: application/json" "https://example.com"',
            );
            expect(mockedLogger.debug).toHaveBeenCalledTimes(3); // Two separator lines + command
        });

        it('should not log when error occurs', () => {
            addCurlLogging(mockAxiosInstance);

            const callback = mockedCurlirize.mock.calls[0][1];
            const result = {
                command: 'curl -X GET "https://example.com"',
                object: {},
            };
            const error = new Error('Test error');

            callback(result, error);

            expect(mockedLogger.debug).not.toHaveBeenCalled();
        });

        it('should remove Accept-Encoding header from curl command', () => {
            addCurlLogging(mockAxiosInstance);

            const callback = mockedCurlirize.mock.calls[0][1];
            const result = {
                command:
                    'curl -X GET -H "Accept-Encoding:gzip, deflate" -H "Authorization: Bearer token" "https://example.com"',
                object: {},
            };

            callback(result, null);

            expect(mockedLogger.debug).toHaveBeenCalledWith(
                'curl -X GET -H "Authorization: Bearer token" "https://example.com"',
            );
        });
    });

    describe('rewriteSecureImageRequests', () => {
        beforeEach(() => {
            rewriteSecureImageRequests(mockAxiosInstance);
        });

        it('should register request interceptor', () => {
            expect(mockRequestUse).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
        });

        describe('request interceptor behavior', () => {
            it('should rewrite secure/attachment URLs', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/wiki/secure/attachment/type/attachment/12345',
                };

                // Get the actual interceptor function and call it directly
                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(mockedLogger.debug).toHaveBeenCalledWith(
                    're-writing url: https://example.atlassian.net/wiki/secure/attachment/type/attachment/12345',
                );
                expect(result.url).toBe(
                    'https://example.atlassian.net/wiki/secure/attachment/rest/api/2/attachment/content/12345',
                );
            });

            it('should rewrite secure/thumbnail URLs', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/wiki/secure/thumbnail/type/thumbnail/12345',
                };

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(result.url).toBe(
                    'https://example.atlassian.net/wiki/secure/thumbnail/rest/api/2/attachment/thumbnail/12345',
                );
            });

            it('should rewrite secure/viewavatar URLs', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/secure/viewavatar?avatarId=10000',
                };

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(result.url).toBe(
                    'https://example.atlassian.net/rest/api/3/universal_avatar/view/type/issuetype/avatar/10000',
                );
            });

            it('should rewrite secure/projectavatar URLs', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/secure/projectavatar?avatarId=10000',
                };

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(result.url).toBe(
                    'https://example.atlassian.net/rest/api/3/universal_avatar/view/type/project/avatar/10000',
                );
            });

            it('should not modify URLs that do not match patterns', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/rest/api/2/issue/TEST-123',
                };

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(result.url).toBe('https://example.atlassian.net/rest/api/2/issue/TEST-123');
                expect(mockedLogger.debug).not.toHaveBeenCalled();
            });

            it('should handle undefined URL', () => {
                const config: AxiosRequestConfig = {};

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(result).toBe(config);
                expect(mockedLogger.debug).not.toHaveBeenCalled();
            });

            it('should warn and return original URL when attachment fileId is missing', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/wiki/secure/attachment/type/attachment/',
                };

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                expect(mockedLogger.warn).toHaveBeenCalledWith(
                    "Can't re-write image URL: https://example.atlassian.net/wiki/secure/attachment/type/attachment/",
                );
                expect(result.url).toBe('https://example.atlassian.net/wiki/secure/attachment/type/attachment/');
            });

            it('should not process URLs that do not contain secure avatar patterns', () => {
                const config: AxiosRequestConfig = {
                    url: 'https://example.atlassian.net/secure/badavatar?avatarId=10000',
                };

                const interceptorFunction = mockRequestUse.mock.calls[0][0];
                const result = interceptorFunction(config);

                // This URL doesn't contain 'secure/viewavatar' or 'secure/projectavatar'
                // so it should not be processed and no warning should be logged
                expect(mockedLogger.warn).not.toHaveBeenCalled();
                expect(result.url).toBe('https://example.atlassian.net/secure/badavatar?avatarId=10000');
            });
        });

        describe('error interceptor', () => {
            it('should reject with the same error', async () => {
                const error = new Error('Test error');
                const errorInterceptor = mockRequestUse.mock.calls[0][1];

                await expect(errorInterceptor(error)).rejects.toBe(error);
            });
        });
    });

    describe('urlForAttachmentAndThumbnail (via request interceptor)', () => {
        beforeEach(() => {
            rewriteSecureImageRequests(mockAxiosInstance);
        });

        it('should handle attachment type correctly', () => {
            const config: AxiosRequestConfig = {
                url: 'https://example.atlassian.net/wiki/secure/attachment/type/attachment/file123',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://example.atlassian.net/wiki/secure/attachment/rest/api/2/attachment/content/file123',
            );
        });

        it('should handle thumbnail type correctly', () => {
            const config: AxiosRequestConfig = {
                url: 'https://example.atlassian.net/wiki/secure/thumbnail/type/thumbnail/file456',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://example.atlassian.net/wiki/secure/thumbnail/rest/api/2/attachment/thumbnail/file456',
            );
        });

        it('should handle complex URLs with additional path segments', () => {
            const config: AxiosRequestConfig = {
                url: 'https://subdomain.atlassian.net/context/secure/attachment/type/attachment/abc123',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://subdomain.atlassian.net/context/secure/attachment/rest/api/2/attachment/content/abc123',
            );
        });
    });

    describe('urlForAvatar (via request interceptor)', () => {
        beforeEach(() => {
            rewriteSecureImageRequests(mockAxiosInstance);
        });

        it('should handle viewavatar with avatarId query param', () => {
            const config: AxiosRequestConfig = {
                url: 'https://example.atlassian.net/secure/viewavatar?avatarId=12345&size=medium',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://example.atlassian.net/rest/api/3/universal_avatar/view/type/issuetype/avatar/12345',
            );
        });

        it('should handle projectavatar with avatarId query param', () => {
            const config: AxiosRequestConfig = {
                url: 'https://example.atlassian.net/secure/projectavatar?avatarId=67890&pid=10001',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://example.atlassian.net/rest/api/3/universal_avatar/view/type/project/avatar/67890',
            );
        });

        it('should handle HTTPS URLs correctly', () => {
            const config: AxiosRequestConfig = {
                url: 'https://secure.atlassian.net/secure/viewavatar?avatarId=999',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://secure.atlassian.net/rest/api/3/universal_avatar/view/type/issuetype/avatar/999',
            );
        });

        it('should handle URLs with ports', () => {
            const config: AxiosRequestConfig = {
                url: 'http://localhost:8080/secure/projectavatar?avatarId=123',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe('http://localhost:8080/rest/api/3/universal_avatar/view/type/project/avatar/123');
        });

        it('should handle URLs with multiple query parameters', () => {
            const config: AxiosRequestConfig = {
                url: 'https://example.atlassian.net/secure/viewavatar?size=large&avatarId=555&format=png',
            };

            const interceptorFunction = mockRequestUse.mock.calls[0][0];
            const result = interceptorFunction(config);

            expect(result.url).toBe(
                'https://example.atlassian.net/rest/api/3/universal_avatar/view/type/issuetype/avatar/555',
            );
        });
    });
});
