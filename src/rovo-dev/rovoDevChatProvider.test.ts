import { v4 } from 'uuid';

import { RovoDevApiClient } from './client/rovoDevApiClient';
import { RovoDevChatProvider } from './rovoDevChatProvider';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevPrompt } from './rovoDevTypes';
import * as rovoDevUtils from './rovoDevUtils';
import { TypedWebview } from './rovoDevWebviewProvider';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';
import { RovoDevViewResponse } from './ui/rovoDevViewMessages';

// Mock dependencies
jest.mock('uuid');
jest.mock('./api/extensionApi', () => ({
    ExtensionApi: jest.fn().mockImplementation(() => ({
        metadata: {
            isDebugging: jest.fn(() => false),
            isBoysenberry: jest.fn(() => false),
            isRovoDevEnabled: jest.fn(() => true),
            version: jest.fn(() => '1.0.0'),
            appInstanceId: jest.fn(() => 'test-app-id'),
        },
        config: {
            isDebugPanelEnabled: jest.fn(() => false),
            isThinkingBlockEnabled: jest.fn(() => false),
            onDidChange: jest.fn(),
        },
        analytics: {
            sendTrackEvent: jest.fn(),
        },
        auth: {
            getCloudPrimaryAuthInfo: jest.fn(),
            getPrimaryAuthInfo: jest.fn(),
            validateJiraCredentials: jest.fn(),
        },
        jira: {
            getSites: jest.fn(() => []),
            fetchWorkItems: jest.fn(() => Promise.resolve([])),
        },
        commands: {
            openFolder: jest.fn(),
            focusRovodevView: jest.fn(),
            showUserAuthentication: jest.fn(),
            showDiff: jest.fn(),
            setCommandContext: jest.fn(),
        },
    })),
}));
jest.mock('src/logger');
jest.mock('./rovoDevUtils');

