import { RovoDevToolCallResponse, RovoDevToolReturnResponse } from 'src/rovo-dev/client';

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
                content: 'Invoked MCP tool: `jira_search`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle MCP tools with pre-parsed object args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'mcp__scout__invoke_tool',
                args: { tool_name: 'search_code' } as any,
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
                content: 'Invoked MCP tool: `search_code`',
                type: 'bash',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should return individual subagent tasks for invoke_subagents tool', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: '{"subagent_names": ["Explore", "General Purpose"], "task_names": ["Find UI components", "Fix auth bug"], "task_descriptions": ["desc1", "desc2"]}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: 'Subagent results here',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                content: 'Subagent: Explore',
                title: 'Find UI components',
                type: 'subagents',
            });
            expect(result[1]).toEqual({
                content: 'Subagent: General Purpose',
                title: 'Fix auth bug',
                type: 'subagents',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should return empty array for invoke_subagents with no args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: '{}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: '',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(0);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle invoke_subagents with a single subagent', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: '{"subagent_names": ["Explore"], "task_names": ["Find config files"], "task_descriptions": ["Search for configuration"]}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Subagent: Explore',
                title: 'Find config files',
                type: 'subagents',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle invoke_subagents with mismatched array lengths (more names than tasks)', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: '{"subagent_names": ["Explore", "General Purpose", "Domain Research"], "task_names": ["Task 1"], "task_descriptions": ["desc1"]}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                content: 'Subagent: Explore',
                title: 'Task 1',
                type: 'subagents',
            });
            expect(result[1]).toEqual({
                content: 'Subagent: General Purpose',
                title: '',
                type: 'subagents',
            });
            expect(result[2]).toEqual({
                content: 'Subagent: Domain Research',
                title: '',
                type: 'subagents',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle invoke_subagents with pre-parsed object args', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: { subagent_names: ['Explore'], task_names: ['Analyze code'], task_descriptions: ['desc'] } as any,
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'Subagent: Explore',
                title: 'Analyze code',
                type: 'subagents',
            });
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle invoke_subagents with empty arrays', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: '{"subagent_names": [], "task_names": [], "task_descriptions": []}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: '',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(0);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle invoke_subagents with only subagent_names (no task_names)', () => {
            const toolCallMessage: RovoDevToolCallResponse = {
                event_kind: 'tool-call',
                tool_name: 'invoke_subagents',
                args: '{"subagent_names": ["Explore", "General Purpose"]}',
                tool_call_id: 'id1',
            };

            const msg: RovoDevToolReturnResponse = {
                event_kind: 'tool-return',
                tool_name: 'invoke_subagents',
                content: 'result',
                tool_call_id: 'id1',
                timestamp: '0',
                toolCallMessage,
            };

            const result = parseToolReturnMessage(msg, mockOnError);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                content: 'Subagent: Explore',
                title: '',
                type: 'subagents',
            });
            expect(result[1]).toEqual({
                content: 'Subagent: General Purpose',
                title: '',
                type: 'subagents',
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
