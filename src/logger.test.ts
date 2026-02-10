import { describe } from '@jest/globals';
import { expansionCastTo } from 'testsutil';
import { ConfigurationChangeEvent, Disposable, ExtensionContext, LogOutputChannel, window } from 'vscode';

import { configuration, OutputLevel } from './config/configuration';
import { extensionOutputChannelName } from './constants';
import { ErrorEvent, Logger } from './logger';
import { isDebugging } from './util/isDebugging';

// Mock configuration
jest.mock('./config/configuration', () => {
    return {
        OutputLevel: {
            Silent: 'silent',
            Errors: 'errors',
            Info: 'info',
            Debug: 'debug',
        },
        configuration: {
            onDidChange: jest.fn(),
            initializing: jest.fn(),
            changed: jest.fn(),
            initializingChangeEvent: {},
            get: jest.fn(),
        },
    };
});

// Mock isDebugging
jest.mock('./util/isDebugging', () => ({
    isDebugging: jest.fn().mockReturnValue(false),
}));

// Mock SentryService
jest.mock('./sentry', () => ({
    SentryService: {
        getInstance: jest.fn(),
    },
}));

const mockContainerIsDebugging = () => {
    (isDebugging as jest.Mock).mockReturnValue(true);
};

const deleteLoggerInstance = () => {
    Logger['_instance'] = undefined!;
};

