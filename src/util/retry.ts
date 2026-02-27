import { Logger } from '../logger';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    retryableErrors?: string[];
    onRetry?: (error: Error, attempt: number) => void;
}

export type NetworkErrorCategory = 'timeout' | 'dns' | 'network' | 'auth' | 'unknown';

export interface CategorizedError {
    category: NetworkErrorCategory;
    message: string;
}

const JITTER_FACTOR = 0.3;

const TIMEOUT_ERROR_CODES = ['ETIMEDOUT', 'ECONNABORTED'] as const;
const DNS_ERROR_CODES = ['ENOTFOUND'] as const;
const NETWORK_ERROR_CODES = ['ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'] as const;
const AUTH_STATUS_CODES = [401, 403] as const;

const DEFAULT_RETRYABLE_ERRORS = [...TIMEOUT_ERROR_CODES, ...DNS_ERROR_CODES, ...NETWORK_ERROR_CODES] as const;

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: [...DEFAULT_RETRYABLE_ERRORS],
    onRetry: () => {},
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
    if (!error) {
        return false;
    }

    const errorMessage = error.message ?? '';
    const errorCode = error.code ?? '';

    const hasRetryableErrorCode = retryableErrors?.includes(errorCode);
    const hasRetryableErrorInMessage = retryableErrors?.some((code) => errorMessage.includes(code));
    const hasTimeoutInMessage = errorMessage.includes('timeout');
    const isAbortedWithTimeout = errorCode === 'ECONNABORTED' && errorMessage.includes('timeout');

    return hasRetryableErrorCode || hasRetryableErrorInMessage || hasTimeoutInMessage || isAbortedWithTimeout;
}

function calculateDelay(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
    const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * JITTER_FACTOR * exponentialDelay;

    return Math.min(exponentialDelay + jitter, maxDelayMs);
}

function isDnsError(errorCode: string, errorMessage: string): boolean {
    return DNS_ERROR_CODES.some((code) => errorCode === code || errorMessage.includes(code));
}

function isTimeoutError(errorCode: string, errorMessage: string): boolean {
    const hasTimeoutCode = TIMEOUT_ERROR_CODES.some((code) => errorCode === code);
    const hasTimeoutMessage = errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT');

    return hasTimeoutCode || hasTimeoutMessage;
}

function isAuthError(error: any): boolean {
    const statusCode = error?.response?.status;

    return AUTH_STATUS_CODES.some((code) => statusCode === code);
}

function isNetworkError(errorCode: string): boolean {
    return NETWORK_ERROR_CODES.some((code) => errorCode === code);
}

/**
 * Retries an async operation with exponential backoff.
 *
 * NOTE: This function does NOT log errors to avoid duplicate Sentry reports.
 * Callers are responsible for catching and logging errors with appropriate context.
 *
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the result of the operation
 * @throws The last error encountered if all retry attempts fail or if error is non-retryable
 *
 * @example
 * ```typescript
 * try {
 *   const result = await retryWithBackoff(
 *     () => api.fetchData(),
 *     { maxAttempts: 3, initialDelayMs: 1000 }
 *   );
 * } catch (error) {
 *   Logger.error(error, 'Failed to fetch data after retries');
 * }
 * ```
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };

    if (config.maxAttempts < 1) {
        const error = new Error('maxAttempts must be at least 1');
        Logger.error(error, 'Invalid retry configuration');
        throw error;
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            const isLastAttempt = attempt === config.maxAttempts;
            const shouldRetry = isRetryableError(error, config.retryableErrors);

            if (isLastAttempt || !shouldRetry) {
                // Don't log here - let the caller decide how to handle and log the error
                // Logging here causes duplicate Sentry reports when caller also logs
                throw error;
            }

            const delay = calculateDelay(attempt, config.initialDelayMs, config.maxDelayMs);

            Logger.debug(
                `Retry attempt ${attempt}/${config.maxAttempts} after error: ${error.message}. Waiting ${Math.round(delay)}ms before retry...`,
            );

            config.onRetry(error, attempt);
            await sleep(delay);
        }
    }

    // This should never be reached, but TypeScript needs it
    const error = lastError ?? new Error('All retry attempts failed');
    Logger.error(error, 'Retry logic reached unreachable code path - this indicates a logic bug');
    throw error;
}

/**
 * Categorizes network errors for better analytics and logging.
 *
 * @param error - The error to categorize
 * @returns Object with error category and formatted message
 */
export function categorizeNetworkError(error: any): CategorizedError {
    if (!error) {
        return { category: 'unknown', message: 'Unknown error' };
    }

    const errorCode = error.code ?? '';
    const errorMessage = error.message ?? '';

    if (isDnsError(errorCode, errorMessage)) {
        return { category: 'dns', message: `DNS resolution failed: ${errorMessage}` };
    }

    if (isTimeoutError(errorCode, errorMessage)) {
        return { category: 'timeout', message: `Request timeout: ${errorMessage}` };
    }

    if (isAuthError(error)) {
        return { category: 'auth', message: `Authentication error: ${error.response.status}` };
    }

    if (isNetworkError(errorCode)) {
        return { category: 'network', message: `Network error (${errorCode}): ${errorMessage}` };
    }

    return { category: 'unknown', message: errorMessage || 'Unknown error' };
}
