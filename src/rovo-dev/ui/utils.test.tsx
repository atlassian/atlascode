import { RovoDevToolCallResponse, RovoDevToolReturnResponse } from 'src/rovo-dev/client';

import { appendResponse, ChatMessage } from './utils';
import { Response } from './utils';

describe('appendResponse', () => {
    const mockHandleAppendModifiedFileToolReturns = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return prev when response is null', () => {
        const prev: Response[] = [{ event_kind: '_RovoDevUserPrompt', content: 'test' }];
        const result = appendResponse(prev, null, mockHandleAppendModifiedFileToolReturns, true);
        expect(result).toEqual(prev);
    });

    it('should append streaming RovoDev text to existing RovoDev message', () => {
        const prev: Response[] = [{ event_kind: 'text', content: 'Hello ', index: 0 }];
        const response = { event_kind: 'text', content: 'world', index: 0 } as const;

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ event_kind: 'text', content: 'Hello world', index: 0 });
    });

    it('should not append streaming text when sources differ', () => {
        const prev: Response[] = [{ event_kind: '_RovoDevUserPrompt', content: 'Hello' }];
        const response = { event_kind: 'text', content: 'world', index: 0 } as const;

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ event_kind: '_RovoDevUserPrompt', content: 'Hello' });
        expect(result[1]).toEqual({ event_kind: 'text', content: 'world', index: 0 });
    });

    it('should group ToolReturn with previous message when groupable', () => {
        const toolCallMessage1: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'grep',
            args: 'args1',
            tool_call_id: 'id1',
        };
        const toolCallMessage2: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'bash',
            args: 'args1',
            tool_call_id: 'id2',
        };

        const prev: Response[] = [
            {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'prev result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage: toolCallMessage1,
            },
        ];
        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'bash',
            content: 'result',
            tool_call_id: 'id2',
            timestamp: '0',
            toolCallMessage: toolCallMessage2,
        };

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(mockHandleAppendModifiedFileToolReturns).toHaveBeenCalledWith(response);
        expect(result).toHaveLength(1);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0]).toHaveLength(2);
    });

    it('should not group ToolReturn when latest is a user prompt', () => {
        const toolCallMessage: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'bash',
            args: 'args1',
            tool_call_id: 'id1',
        };

        const prev: Response[] = [{ event_kind: '_RovoDevUserPrompt', content: 'user message' }];
        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'bash',
            content: 'result',
            tool_call_id: 'id1',
            timestamp: '0',
            toolCallMessage,
        };

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ event_kind: '_RovoDevUserPrompt', content: 'user message' });
        expect(Array.isArray(result[1])).toBe(true);
        expect(result[1]).toHaveLength(1);
    });

    it('should not group ToolReturn when latest is RovoDevDialog message', () => {
        const toolCallMessage: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'bash',
            args: 'args1',
            tool_call_id: 'id1',
        };

        const prev: Response[] = [
            {
                event_kind: '_RovoDevDialog',
                type: 'error',
                text: 'error',
                isRetriable: false,
                uid: 'uid',
            },
        ];
        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'bash',
            content: 'result',
            tool_call_id: 'id1',
            timestamp: '0',
            toolCallMessage,
        };

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(Array.isArray(result[1])).toBe(true);
        expect(result[1]).toHaveLength(1);
    });

    it('should handle create_technical_plan as separate message', () => {
        const toolCallMessage: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'create_technical_plan',
            args: 'args1',
            tool_call_id: 'id1',
        };

        const prev: Response[] = [{ event_kind: 'text', content: 'previous', index: 0 }];
        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'create_technical_plan',
            content: 'plan',
            tool_call_id: 'id1',
            timestamp: '0',
            toolCallMessage,
        };

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual(response);
    });

    it('should merge with existing thinking group', () => {
        const toolCallMessage1: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'grep',
            args: 'args1',
            tool_call_id: 'id1',
        };
        const toolCallMessage2: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'grep',
            args: 'args1',
            tool_call_id: 'id2',
        };
        const toolCallMessage3: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'bash',
            args: 'args1',
            tool_call_id: 'id3',
        };
        const existingGroup: ChatMessage[] = [
            {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage: toolCallMessage1,
            },
            {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'result1',
                tool_call_id: 'id2',
                timestamp: '0',
                toolCallMessage: toolCallMessage2,
            },
        ];
        const prev: Response[] = [existingGroup];
        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'bash',
            content: 'result2',
            tool_call_id: 'id3',
            timestamp: '0',
            toolCallMessage: toolCallMessage3,
        };

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(1);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0]).toHaveLength(3);
    });

    it('should handle create_technical_plan when latest is array', () => {
        const toolCallMessage: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'create_technical_plan',
            args: 'args1',
            tool_call_id: 'id2',
        };
        const existingArray: ChatMessage[] = [
            { event_kind: 'tool-call', tool_name: 'grep', args: 'args1', tool_call_id: 'id1' },
        ];
        const prev: Response[] = [existingArray];
        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'create_technical_plan',
            content: 'plan',
            tool_call_id: 'id2',
            timestamp: '0',
            toolCallMessage,
        };

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual(response);
    });

    it('should handle array response when latest exists', () => {
        const toolCallMessage = {
            event_kind: 'tool-call' as const,
            tool_name: 'grep' as const,
            args: 'args1',
            tool_call_id: 'id1',
        };

        const prev: Response[] = [{ event_kind: '_RovoDevUserPrompt', content: 'previous' }];
        const response: ChatMessage[] = [
            toolCallMessage,
            {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'result1',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            },
        ] as const;

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ event_kind: '_RovoDevUserPrompt', content: 'previous' });
        expect(result[1]).toEqual(response);
    });

    it('should handle array response when no latest exists', () => {
        const prev: Response[] = [];
        const response: ChatMessage[] = [
            { event_kind: 'tool-call', tool_name: 'grep', args: 'args1', tool_call_id: 'id1' },
        ] as const;

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(response[0]);
    });

    it('should handle non-ToolReturn response when latest is array', () => {
        const existingArray: ChatMessage[] = [
            { event_kind: 'tool-call', tool_name: 'grep', args: 'args1', tool_call_id: 'id1' },
        ];
        const prev: Response[] = [existingArray];
        const response = { event_kind: 'text', content: 'new message', index: 0 } as const;

        const result = appendResponse(prev, response, mockHandleAppendModifiedFileToolReturns, true);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(existingArray);
        expect(result[1]).toEqual(response);
    });

    it('should not group ToolReturn when thinkingBlockEnabled is false', () => {
        const toolCallMessage1: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'grep',
            args: 'args1',
            tool_call_id: 'id1',
        };
        const toolCallMessage2: RovoDevToolCallResponse = {
            event_kind: 'tool-call',
            tool_name: 'bash',
            args: 'args1',
            tool_call_id: 'id2',
        };

        const prev: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'grep',
            content: 'prev result',
            tool_call_id: 'id1',
            timestamp: '0',
            toolCallMessage: toolCallMessage1,
        };

        const response: RovoDevToolReturnResponse = {
            event_kind: 'tool-return',
            tool_name: 'bash',
            content: 'result',
            tool_call_id: 'id2',
            timestamp: '0',
            toolCallMessage: toolCallMessage2,
        };

        const result = appendResponse([prev], response, mockHandleAppendModifiedFileToolReturns, false);

        expect(mockHandleAppendModifiedFileToolReturns).toHaveBeenCalledWith(response);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(prev);
        expect(result[1]).toEqual(response);
    });
});

