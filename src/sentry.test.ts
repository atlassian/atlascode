import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Sentry from '@sentry/node';
import { extensions } from 'vscode';

import { ErrorContext, SentryConfig, SentryService } from './sentry';

// Mock dependencies
jest.mock('@sentry/node');

jest.mock('vscode', () => ({
    Disposable: class Disposable {
        constructor() {}
        dispose() {}
    },
    EventEmitter: class EventEmitter {
        fire() {}
        event = jest.fn();
    },
    extensions: {
        getExtension: jest.fn(),
    },
    workspace: {
        onDidChangeConfiguration: jest.fn(),
    },
}));

describe('SentryService', () => {
    let sentryService: SentryService;
    let mockSentryInit: jest.Mock;
    let mockCaptureException: jest.Mock;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        // Reset the singleton instance before each test
        (SentryService as any)._instance = undefined;
        sentryService = SentryService.getInstance();

        // Setup mocks
        mockSentryInit = jest.fn();
        mockCaptureException = jest.fn((_error, scopeCallback) => {
            const mockScope = {
                setTag: jest.fn(),
                setContext: jest.fn(),
            };
            if (scopeCallback) {
                // @ts-ignore
                scopeCallback(mockScope);
            }
            return 'event-id';
        });

        (Sentry.init as jest.Mock) = mockSentryInit;
        (Sentry.captureException as jest.Mock) = mockCaptureException;

        // Mock feature flag to be enabled by default

        // Mock extension version
        (extensions.getExtension as jest.Mock).mockReturnValue({
            packageJSON: { version: '1.2.3' },
        });

        // Spy on console.error
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy.mockRestore();
    });

    describe('getInstance', () => {
        it('should return the same instance (singleton)', () => {
            const instance1 = SentryService.getInstance();
            const instance2 = SentryService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('initialize', () => {
        it('should initialize Sentry with valid configuration', async () => {
            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
                environment: 'test',
                sampleRate: 0.5,
                atlasCodeVersion: '1.2.3',
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).toHaveBeenCalledWith({
                dsn: 'https://test@sentry.io/123456',
                environment: 'test',
                sampleRate: 0.5,
                tracesSampleRate: 0,
            });
            expect(sentryService.isInitialized()).toBe(true);
            expect(sentryService.getConfig()).toEqual(config);
        });

        it('should not initialize when enabled is false', async () => {
            const config: SentryConfig = {
                enabled: false,
                dsn: 'https://test@sentry.io/123456',
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).not.toHaveBeenCalled();
            expect(sentryService.isInitialized()).toBe(false);
        });

        it('should not initialize when DSN is missing', async () => {
            const config: SentryConfig = {
                enabled: true,
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).not.toHaveBeenCalled();
            expect(sentryService.isInitialized()).toBe(false);
        });

        it('should not initialize when feature flag is disabled', async () => {
            const config: SentryConfig = {
                enabled: true,
                dsn: 'https://test@sentry.io/123456',
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).not.toHaveBeenCalled();
            expect(sentryService.isInitialized()).toBe(false);
        });

        it('should use default environment when not provided', async () => {
            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).toHaveBeenCalledWith(
                expect.objectContaining({
                    environment: 'development',
                }),
            );
        });

        it('should use default sample rate when not provided', async () => {
            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).toHaveBeenCalledWith(
                expect.objectContaining({
                    sampleRate: 1.0,
                }),
            );
        });

        it('should handle initialization errors gracefully', async () => {
            mockSentryInit.mockImplementation(() => {
                throw new Error('Sentry init failed');
            });

            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            };

            await sentryService.initialize(config);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize Sentry:', expect.any(Error));
            expect(sentryService.isInitialized()).toBe(false);
        });
    });

    describe('captureException', () => {
        beforeEach(async () => {
            // Initialize Sentry before testing captureException
            await sentryService.initialize({
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            });
        });

        it('should capture exception without context', () => {
            const error = new Error('Test error');

            sentryService.captureException(error);

            expect(mockCaptureException).toHaveBeenCalled();
            const callArgs = mockCaptureException.mock.calls[0];
            expect(callArgs[0]).toBe(error);
        });

        it('should capture exception with tags', () => {
            const error = new Error('Test error');
            const context: ErrorContext = {
                tags: {
                    module: 'test-module',
                    severity: 'high',
                },
            };

            sentryService.captureException(error, context);

            expect(mockCaptureException).toHaveBeenCalled();
            // Verify scope callback was called
            const scopeCallback = mockCaptureException.mock.calls[0][1];
            expect(scopeCallback).toBeDefined();
        });

        it('should capture exception with extra context', () => {
            const error = new Error('Test error');
            const context: ErrorContext = {
                extra: {
                    userId: '123',
                    action: 'testAction',
                },
            };

            sentryService.captureException(error, context);

            expect(mockCaptureException).toHaveBeenCalled();
        });

        it('should add platform and version tags', () => {
            const error = new Error('Test error');
            const mockScope = {
                setTag: jest.fn(),
                setContext: jest.fn(),
            };

            mockCaptureException.mockImplementation((_error, scopeCallback) => {
                if (scopeCallback) {
                    // @ts-ignore
                    scopeCallback(mockScope);
                }
                return 'event-id';
            });

            sentryService.captureException(error);

            expect(mockScope.setTag).toHaveBeenCalledWith('platform', 'vscode');
            expect(mockScope.setTag).toHaveBeenCalledWith('atlascodeVersion', '1.2.3');
        });

        it('should not capture when not initialized', () => {
            // Create a new instance that's not initialized
            (SentryService as any)._instance = undefined;
            const uninitializedService = SentryService.getInstance();

            const error = new Error('Test error');
            uninitializedService.captureException(error);

            expect(mockCaptureException).not.toHaveBeenCalled();
        });

        it('should handle capture errors gracefully', () => {
            mockCaptureException.mockImplementation(() => {
                throw new Error('Capture failed');
            });

            // Re-initialize with a spy callback
            const analyticsSpy = jest.fn();
            (sentryService as any).initialized = true;
            (sentryService as any).sentryClient = Sentry;
            (sentryService as any).analyticsCallback = analyticsSpy;

            const error = new Error('Test error');
            sentryService.captureException(error);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to capture exception in Sentry:', expect.any(Error));
            expect(analyticsSpy).toHaveBeenCalledWith('Capture failed');
        });

        it('should set multiple tags when provided', () => {
            const error = new Error('Test error');
            const mockScope = {
                setTag: jest.fn(),
                setContext: jest.fn(),
            };
            mockCaptureException.mockImplementation((_error, scopeCallback) => {
                if (scopeCallback) {
                    // @ts-ignore
                    scopeCallback(mockScope);
                }
                return 'event-id';
            });

            const context: ErrorContext = {
                tags: {
                    tag1: 'value1',
                    tag2: 'value2',
                    tag3: 'value3',
                },
            };

            sentryService.captureException(error, context);

            expect(mockScope.setTag).toHaveBeenCalledWith('tag1', 'value1');
            expect(mockScope.setTag).toHaveBeenCalledWith('tag2', 'value2');
            expect(mockScope.setTag).toHaveBeenCalledWith('tag3', 'value3');
        });
    });

    describe('isInitialized', () => {
        it('should return false when not initialized', () => {
            expect(sentryService.isInitialized()).toBe(false);
        });

        it('should return true after successful initialization', async () => {
            await sentryService.initialize({
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            });

            expect(sentryService.isInitialized()).toBe(true);
        });

        it('should return false after failed initialization', async () => {
            mockSentryInit.mockImplementation(() => {
                throw new Error('Init failed');
            });

            await sentryService.initialize({
                enabled: true,
                dsn: 'https://test@sentry.io/123456',
            });

            expect(sentryService.isInitialized()).toBe(false);
        });
    });

    describe('getConfig', () => {
        it('should return null when not initialized', () => {
            expect(sentryService.getConfig()).toBeNull();
        });

        it('should return config after initialization', async () => {
            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
                environment: 'test',
                sampleRate: 0.5,
            };

            await sentryService.initialize(config);

            expect(sentryService.getConfig()).toEqual(config);
        });
    });

    describe('edge cases', () => {
        it('should handle missing extension version gracefully', async () => {
            (extensions.getExtension as jest.Mock).mockReturnValue(null);

            await sentryService.initialize({
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            });

            const error = new Error('Test error');
            sentryService.captureException(error);

            expect(mockCaptureException).toHaveBeenCalled();
        });

        it('should handle sampleRate of 0', async () => {
            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
                sampleRate: 0,
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).toHaveBeenCalledWith(
                expect.objectContaining({
                    sampleRate: 0,
                }),
            );
        });

        it('should always set tracesSampleRate to 0', async () => {
            const config: SentryConfig = {
                enabled: true,
                featureFlagEnabled: true,
                dsn: 'https://test@sentry.io/123456',
            };

            await sentryService.initialize(config);

            expect(mockSentryInit).toHaveBeenCalledWith(
                expect.objectContaining({
                    tracesSampleRate: 0,
                }),
            );
        });
    });
});