describe('Logger', () => {
    let consoleSpy: jest.SpyInstance;
    let mockOutputChannel: LogOutputChannel;
    let mockChangeEvent: ConfigurationChangeEvent;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup default SentryService mock to avoid crashes in other tests
        const { SentryService } = require('./sentry');
        (SentryService.getInstance as jest.Mock).mockReturnValue({
            isInitialized: jest.fn().mockReturnValue(false),
            captureException: jest.fn(),
        });

        mockOutputChannel = expansionCastTo<LogOutputChannel>({
            dispose: jest.fn(),
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
        });

        // Set up spies
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(window, 'createOutputChannel').mockReturnValue(mockOutputChannel);

        // Create mock configuration change event
        mockChangeEvent = {} as ConfigurationChangeEvent;
        (configuration.initializing as jest.Mock).mockReturnValue(false);
        (configuration.changed as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
        deleteLoggerInstance();
        // Reset debugging state
        (isDebugging as jest.Mock).mockReturnValue(false);
    });

    describe('configure', () => {
        it('should register configuration change handler', () => {
            const mockContext = {
                subscriptions: [],
            };

            Logger.configure(mockContext as any);

            expect(configuration.onDidChange).toHaveBeenCalled();
            expect(mockContext.subscriptions.length).toBe(1);
        });
    });

    describe('onConfigurationChanged', () => {
        it('should set level to Debug when initializing and in debug mode', () => {
            mockContainerIsDebugging();
            (configuration.initializing as jest.Mock).mockReturnValue(true);

            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            expect(window.createOutputChannel).toHaveBeenCalledWith(extensionOutputChannelName);
        });

        it('should set level based on configuration when not in debug mode', () => {
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Info);

            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            expect(window.createOutputChannel).toHaveBeenCalledWith(extensionOutputChannelName);
        });

        it('should dispose output channel when level is Silent', () => {
            // First, let's create an instance with output level Debug
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Debug);
            const instance = Logger.Instance;
            (instance as any).onConfigurationChanged(mockChangeEvent);

            // then, change the output level to Silent
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Silent);
            (instance as any).onConfigurationChanged(mockChangeEvent);

            expect(mockOutputChannel.dispose).toHaveBeenCalled();
        });
    });

    describe.each([false, true])('info', (useInstance) => {
        const Logger_info: typeof Logger.info = useInstance
            ? (...args) => Logger.Instance.info(...args)
            : (...args) => Logger.info(...args);

        beforeEach(() => {
            // Set up Logger with Info level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Info);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));
        });

        it('should append message to output channel', () => {
            Logger_info('test info message');

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            const call = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
            expect(call).toContain('test info message');
        });

        it('should not output anything when level is not Info or Debug', () => {
            // Set output level to Errors
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Errors);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            Logger_info('test info message');

            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
        });
    });

    describe.each([false, true])('debug', (useInstance) => {
        const Logger_debug: typeof Logger.debug = useInstance
            ? (...args) => Logger.Instance.debug(...args)
            : (...args) => Logger.debug(...args);

        beforeEach(() => {
            // Set up Logger with Debug level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Debug);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));
        });

        it('should append message to output channel', () => {
            Logger_debug('test debug message');

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            const call = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
            expect(call).toContain('test debug message');
        });

        it('should output to console when in debugging mode', () => {
            mockContainerIsDebugging();

            Logger_debug('test debug message');

            expect(console.log).toHaveBeenCalled();
            const calls = consoleSpy.mock.calls[0];
            expect(calls).toContain('[Atlassian]');
            expect(calls).toContain('test debug message');
        });

        it('should not output anything when level is not Debug', () => {
            // Set output level to Info
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Info);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            Logger_debug('test debug message');

            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
            expect(console.log).not.toHaveBeenCalled();
        });
    });

    describe.each([false, true])('warn', (useInstance) => {
        const Logger_warn: typeof Logger.warn = useInstance
            ? (...args) => Logger.Instance.warn(...args)
            : (...args) => Logger.warn(...args);

        beforeEach(() => {
            // Set up Logger with Debug level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Debug);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));
        });

        it('should append message to output channel', () => {
            Logger_warn('test warning message');

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            const call = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
            expect(call).toContain('test warning message');
        });

        it('should output to console when in debugging mode', () => {
            mockContainerIsDebugging();

            Logger_warn('test warning message');

            expect(console.warn).toHaveBeenCalled();
        });
    });

    describe.each([false, true])('error', (useInstance) => {
        const Logger_error: typeof Logger.error = useInstance
            ? (...args) => Logger.Instance.error.apply(Logger.Instance, args)
            : (...args) => Logger.error.apply(Logger, args);

        beforeEach(() => {
            // Set up Logger with Error level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Errors);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));
        });

        it('should fire an error event', () => {
            let eventRegistration: Disposable;
            try {
                const errorHandlerSpy = jest.fn();
                eventRegistration = Logger.onError(errorHandlerSpy);

                const testError = new Error('test error message');
                Logger_error(testError, 'Something went wrong');

                expect(errorHandlerSpy).toHaveBeenCalled();
                const errorEvent: ErrorEvent = errorHandlerSpy.mock.calls[0][0];
                expect(errorEvent.error).toBe(testError);
                expect(errorEvent.errorMessage).toBe('Something went wrong');
                expect(errorEvent.capturedBy).toBeDefined();
            } finally {
                eventRegistration!.dispose();
            }
        });

        it('should append error to output channel', () => {
            const testError = new Error('test error message');
            Logger_error(testError, 'Something went wrong');

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            const call = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
            expect(call).toContain('Something went wrong');
            expect(call).toContain('Error: test error message');
        });

        it('should output to console when in debugging mode', () => {
            mockContainerIsDebugging();

            const testError = new Error('test error message');
            Logger_error(testError, 'Something went wrong');

            expect(console.error).toHaveBeenCalled();
        });

        it('should not output anything when level is Silent', () => {
            // Set output level to Silent
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Silent);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            const testError = new Error('test error message');
            Logger_error(testError, 'Something went wrong');

            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe('show', () => {
        beforeEach(() => {
            // Set up Logger with Info level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Info);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));
        });

        it('should show output channel', () => {
            Logger.show();

            expect(mockOutputChannel.show).toHaveBeenCalled();
        });
    });

    describe('retrieveCallerName', () => {
        function thisFunctionName() {
            Logger.error(new Error('test error'));
        }

        it('should return caller function name', () => {
            let eventRegistration: Disposable;
            try {
                const errorHandlerSpy = jest.fn();
                eventRegistration = Logger.onError(errorHandlerSpy);

                thisFunctionName();

                const errorEvent: ErrorEvent = errorHandlerSpy.mock.calls[0][0];
                expect(errorEvent.capturedBy).toEqual('thisFunctionName');
            } finally {
                eventRegistration!.dispose();
            }
        });
    });

    describe('Sentry integration', () => {
        let mockSentryService: any;

        beforeEach(() => {
            // Set up Logger with Error level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Errors);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            // Setup the mocked Sentry service to be returned by getInstance
            mockSentryService = {
                isInitialized: jest.fn(),
                captureException: jest.fn(),
            };
            const { SentryService } = require('./sentry');
            (SentryService.getInstance as jest.Mock).mockReturnValue(mockSentryService);
            mockSentryService.isInitialized.mockReturnValue(true);
        });

        it('should not capture exception to Sentry when not initialized', () => {
            mockSentryService.isInitialized.mockReturnValue(false);

            const testError = new Error('test error');
            Logger.error(testError, 'Error message');

            expect(mockSentryService.captureException).not.toHaveBeenCalled();
        });

        it('should include capturedBy in Sentry tags', () => {
            mockSentryService.isInitialized.mockReturnValue(true);

            const testError = new Error('test error');
            Logger.error(testError, 'Error message');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    tags: expect.objectContaining({
                        capturedBy: expect.any(String),
                    }),
                }),
            );
        });

        it('should include params in Sentry extra context', () => {
            mockSentryService.isInitialized.mockReturnValue(true);

            const testError = new Error('test error');
            Logger.error(testError, 'Error message', 'param1', 'param2');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    extra: expect.objectContaining({
                        params: ['param1', 'param2'],
                    }),
                }),
            );
        });

        it('should handle Sentry errors gracefully and continue logging', () => {
            mockSentryService.isInitialized.mockReturnValue(true);
            mockSentryService.captureException.mockImplementation(() => {
                throw new Error('Sentry failed');
            });

            const testError = new Error('test error');

            // Should not throw
            expect(() => {
                Logger.error(testError, 'Error message');
            }).not.toThrow();

            // Should still log to output channel
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        });
    });

    describe('rovoDevErrorInternal', () => {
        let mockSentryService: any;

        beforeEach(() => {
            // Set up Logger with Error level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Errors);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            // Setup the mocked Sentry service
            mockSentryService = {
                isInitialized: jest.fn().mockReturnValue(true),
                captureException: jest.fn(),
            };
            const { SentryService } = require('./sentry');
            (SentryService.getInstance as jest.Mock).mockReturnValue(mockSentryService);
        });

        it('should log error with RovoDev product area', () => {
            const testError = new Error('RovoDev error');
            const metadata = {
                rovoDevEnv: 'IDE' as const,
                appInstanceId: 'test-instance-123',
                sessionId: 'test-session-456',
            };

            Logger.rovoDevErrorInternal(testError, 'testFunction', 'RovoDev failed', metadata, 'prompt-789');

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            const call = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
            expect(call).toContain('RovoDev failed');
            expect(call).toContain('Error: RovoDev error');
        });

        it('should send error to Sentry with RovoDev metadata tags', () => {
            const testError = new Error('RovoDev error');
            const metadata = {
                rovoDevEnv: 'IDE' as const,
                appInstanceId: 'test-instance-123',
                sessionId: 'test-session-456',
            };

            Logger.rovoDevErrorInternal(testError, 'testFunction', 'RovoDev failed', metadata, 'prompt-789');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    tags: expect.objectContaining({
                        productArea: 'RovoDev',
                        capturedBy: 'testFunction',
                        rovoDevEnv: 'IDE' as const,
                        appInstanceId: 'test-instance-123',
                        sessionId: 'test-session-456',
                    }),
                }),
            );
        });

        it('should include promptId and params in Sentry extra context', () => {
            const testError = new Error('RovoDev error');
            const metadata = {
                rovoDevEnv: 'Boysenberry' as const,
                appInstanceId: 'test-instance-123',
                sessionId: 'test-session-456',
            };

            Logger.rovoDevErrorInternal(
                testError,
                'testFunction',
                'RovoDev failed',
                metadata,
                'prompt-789',
                'param1',
                'param2',
            );

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    extra: expect.objectContaining({
                        errorMessage: 'RovoDev failed',
                        promptId: 'prompt-789',
                        params: ['param1', 'param2'],
                    }),
                }),
            );
        });

        it('should handle undefined promptId gracefully', () => {
            const testError = new Error('RovoDev error');
            const metadata = {
                rovoDevEnv: 'IDE' as const,
                appInstanceId: 'test-instance-123',
                sessionId: 'test-session-456',
            };

            Logger.rovoDevErrorInternal(testError, 'testFunction', 'RovoDev failed', metadata, undefined);

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    extra: expect.objectContaining({
                        errorMessage: 'RovoDev failed',
                        promptId: undefined,
                    }),
                }),
            );
        });

        it('should handle empty metadata object', () => {
            const testError = new Error('RovoDev error');
            const metadata = {} as any;

            Logger.rovoDevErrorInternal(testError, 'testFunction', 'RovoDev failed', metadata, 'prompt-789');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    tags: expect.objectContaining({
                        productArea: 'RovoDev',
                        capturedBy: 'testFunction',
                    }),
                    extra: expect.objectContaining({
                        errorMessage: 'RovoDev failed',
                        promptId: 'prompt-789',
                    }),
                }),
            );
        });

        it('should fire error event with RovoDev product area', () => {
            const errorHandlerSpy = jest.fn();
            const eventRegistration = Logger.onError(errorHandlerSpy);

            try {
                const testError = new Error('RovoDev error');
                const metadata = {
                    rovoDevEnv: 'IDE' as const,
                    appInstanceId: 'test-instance-123',
                    sessionId: 'test-session-456',
                };

                Logger.rovoDevErrorInternal(testError, 'testFunction', 'RovoDev failed', metadata, 'prompt-789');

                expect(errorHandlerSpy).toHaveBeenCalled();
                const errorEvent = errorHandlerSpy.mock.calls[0][0];
                expect(errorEvent.error).toBe(testError);
                expect(errorEvent.errorMessage).toBe('RovoDev failed');
                expect(errorEvent.capturedBy).toBe('testFunction');
                expect(errorEvent.productArea).toBe('RovoDev');
            } finally {
                eventRegistration.dispose();
            }
        });

        it('should not send to Sentry when not initialized', () => {
            mockSentryService.isInitialized.mockReturnValue(false);

            const testError = new Error('RovoDev error');
            const metadata = {
                rovoDevEnv: 'IDE' as const,
                appInstanceId: 'test-instance-123',
                sessionId: 'test-session-456',
            };

            Logger.rovoDevErrorInternal(testError, 'testFunction', 'RovoDev failed', metadata, 'prompt-789');

            expect(mockSentryService.captureException).not.toHaveBeenCalled();
            // Should still log to output channel
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        });
    });

    describe('bitBucketErrorInternal', () => {
        let mockSentryService: any;

        beforeEach(() => {
            // Set up Logger with Error level
            (configuration.initializing as jest.Mock).mockReturnValue(true);
            (configuration.get as jest.Mock).mockReturnValue(OutputLevel.Errors);
            Logger.configure(expansionCastTo<ExtensionContext>({ subscriptions: [] }));

            // Setup the mocked Sentry service
            mockSentryService = {
                isInitialized: jest.fn().mockReturnValue(true),
                captureException: jest.fn(),
            };
            const { SentryService } = require('./sentry');
            (SentryService.getInstance as jest.Mock).mockReturnValue(mockSentryService);
        });

        it('should log error with Bitbucket product area', () => {
            const testError = new Error('Bitbucket error');

            Logger.bitBucketErrorInternal(testError, 'testFunction', 'Bitbucket failed');

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            const call = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
            expect(call).toContain('Bitbucket failed');
            expect(call).toContain('Error: Bitbucket error');
        });

        it('should send error to Sentry with Bitbucket product area', () => {
            const testError = new Error('Bitbucket error');

            Logger.bitBucketErrorInternal(testError, 'testFunction', 'Bitbucket failed', 'param1');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    tags: expect.objectContaining({
                        productArea: 'Bitbucket',
                        capturedBy: 'testFunction',
                    }),
                    extra: expect.objectContaining({
                        errorMessage: 'Bitbucket failed',
                        params: ['param1'],
                    }),
                }),
            );
        });
    });
});