describe('parseToolReturnMessage', () => {
    const { parseToolReturnMessage } = require('./utils');
    const mockOnError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('safe JSON parsing', () => {
        it('should handle malformed JSON in tool args gracefully', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'bash',
                args: '{"command": "incomplete json', // Malformed JSON
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'bash',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            // Should not crash and should return empty result for bash tool without valid command
            expect(result).toEqual([]);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle truncated JSON with missing opening brace', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'grep',
                args: '"content_pattern": "test"}', // Missing opening {
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'match1\nmatch2',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            // Should handle gracefully and still process the content
            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('Searched files');
        });

        it('should handle JSON with multi-byte UTF-8 characters split mid-character', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'bash',
                args: '{"command": "echo 👍"}', // Multi-byte emoji
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'bash',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('echo 👍');
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle empty or undefined args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'expand_folder',
                args: '',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'expand_folder',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('Expanded folder');
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle malformed JSON in create_technical_plan content', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'create_technical_plan',
                args: '{}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'create_technical_plan',
                content: '{"plan": "incomplete', // Malformed JSON
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0].technicalPlan).toBeUndefined();
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle tool-return with valid parsedContent', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'create_technical_plan',
                args: '{}',
                tool_call_id: 'id1',
            };

            const planData = {
                summary: 'Test plan',
                steps: [],
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'create_technical_plan',
                content: '',
                parsedContent: planData,
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0].technicalPlan).toEqual(planData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle MCP tool with malformed args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__atlassian__invoke_tool',
                args: '"tool_name": "test"}', // Missing opening brace
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'mcp__atlassian__invoke_tool',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0].content).toContain('unknown tool');
            expect(mockOnError).not.toHaveBeenCalled();
        });
    });
});
