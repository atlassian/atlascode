import { RovoDevToolCallResponse, RovoDevToolName, RovoDevToolReturnResponse } from 'src/rovo-dev/client';

import { appendResponse, ChatMessage, parseToolReturnMessage } from './utils';
import { Response } from './utils';

describe('appendResponse', () => {
    it('should return prev when response is null', () => {
        const prev: Response[] = [{ event_kind: '_RovoDevUserPrompt', content: 'test' }];
        const result = appendResponse(prev, null, true);
        expect(result).toEqual(prev);
    });

    it('should append streaming RovoDev text to existing RovoDev message', () => {
        const prev: Response[] = [{ event_kind: 'text', content: 'Hello ', index: 0 }];
        const response = { event_kind: 'text', content: 'world', index: 0 } as const;

        const result = appendResponse(prev, response, true);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ event_kind: 'text', content: 'Hello world', index: 0 });
    });

    it('should not append streaming text when sources differ', () => {
        const prev: Response[] = [{ event_kind: '_RovoDevUserPrompt', content: 'Hello' }];
        const response = { event_kind: 'text', content: 'world', index: 0 } as const;

        const result = appendResponse(prev, response, true);

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

        const result = appendResponse(prev, response, true);

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

        const result = appendResponse(prev, response, true);

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

        const result = appendResponse(prev, response, true);

        expect(result).toHaveLength(2);
        expect(Array.isArray(result[1])).toBe(true);
        expect(result[1]).toHaveLength(1);
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

        const result = appendResponse(prev, response, true);

        expect(result).toHaveLength(1);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0]).toHaveLength(3);
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

        const result = appendResponse(prev, response, true);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ event_kind: '_RovoDevUserPrompt', content: 'previous' });
        expect(result[1]).toEqual(response);
    });

    it('should handle array response when no latest exists', () => {
        const prev: Response[] = [];
        const response: ChatMessage[] = [
            { event_kind: 'tool-call', tool_name: 'grep', args: 'args1', tool_call_id: 'id1' },
        ] as const;

        const result = appendResponse(prev, response, true);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(response[0]);
    });

    it('should handle non-ToolReturn response when latest is array', () => {
        const existingArray: ChatMessage[] = [
            { event_kind: 'tool-call', tool_name: 'grep', args: 'args1', tool_call_id: 'id1' },
        ];
        const prev: Response[] = [existingArray];
        const response = { event_kind: 'text', content: 'new message', index: 0 } as const;

        const result = appendResponse(prev, response, true);

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

        const result = appendResponse([prev], response, false);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(prev);
        expect(result[1]).toEqual(response);
    });
});

describe('parseToolReturnMessage', () => {
    const mockOnError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('JSON parsing with type safety', () => {
        it('should handle bash tool with string args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'bash',
                args: '{"command": "npm test"}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'bash',
                content: 'output',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: 'npm test',
                content: 'Executed command',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle bash tool with pre-parsed object args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'bash',
                args: { command: 'npm test' } as any, // Simulating pre-parsed object
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'bash',
                content: 'output',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: 'npm test',
                content: 'Executed command',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle expand_folder tool with string args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'expand_folder',
                args: '{"folder_path": "/src/components"}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'expand_folder',
                content: 'expanded',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: '/src/components',
                content: 'Expanded folder',
                type: 'open',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle expand_folder tool with pre-parsed object args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'expand_folder',
                args: { folder_path: '/src/components' } as any,
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'expand_folder',
                content: 'expanded',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: '/src/components',
                content: 'Expanded folder',
                type: 'open',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle grep tool with string args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'grep',
                args: '{"content_pattern": "TODO", "path_glob": "**/*.ts"}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'file1.ts:10: TODO: fix this\nfile2.ts:25: TODO: refactor',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: '2 matches found',
                content: 'Searched for `TODO` in files matching `**/*.ts`',
                type: 'open',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle grep tool with pre-parsed object args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'grep',
                args: { content_pattern: 'TODO', path_glob: '**/*.ts' } as any,
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'grep',
                content: 'file1.ts:10: TODO: fix this',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: '1 match found',
                content: 'Searched for `TODO` in files matching `**/*.ts`',
                type: 'open',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle MCP tools with string args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__atlassian__invoke_tool',
                args: '{"tool_name": "jira_search"}',
                mcp_server: 'atlassian',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'mcp__atlassian__invoke_tool',
                content: 'results',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Invoked atlassian MCP tool: `jira_search`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle MCP tools with pre-parsed object args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__scout__invoke_tool',
                args: { tool_name: 'search_code' } as any,
                mcp_server: 'scout',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'mcp__scout__invoke_tool',
                content: 'results',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Invoked scout MCP tool: `search_code`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle any MCP invoke_tool via regex matching', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__google_calendar__invoke_tool' as RovoDevToolName,
                args: '{"tool_name": "get_events"}',
                mcp_server: 'google_calendar',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'mcp__google_calendar__invoke_tool' as RovoDevToolName,
                content: 'events',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Invoked google_calendar MCP tool: `get_events`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle any MCP get_tool_schema via regex matching', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__slack__get_tool_schema' as RovoDevToolName,
                args: '{"tool_name": "channel_create_message"}',
                mcp_server: 'slack',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'mcp__slack__get_tool_schema' as RovoDevToolName,
                content: 'schema',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Invoked slack MCP tool: `channel_create_message`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle MCP tools without mcp_server field gracefully', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__compass__invoke_tool' as RovoDevToolName,
                args: '{"tool_name": "component_search"}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'mcp__compass__invoke_tool' as RovoDevToolName,
                content: 'results',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Invoked MCP tool: `component_search`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should not match non-MCP tool names with similar patterns', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'not_mcp__something__invoke_tool' as RovoDevToolName,
                args: '{}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'not_mcp__something__invoke_tool' as RovoDevToolName,
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'not_mcp__something__invoke_tool',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle parse errors gracefully and call onError', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'bash',
                args: 'invalid json{',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'bash',
                content: 'output',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'bash',
            });
            expect(mockOnError).toHaveBeenCalledWith(
                expect.any(Error),
                'Error parsing ToolReturnMessage for tool bash',
            );
        });
    });
});