describe('RovoDevChatProvider', () => {
    let chatProvider: RovoDevChatProvider;
    let mockApiClient: jest.Mocked<RovoDevApiClient>;
    let mockTelemetryProvider: jest.Mocked<RovoDevTelemetryProvider>;
    let mockWebview: jest.Mocked<TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>>;
    let mockUuid: jest.MockedFunction<typeof v4>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock API client
        mockApiClient = {
            chat: jest.fn(),
            cancel: jest.fn(),
            replay: jest.fn(),
            resumeToolCall: jest.fn(),
            getCurrentSession: jest.fn(),
            listSessions: jest.fn(),
            restoreSession: jest.fn(),
            forkSession: jest.fn(),
            deleteSession: jest.fn(),
            createSession: jest.fn(),
            getCacheFilePath: jest.fn(),
            status: jest.fn(),
            healthcheck: jest.fn(),
            shutdown: jest.fn(),
            acceptMcpTerms: jest.fn(),
            baseApiUrl: 'http://localhost:3000',
        } as any;

        // Mock telemetry provider
        mockTelemetryProvider = {
            fireTelemetryEvent: jest.fn(),
            startNewPrompt: jest.fn(),
            perfLogger: {
                promptStarted: jest.fn(),
                promptFirstByteReceived: jest.fn(),
                promptFirstMessageReceived: jest.fn(),
                promptLastMessageReceived: jest.fn(),
                promptTechnicalPlanReceived: jest.fn(),
                promptLastMessageRendered: jest.fn(),
            },
        } as any;

        // Mock webview
        mockWebview = {
            postMessage: jest.fn().mockResolvedValue(undefined),
        } as any;

        // Mock uuid
        mockUuid = v4 as jest.MockedFunction<typeof v4>;
        (mockUuid as any).mockReturnValue('test-uuid-123');

        // Mock rovoDevUtils
        (rovoDevUtils.readLastNLogLines as jest.Mock).mockReturnValue(['log line 1', 'log line 2']);
        (rovoDevUtils.parseCustomCliTagsForMarkdown as jest.Mock).mockImplementation((text) => text);
        (rovoDevUtils.statusJsonResponseToMarkdown as jest.Mock).mockReturnValue('status markdown');
        (rovoDevUtils.usageJsonResponseToMarkdown as jest.Mock).mockReturnValue({
            usage_response: 'usage markdown',
            alert_message: null,
        });
        (rovoDevUtils.promptsJsonResponseToMarkdown as jest.Mock).mockReturnValue('prompts markdown');

        // Create chat provider instance
        chatProvider = new RovoDevChatProvider(false, mockTelemetryProvider);
        chatProvider.setWebview(mockWebview);
    });

    describe('constructor and initialization', () => {
        it('should initialize with correct default values', () => {
            expect(chatProvider.yoloMode).toBe(false);
            expect(chatProvider.fullContextMode).toBe(false);
            expect(chatProvider.isPromptPending).toBe(false);
            expect(chatProvider.pendingCancellation).toBe(false);
            expect(chatProvider.currentPromptId).toBe('');
        });

        it('should accept isBoysenberry parameter', () => {
            const boysenberryProvider = new RovoDevChatProvider(true, mockTelemetryProvider);
            expect(boysenberryProvider).toBeDefined();
        });
    });

    describe('setWebview', () => {
        it('should set the webview', () => {
            const newWebview = { postMessage: jest.fn() } as any;
            chatProvider.setWebview(newWebview);
            expect(chatProvider['_webView']).toBe(newWebview);
        });

        it('should allow setting webview to undefined', () => {
            chatProvider.setWebview(undefined);
            expect(chatProvider['_webView']).toBeUndefined();
        });
    });

    describe('setReady', () => {
        it('should set the API client', async () => {
            await chatProvider.setReady(mockApiClient);
            expect(chatProvider['_rovoDevApiClient']).toBe(mockApiClient);
        });

        it('should execute pending prompt when API client is set', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            // Set up mock streaming response
            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            // Execute chat before API client is ready
            await chatProvider.executeChat(mockPrompt, []);
            expect(chatProvider.isPromptPending).toBe(true);

            // Set API client ready
            await chatProvider.setReady(mockApiClient);

            // Verify pending prompt was executed
            expect(mockApiClient.chat).toHaveBeenCalled();
            expect(chatProvider.isPromptPending).toBe(false);
        });
    });

    describe('shutdown', () => {
        it('should clear API client and pending prompts', async () => {
            await chatProvider.setReady(mockApiClient);
            chatProvider['_pendingPrompt'] = { text: 'test', enable_deep_plan: false, context: [] };

            chatProvider.shutdown();

            expect(chatProvider['_rovoDevApiClient']).toBeUndefined();
            expect(chatProvider['_pendingPrompt']).toBeUndefined();
            expect(chatProvider['_lastMessageSentTime']).toBeUndefined();
        });
    });

    describe('clearChat', () => {
        it('should send clear chat message to webview', async () => {
            await chatProvider.clearChat();

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.ClearChat,
            });
        });
    });

    describe('executeRetryPromptAfterError', () => {
        it('should not execute if no current prompt exists', async () => {
            await chatProvider.setReady(mockApiClient);
            await chatProvider.executeRetryPromptAfterError();
            expect(mockApiClient.chat).not.toHaveBeenCalled();
        });

        it('should retry the current prompt with error context', async () => {
            await chatProvider.setReady(mockApiClient);

            // First execute a prompt
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);
            mockApiClient.chat.mockClear();

            // Now retry
            const retryStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            mockApiClient.chat.mockResolvedValue({ body: retryStream } as Response);

            await chatProvider.executeRetryPromptAfterError();

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'test prompt',
                    context: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'retry-after-error',
                        }),
                    ]),
                }),
                true,
                expect.any(AbortSignal),
            );
        });

        it('should echo the prompt to webview', async () => {
            await chatProvider.setReady(mockApiClient);

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: true,
                context: [],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            mockApiClient.chat.mockResolvedValue({ body: mockReadableStream } as Response);

            await chatProvider.executeChat(mockPrompt, []);
            mockWebview.postMessage.mockClear();

            const retryStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            mockApiClient.chat.mockResolvedValue({ body: retryStream } as Response);

            await chatProvider.executeRetryPromptAfterError();

            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: RovoDevProviderMessageType.SignalPromptSent,
                    text: 'test prompt',
                    echoMessage: true,
                }),
            );
        });
    });

    describe('executeReplay', () => {
        it('should throw error if API client is not initialized', async () => {
            const providerWithoutClient = new RovoDevChatProvider(false, mockTelemetryProvider);
            providerWithoutClient.setWebview(mockWebview);

            await expect(providerWithoutClient.executeReplay()).rejects.toThrow(
                'Unable to replay the previous conversation. Rovo Dev failed to initialize',
            );
        });

        it('should call replay API', async () => {
            await chatProvider.setReady(mockApiClient);

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "replay_end"}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            mockApiClient.replay.mockResolvedValue({ body: mockReadableStream } as Response);

            await chatProvider.executeReplay();

            expect(mockApiClient.replay).toHaveBeenCalled();
        });

        it('should set and unset replay in progress flag', async () => {
            await chatProvider.setReady(mockApiClient);

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "replay_end"}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            mockApiClient.replay.mockResolvedValue({ body: mockReadableStream } as Response);

            expect(chatProvider['_replayInProgress']).toBe(false);

            const replayPromise = chatProvider.executeReplay();

            await replayPromise;

            expect(chatProvider['_replayInProgress']).toBe(false);
        });

        it('should use "replay" as prompt ID override', async () => {
            await chatProvider.setReady(mockApiClient);

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "replay_end"}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            mockApiClient.replay.mockResolvedValue({ body: mockReadableStream } as Response);

            await chatProvider.executeReplay();

            expect(chatProvider.currentPromptId).toBe('replay');
        });
    });

    describe('executeCancel', () => {
        it('should cancel the current chat', async () => {
            await chatProvider.setReady(mockApiClient);
            mockApiClient.cancel.mockResolvedValue({ cancelled: true, message: 'Cancelled' });

            const result = await chatProvider.executeCancel(false);

            expect(result).toBe(true);
            expect(mockApiClient.cancel).toHaveBeenCalled();
        });

        it('should handle "No chat in progress" message as success', async () => {
            await chatProvider.setReady(mockApiClient);

            mockApiClient.cancel.mockResolvedValue({ cancelled: false, message: 'No chat in progress' });

            const result = await chatProvider.executeCancel(false);

            expect(result).toBe(true);
        });

        it('should handle cancel failure', async () => {
            await chatProvider.setReady(mockApiClient);

            mockApiClient.cancel.mockRejectedValue(new Error('Network error'));

            const result = await chatProvider.executeCancel(false);

            expect(result).toBe(false);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.CancelFailed,
            });
        });

        it('should throw error if cancellation is already in progress', async () => {
            await chatProvider.setReady(mockApiClient);

            mockApiClient.cancel.mockImplementation(() => new Promise(() => {})); // Never resolves

            void chatProvider.executeCancel(false);

            await expect(chatProvider.executeCancel(false)).rejects.toThrow('Cancellation already in progress');

            // Clean up
            chatProvider['_pendingCancellation'] = false;
        });

        it('should handle cancellation before initialization', async () => {
            const providerWithoutClient = new RovoDevChatProvider(false, mockTelemetryProvider);
            providerWithoutClient.setWebview(mockWebview);

            // Set a pending prompt
            providerWithoutClient['_pendingPrompt'] = { text: 'test', enable_deep_plan: false, context: [] };

            const result = await providerWithoutClient.executeCancel(false);

            expect(result).toBe(true);
            expect(providerWithoutClient['_pendingPrompt']).toBeUndefined();
            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: RovoDevProviderMessageType.CompleteMessage,
                }),
            );
        });

        it('should fire telemetry event for cancellation', async () => {
            await chatProvider.setReady(mockApiClient);

            mockApiClient.cancel.mockResolvedValue({ cancelled: true, message: 'Cancelled' });

            await chatProvider.executeCancel(false);

            expect(mockTelemetryProvider.fireTelemetryEvent).toHaveBeenCalledWith({
                action: 'rovoDevStopAction',
                subject: 'atlascode',
                attributes: {
                    promptId: expect.any(String),
                    failed: undefined,
                },
            });
        });

        it('should not fire telemetry when cancelling from new session', async () => {
            await chatProvider.setReady(mockApiClient);

            mockApiClient.cancel.mockResolvedValue({ cancelled: true, message: 'Cancelled' });
            mockTelemetryProvider.fireTelemetryEvent.mockClear();

            await chatProvider.executeCancel(true);

            expect(mockTelemetryProvider.fireTelemetryEvent).not.toHaveBeenCalled();
        });

        it('should clear render time tracking on cancellation', async () => {
            await chatProvider.setReady(mockApiClient);

            mockApiClient.cancel.mockResolvedValue({ cancelled: true, message: 'Cancelled' });
            chatProvider['_lastMessageSentTime'] = 12345;

            await chatProvider.executeCancel(false);

            expect(chatProvider['_lastMessageSentTime']).toBeUndefined();
        });
    });

    describe('signalToolRequestChoiceSubmit', () => {
        it('should throw error if tool call ID not found', async () => {
            await chatProvider.setReady(mockApiClient);
            await expect(chatProvider.signalToolRequestChoiceSubmit('unknown-id', 'allow')).rejects.toThrow(
                'Received an unexpected tool confirmation: not found.',
            );
        });

        it('should throw error if tool already confirmed', async () => {
            await chatProvider.setReady(mockApiClient);

            chatProvider['_pendingToolConfirmation'] = {
                'tool-1': 'allow',
            };

            await expect(chatProvider.signalToolRequestChoiceSubmit('tool-1', 'allow')).rejects.toThrow(
                'Received an unexpected tool confirmation: already confirmed.',
            );
        });

        it('should submit single tool choice', async () => {
            await chatProvider.setReady(mockApiClient);

            chatProvider['_pendingToolConfirmation'] = {
                'tool-1': 'undecided',
            };
            chatProvider['_pendingToolConfirmationLeft'] = 1;

            await chatProvider.signalToolRequestChoiceSubmit('tool-1', 'allow');

            expect(mockApiClient.resumeToolCall).toHaveBeenCalledWith({
                'tool-1': 'allow',
            });
            expect(chatProvider['_pendingToolConfirmation']).toEqual({});
        });

        it('should wait for all tool choices before resuming', async () => {
            await chatProvider.setReady(mockApiClient);

            chatProvider['_pendingToolConfirmation'] = {
                'tool-1': 'undecided',
                'tool-2': 'undecided',
            };
            chatProvider['_pendingToolConfirmationLeft'] = 2;

            await chatProvider.signalToolRequestChoiceSubmit('tool-1', 'allow');

            expect(mockApiClient.resumeToolCall).not.toHaveBeenCalled();

            await chatProvider.signalToolRequestChoiceSubmit('tool-2', 'deny');

            expect(mockApiClient.resumeToolCall).toHaveBeenCalledWith({
                'tool-1': 'allow',
                'tool-2': 'deny',
            });
        });
    });

    describe('signalToolRequestAllowAll', () => {
        it('should allow all pending tool confirmations', async () => {
            await chatProvider.setReady(mockApiClient);
            chatProvider['_pendingToolConfirmation'] = {
                'tool-1': 'undecided',
                'tool-2': 'undecided',
            };
            chatProvider['_pendingToolConfirmationLeft'] = 2;

            await chatProvider.signalToolRequestAllowAll();

            expect(mockApiClient.resumeToolCall).toHaveBeenCalledWith({
                'tool-1': 'allow',
                'tool-2': 'allow',
            });
            expect(chatProvider['_pendingToolConfirmationLeft']).toBe(0);
        });

        it('should do nothing if no pending confirmations', async () => {
            await chatProvider.signalToolRequestAllowAll();

            expect(mockApiClient.resumeToolCall).not.toHaveBeenCalled();
        });

        it('should only change undecided tools', async () => {
            await chatProvider.setReady(mockApiClient);

            chatProvider['_pendingToolConfirmation'] = {
                'tool-1': 'undecided',
                'tool-2': 'allow',
                'tool-3': 'undecided',
            };
            chatProvider['_pendingToolConfirmationLeft'] = 2;

            await chatProvider.signalToolRequestAllowAll();

            expect(mockApiClient.resumeToolCall).toHaveBeenCalledWith({
                'tool-1': 'allow',
                'tool-2': 'allow',
                'tool-3': 'allow',
            });
        });
    });

    describe('signalMessageRendered', () => {
        it('should track render time for matching prompt ID', () => {
            const mockStartTime = 1000;
            chatProvider['_lastMessageSentTime'] = mockStartTime;
            chatProvider['_currentPromptId'] = 'test-prompt-id';

            jest.spyOn(performance, 'now').mockReturnValue(1500);

            chatProvider.signalMessageRendered('test-prompt-id');

            expect(mockTelemetryProvider.perfLogger.promptLastMessageRendered).toHaveBeenCalledWith(
                'test-prompt-id',
                500,
            );
            expect(chatProvider['_lastMessageSentTime']).toBeUndefined();
        });

        it('should not track render time for non-matching prompt ID', () => {
            chatProvider['_lastMessageSentTime'] = 1000;
            chatProvider['_currentPromptId'] = 'test-prompt-id';

            chatProvider.signalMessageRendered('different-prompt-id');

            expect(mockTelemetryProvider.perfLogger.promptLastMessageRendered).not.toHaveBeenCalled();
            expect(chatProvider['_lastMessageSentTime']).toBe(1000);
        });

        it('should not track if no last message time', () => {
            chatProvider['_lastMessageSentTime'] = undefined;
            chatProvider['_currentPromptId'] = 'test-prompt-id';

            chatProvider.signalMessageRendered('test-prompt-id');

            expect(mockTelemetryProvider.perfLogger.promptLastMessageRendered).not.toHaveBeenCalled();
        });
    });

    describe('yoloMode', () => {
        it('should set yolo mode', () => {
            chatProvider.yoloMode = true;
            expect(chatProvider.yoloMode).toBe(true);
        });

        it('should allow all pending tool confirmations when enabled', async () => {
            await chatProvider.setReady(mockApiClient);

            // Set up pending tool confirmations
            chatProvider['_pendingToolConfirmation'] = {
                'tool-1': 'undecided',
                'tool-2': 'undecided',
            };
            chatProvider['_pendingToolConfirmationLeft'] = 2;

            // Enable yolo mode
            chatProvider.yoloMode = true;

            expect(mockApiClient.resumeToolCall).toHaveBeenCalledWith({
                'tool-1': 'allow',
                'tool-2': 'allow',
            });
            expect(chatProvider['_pendingToolConfirmationLeft']).toBe(0);
        });
    });

    describe('executeChat', () => {
        beforeEach(async () => {
            await chatProvider.setReady(mockApiClient);
        });

        it('should not execute if text is empty', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: '',
                enable_deep_plan: false,
                context: [],
            };

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockApiClient.chat).not.toHaveBeenCalled();
        });

        it('should filter out disabled file context', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [
                    {
                        contextType: 'file',
                        isFocus: false,
                        enabled: true,
                        file: { name: 'file1.ts', absolutePath: '/path/file1.ts' },
                    },
                    {
                        contextType: 'file',
                        isFocus: false,
                        enabled: false,
                        file: { name: 'file2.ts', absolutePath: '/path/file2.ts' },
                    },
                ],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.arrayContaining([expect.objectContaining({ file_path: '/path/file1.ts' })]),
                }),
                true,
                expect.any(AbortSignal),
            );

            const callArgs = mockApiClient.chat.mock.calls[0][0] as any;
            expect(callArgs.context).toHaveLength(1);
        });

        it('should disable deep plan for commands', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: '/status',
                enable_deep_plan: true,
                context: [
                    {
                        contextType: 'file',
                        isFocus: false,
                        enabled: true,
                        file: { name: 'file1.ts', absolutePath: '/path/file1.ts' },
                    },
                ],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    enable_deep_plan: false,
                    context: [],
                }),
                true,
                expect.any(AbortSignal),
            );
        });

        it('should add fullcontext prefix when fullContextMode is enabled', async () => {
            chatProvider.fullContextMode = true;

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'use fullcontext: test prompt',
                }),
                true,
                expect.any(AbortSignal),
            );
        });

        it('should add reverted files to context', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, ['/path/file1.ts', '/path/file2.ts']);

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'file',
                            file_path: '/path/file1.ts',
                            note: 'I have reverted the changes you have done on this file',
                        }),
                        expect.objectContaining({
                            type: 'file',
                            file_path: '/path/file2.ts',
                            note: 'I have reverted the changes you have done on this file',
                        }),
                    ]),
                }),
                true,
                expect.any(AbortSignal),
            );
        });

        it('should signal prompt sent to webview', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: true,
                context: [],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: RovoDevProviderMessageType.SignalPromptSent,
                    text: 'test prompt',
                    enable_deep_plan: true,
                    echoMessage: true,
                }),
            );
        });

        it('should fire telemetry event when prompt is sent', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: true,
                context: [],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockTelemetryProvider.startNewPrompt).toHaveBeenCalledWith('test-uuid-123');
            expect(mockTelemetryProvider.fireTelemetryEvent).toHaveBeenCalledWith({
                action: 'rovoDevPromptSent',
                subject: 'atlascode',
                attributes: {
                    promptId: 'test-uuid-123',
                    deepPlanEnabled: true,
                },
            });
        });

        it('should pend the prompt if API client is not ready', async () => {
            const providerWithoutClient = new RovoDevChatProvider(false, mockTelemetryProvider);
            providerWithoutClient.setWebview(mockWebview);

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            await providerWithoutClient.executeChat(mockPrompt, []);

            expect(providerWithoutClient.isPromptPending).toBe(true);
            expect(mockApiClient.chat).not.toHaveBeenCalled();
        });

        it('should process Jira context correctly', async () => {
            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [
                    {
                        contextType: 'jiraWorkItem',
                        name: 'JIRA-123',
                        url: 'https://jira.example.com/browse/JIRA-123',
                    },
                ],
            };

            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"event_kind": "close"}\n\n'));
                    controller.close();
                },
            });
            const mockResponse = { body: mockReadableStream } as Response;
            mockApiClient.chat.mockResolvedValue(mockResponse);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'jiraWorkItem',
                            content: 'https://jira.example.com/browse/JIRA-123',
                        }),
                    ]),
                }),
                true,
                expect.any(AbortSignal),
            );
        });

        it('should trigger unauthorized callback on 401 error', async () => {
            const mockUnauthorizedCallback = jest.fn();
            chatProvider.setOnUnauthorizedCallback(mockUnauthorizedCallback);

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            // Import RovoDevApiError properly
            const { RovoDevApiError } = await import('./client/rovoDevApiClient');
            const unauthorizedError = new RovoDevApiError('Unauthorized', 401, undefined);
            mockApiClient.chat.mockRejectedValue(unauthorizedError);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockUnauthorizedCallback).toHaveBeenCalled();
        });

        it('should trigger unauthorized callback on 403 error', async () => {
            const mockUnauthorizedCallback = jest.fn();
            chatProvider.setOnUnauthorizedCallback(mockUnauthorizedCallback);

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            // Import RovoDevApiError properly
            const { RovoDevApiError } = await import('./client/rovoDevApiClient');
            const forbiddenError = new RovoDevApiError('Forbidden', 403, undefined);
            mockApiClient.chat.mockRejectedValue(forbiddenError);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockUnauthorizedCallback).toHaveBeenCalled();
        });

        it('should trigger unauthorized callback when stack trace contains UnauthorizedError', async () => {
            const mockUnauthorizedCallback = jest.fn();
            chatProvider.setOnUnauthorizedCallback(mockUnauthorizedCallback);

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            // Create an error with "UnauthorizedError" in the stack trace
            const errorWithUnauthorizedInStack = new Error('Some error message');
            errorWithUnauthorizedInStack.stack = `Error: Some error message
    at Object.<anonymous> (/path/to/file.ts:123:45)
    at UnauthorizedError: Token expired
    at processError (/path/to/process.ts:67:89)`;
            mockApiClient.chat.mockRejectedValue(errorWithUnauthorizedInStack);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockUnauthorizedCallback).toHaveBeenCalled();
        });

        it('should not trigger unauthorized callback on other errors', async () => {
            const mockUnauthorizedCallback = jest.fn();
            chatProvider.setOnUnauthorizedCallback(mockUnauthorizedCallback);

            const mockPrompt: RovoDevPrompt = {
                text: 'test prompt',
                enable_deep_plan: false,
                context: [],
            };

            const genericError = new Error('Generic error');
            mockApiClient.chat.mockRejectedValue(genericError);

            await chatProvider.executeChat(mockPrompt, []);

            expect(mockUnauthorizedCallback).not.toHaveBeenCalled();
            // Should still show error dialog
            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: RovoDevProviderMessageType.ShowDialog,
                }),
            );
        });
    });
});
