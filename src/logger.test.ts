import { describe } from '@jest/globals';
import { expansionCastTo } from 'testsutil';
import { ConfigurationChangeEvent, Disposable, ExtensionContext, LogOutputChannel, window } from 'vscode';

import { configuration, OutputLevel } from './config/configuration';
import { extensionOutputChannelName } from './constants';
import { Container } from './container';
import { ErrorEvent, Logger } from './logger';

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

// Mock Container
jest.mock('./container', () => ({
    Container: {
        isDebugging: false,
    },
}));

const mockContainerIsDebugging = () => {
    (Container.isDebugging as any) = true;
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
        // Reset Container debugging state
        (Container.isDebugging as any) = false;
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
});
