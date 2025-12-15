import { Logger } from '../logger';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    retryableErrors?: string[];
    onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'],
    onRetry: () => {},
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
    if (!error) {
        return false;
    }

    if (error.code && retryableErrors.includes(error.code)) {
        return true;
    }

    if (error.message && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
        return true;
    }

    if (error.message && error.message.includes('ENOTFOUND')) {
        return true;
    }

    if (error.code === 'ECONNABORTED' && error.message && error.message.includes('timeout')) {
        return true;
    }

    return false;
}

function calculateDelay(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
    const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Retries an async operation with exponential backoff.
 *
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the result of the operation
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => api.fetchData(),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };

    if (config.maxAttempts < 1) {
        throw new Error('maxAttempts must be at least 1');
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            if (attempt === config.maxAttempts || !isRetryableError(error, config.retryableErrors)) {
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
    throw lastError || new Error('All retry attempts failed');
}

/**
 * Categorizes network errors for better analytics and logging.
 */
export function categorizeNetworkError(error: any): {
    category: 'timeout' | 'dns' | 'network' | 'auth' | 'unknown';
    message: string;
} {
    if (!error) {
        return { category: 'unknown', message: 'Unknown error' };
    }

    if (error.code === 'ENOTFOUND' || (error.message && error.message.includes('ENOTFOUND'))) {
        return {
            category: 'dns',
            message: `DNS resolution failed: ${error.message}`,
        };
    }

    if (
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED' ||
        (error.message && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')))
    ) {
        return {
            category: 'timeout',
            message: `Request timeout: ${error.message}`,
        };
    }

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        return {
            category: 'auth',
            message: `Authentication error: ${error.response.status}`,
        };
    }

    if (
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'EHOSTUNREACH' ||
        error.code === 'ENETUNREACH'
    ) {
        return {
            category: 'network',
            message: `Network error (${error.code}): ${error.message}`,
        };
    }

    return {
        category: 'unknown',
        message: error.message || 'Unknown error',
    };
}
