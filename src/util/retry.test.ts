import { Logger } from '../logger';
import { categorizeNetworkError, retryWithBackoff } from './retry';

jest.mock('../logger');

describe('retryWithBackoff', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should succeed on first attempt if no error', async () => {
        const mockOperation = jest.fn().mockResolvedValue('success');

        const result = await retryWithBackoff(mockOperation, { maxAttempts: 3 });

        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors and eventually succeed', async () => {
        const mockOperation = jest
            .fn()
            .mockRejectedValueOnce(new Error('ETIMEDOUT'))
            .mockRejectedValueOnce(new Error('ENOTFOUND'))
            .mockResolvedValue('success');

        const result = await retryWithBackoff(mockOperation, {
            maxAttempts: 3,
            initialDelayMs: 10,
        });

        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts if all fail', async () => {
        const mockError = new Error('ENOTFOUND api.bitbucket.org');
        const mockOperation = jest.fn().mockRejectedValue(mockError);

        await expect(
            retryWithBackoff(mockOperation, {
                maxAttempts: 3,
                initialDelayMs: 10,
            }),
        ).rejects.toThrow();

        expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors (e.g. 401 auth)', async () => {
        const authError = { response: { status: 401 }, message: 'Unauthorized' };
        const mockOperation = jest.fn().mockRejectedValue(authError);

        await expect(
            retryWithBackoff(mockOperation, {
                maxAttempts: 3,
                initialDelayMs: 10,
            }),
        ).rejects.toEqual(authError);

        expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should not log errors when retries are exhausted (caller responsible)', async () => {
        const mockError = new Error('ENOTFOUND api.bitbucket.org');
        const mockOperation = jest.fn().mockRejectedValue(mockError);

        await expect(
            retryWithBackoff(mockOperation, {
                maxAttempts: 3,
                initialDelayMs: 10,
            }),
        ).rejects.toThrow();

        // Verify Logger.error was NOT called - caller is responsible for logging
        expect(Logger.error).not.toHaveBeenCalled();
        expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not log errors for non-retryable errors (caller responsible)', async () => {
        const authError = { response: { status: 401 }, message: 'Unauthorized' };
        const mockOperation = jest.fn().mockRejectedValue(authError);

        await expect(
            retryWithBackoff(mockOperation, {
                maxAttempts: 3,
                initialDelayMs: 10,
            }),
        ).rejects.toEqual(authError);

        // Verify Logger.error was NOT called - caller is responsible for logging
        expect(Logger.error).not.toHaveBeenCalled();
        expect(mockOperation).toHaveBeenCalledTimes(1);
    });
});

describe('categorizeNetworkError', () => {
    it('should categorize DNS errors', () => {
        const error = { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND api.bitbucket.org' };
        const result = categorizeNetworkError(error);

        expect(result.category).toBe('dns');
        expect(result.message).toContain('DNS resolution failed');
    });

    it('should categorize timeout errors', () => {
        const error = { code: 'ETIMEDOUT', message: 'timeout of 30000ms exceeded' };
        const result = categorizeNetworkError(error);

        expect(result.category).toBe('timeout');
        expect(result.message).toContain('Request timeout');
    });

    it('should categorize auth errors', () => {
        const error = { response: { status: 401 }, message: 'Unauthorized' };
        const result = categorizeNetworkError(error);

        expect(result.category).toBe('auth');
        expect(result.message).toContain('Authentication error');
    });

    it('should categorize network errors', () => {
        const error = { code: 'ECONNRESET', message: 'Connection reset by peer' };
        const result = categorizeNetworkError(error);

        expect(result.category).toBe('network');
        expect(result.message).toContain('Network error');
    });
});
