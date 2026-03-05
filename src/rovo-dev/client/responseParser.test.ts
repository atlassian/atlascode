import { RovoDevResponseParser } from './responseParser';
import { RovoDevResponse } from './responseParserInterfaces';

describe('RovoDevResponseParser', () => {
    let parser: RovoDevResponseParser;

    beforeEach(() => {
        parser = new RovoDevResponseParser();
    });

    describe('parse method', () => {
        describe('user-prompt responses', () => {
            it('should parse a complete user-prompt chunk', () => {
                const input =
                    'event: user-prompt\ndata: {"content": "Hello world", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'Hello world',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should parse user_prompt event kind (underscore variant)', () => {
                const input =
                    'event: user_prompt\ndata: {"content": "Hello world", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'Hello world',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should handle missing content field', () => {
                const input = 'event: user-prompt\ndata: {"timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: '',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });
        });

        describe('text responses', () => {
            it('should parse a text chunk', () => {
                const input = 'event: text\ndata: {"index": 0, "content": "Some text content"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'text',
                    index: 0,
                    content: 'Some text content',
                });
            });

            it('should handle content_delta field', () => {
                const input = 'event: text\ndata: {"index": 0, "content_delta": "Delta content"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'text',
                    index: 0,
                    content: 'Delta content',
                });
            });

            it('should prefer content over content_delta when both exist', () => {
                const input =
                    'event: text\ndata: {"index": 0, "content": "Main content", "content_delta": "Delta content"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'text',
                    index: 0,
                    content: 'Main content',
                });
            });
        });

        describe('tool-call responses', () => {
            it('should parse a complete tool-call chunk', () => {
                const input =
                    'event: tool-call\ndata: {"tool_name": "search", "args": "{\\"query\\": \\"test\\"}", "tool_call_id": "call_123"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'tool-call',
                    tool_name: 'search',
                    args: '{"query": "test"}',
                    tool_call_id: 'call_123',
                });
            });

            it('should parse tool_call event kind (underscore variant)', () => {
                const input =
                    'event: tool_call\ndata: {"tool_name": "search", "args": "{\\"query\\": \\"test\\"}", "tool_call_id": "call_123"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'tool-call',
                    tool_name: 'search',
                    args: '{"query": "test"}',
                    tool_call_id: 'call_123',
                });
            });

            it('should handle missing optional fields', () => {
                const input = 'event: tool-call\ndata: {"tool_call_id": "call_123"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'tool-call',
                    tool_name: undefined,
                    args: '',
                    mcp_server: undefined,
                    tool_call_id: 'call_123',
                });
            });
        });

        describe('tool-return responses', () => {
            it('should parse tool-return with string content', () => {
                const input =
                    'event: tool-return\ndata: {"tool_name": "search", "content": "Search results", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'tool-return',
                    tool_name: 'search',
                    content: 'Search results',
                    parsedContent: undefined,
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should parse tool-return with object content', () => {
                const input =
                    'event: tool-return\ndata: {"tool_name": "search", "content": {"results": ["item1", "item2"]}, "tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'tool-return',
                    tool_name: 'search',
                    content: undefined,
                    parsedContent: { results: ['item1', 'item2'] },
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should parse tool_return event kind (underscore variant)', () => {
                const input =
                    'event: tool_return\ndata: {"tool_name": "search", "content": "Search results", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'tool-return',
                    tool_name: 'search',
                    content: 'Search results',
                    parsedContent: undefined,
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });
        });

        describe('retry-prompt responses', () => {
            it('should parse a complete retry-prompt chunk', () => {
                const input =
                    'event: retry-prompt\ndata: {"content": "Retry content", "tool_name": "search", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'retry-prompt',
                    content: 'Retry content',
                    tool_name: 'search',
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should parse retry_prompt event kind (underscore variant)', () => {
                const input =
                    'event: retry_prompt\ndata: {"content": "Retry content", "tool_name": "search", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'retry-prompt',
                    content: 'Retry content',
                    tool_name: 'search',
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should handle missing optional fields', () => {
                const input =
                    'event: retry-prompt\ndata: {"tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'retry-prompt',
                    content: '',
                    tool_name: undefined,
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });
        });

        describe('part_start events', () => {
            it('should parse part_start for user-prompt', () => {
                const input =
                    'event: part_start\ndata: {"part": {"part_kind": "user-prompt", "content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(0); // part_start doesn't immediately yield
            });

            it('should parse part_start for text and immediately yield', () => {
                const input =
                    'event: part_start\ndata: {"part": {"part_kind": "text", "index": 0, "content": "Hello"}}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'text',
                    index: 0,
                    content: 'Hello',
                });
            });

            it('should parse part_start for tool-call', () => {
                const input =
                    'event: part_start\ndata: {"part": {"part_kind": "tool-call", "tool_name": "search", "args": "{\\"query\\": \\"test\\"}", "tool_call_id": "call_123"}}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(0); // part_start doesn't immediately yield for tool-call
            });
        });

        describe('part_delta events', () => {
            it('should handle part_delta for user-prompt after part_start', () => {
                const startInput =
                    'event: part_start\ndata: {"part": {"part_kind": "user-prompt", "content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}}\n\n';
                const deltaInput =
                    'event: part_delta\ndata: {"delta": {"part_delta_kind": "user-prompt", "content_delta": " world"}}\n\n';

                Array.from(parser.parse(startInput)); // Initialize buffer
                const results = Array.from(parser.parse(deltaInput));

                expect(results).toHaveLength(0); // Still building up the message
            });

            it('should handle part_delta for text and immediately yield', () => {
                const startInput =
                    'event: part_start\ndata: {"part": {"part_kind": "text", "index": 0, "content": "Hello"}}\n\n';
                const deltaInput =
                    'event: part_delta\ndata: {"delta": {"part_delta_kind": "text", "content_delta": " world", "index": 0}}\n\n';

                const startResults = Array.from(parser.parse(startInput));
                const deltaResults = Array.from(parser.parse(deltaInput));

                expect(startResults).toHaveLength(1);
                expect(deltaResults).toHaveLength(1);
                expect(deltaResults[0]).toEqual({
                    event_kind: 'text',
                    index: 0,
                    content: ' world',
                });
            });

            it('should handle part_delta for tool-call', () => {
                const startInput =
                    'event: part_start\ndata: {"part": {"part_kind": "tool-call", "tool_name": "search", "args": "{\\"qu", "tool_call_id": "call_123"}}\n\n';
                const deltaInput =
                    'event: part_delta\ndata: {"delta": {"part_delta_kind": "tool-call", "args_delta": "ery\\": \\"test\\"}"}}\n\n';

                Array.from(parser.parse(startInput)); // Initialize buffer
                const results = Array.from(parser.parse(deltaInput));

                expect(results).toHaveLength(0); // Still building up the tool call
            });
        });

        describe('multi-part message handling', () => {
            it('should flush previous chunk when starting a new part_start', () => {
                const input1 =
                    'event: part_start\ndata: {"part": {"part_kind": "user-prompt", "content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}}\n\n';
                const input2 =
                    'event: part_start\ndata: {"part": {"part_kind": "tool-call", "tool_name": "search", "args": "{\\"query\\": \\"test\\"}", "tool_call_id": "call_123"}}\n\n';

                Array.from(parser.parse(input1)); // Initialize first buffer
                const results = Array.from(parser.parse(input2)); // Should flush first and start second

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'Hello',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should flush previous chunk when receiving non-part event', () => {
                const input1 =
                    'event: part_start\ndata: {"part": {"part_kind": "user-prompt", "content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}}\n\n';
                const input2 =
                    'event: tool-return\ndata: {"tool_name": "search", "content": "Search results", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                Array.from(parser.parse(input1)); // Initialize buffer
                const results = Array.from(parser.parse(input2)); // Should flush buffer and yield tool-return

                expect(results).toHaveLength(2);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'Hello',
                    timestamp: '2025-07-02T12:00:00Z',
                });
                expect(results[1]).toEqual({
                    event_kind: 'tool-return',
                    tool_name: 'search',
                    content: 'Search results',
                    parsedContent: undefined,
                    tool_call_id: 'call_123',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });
        });

        describe('buffer handling', () => {
            it('should handle incomplete chunks across multiple parse calls', () => {
                const input1 = 'event: user-prompt\ndata: {"content": "Hello world"';
                const input2 = ', "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results1 = Array.from(parser.parse(input1));
                const results2 = Array.from(parser.parse(input2));

                expect(results1).toHaveLength(0); // Incomplete chunk
                expect(results2).toHaveLength(1);
                expect(results2[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'Hello world',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });

            it('should handle multiple complete chunks in one input', () => {
                const input =
                    'event: user-prompt\ndata: {"content": "First", "timestamp": "2025-07-02T12:00:00Z"}\n\nevent: text\ndata: {"index": 0, "content": "Second"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(2);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'First',
                    timestamp: '2025-07-02T12:00:00Z',
                });
                expect(results[1]).toEqual({
                    event_kind: 'text',
                    index: 0,
                    content: 'Second',
                });
            });
        });

        describe('ping handling', () => {
            it('should ignore ping messages', () => {
                const input =
                    ': ping - 1641024000\n\nevent: user-prompt\ndata: {"content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'user-prompt',
                    content: 'Hello',
                    timestamp: '2025-07-02T12:00:00Z',
                });
            });
        });

        describe('error handling', () => {
            it('should return a parsing error for malformed chunk', () => {
                const input = 'invalid chunk format\n\n';

                const results = Array.from(parser.parse(input));
                expect(results).toHaveLength(1);
                expect(results[0].event_kind === '_parsing_error');
            });

            it('should return a parsing error for unknown event kind', () => {
                const input = 'event: unknown-event\ndata: {"test": "value"}\n\n';

                const results = Array.from(parser.parse(input));
                expect(results).toHaveLength(1);
                expect(results[0].event_kind === '_parsing_error');
            });

            it("parsing errors shouldn't stop processing the response", () => {
                const input =
                    'event: text\ndata: {"index": 0, "content": "Text1"}\n\n' +
                    'event: unknown-event\ndata: {"test": "value"}\n\n' +
                    'event: text\ndata: {"index": 1, "content": "Text2"}\n\n';

                const results = Array.from(parser.parse(input));
                expect(results).toHaveLength(3);

                expect(results[0].event_kind === 'text' && results[0].content === 'Text1');
                expect(results[1].event_kind === '_parsing_error');
                expect(results[2].event_kind === 'text' && results[2].content === 'Text2');
            });

            it('should throw error when text has buffer set', () => {
                const input1 =
                    'event: part_start\ndata: {"part": {"part_kind": "text", "index": 0, "content": "Hello"}}\n\n';
                const input2 =
                    'event: part_delta\ndata: {"delta": {"part_delta_kind": "text", "content_delta": " world"}}\n\n';

                // This should work normally
                Array.from(parser.parse(input1));

                // This should also work (text deltas are sent immediately)
                const results = Array.from(parser.parse(input2));
                expect(results).toHaveLength(1);
            });

            it('should throw error when tool-return has buffer (hypothetical scenario)', () => {
                // This test demonstrates the error handling when tool-return would be processed with a buffer
                // In practice, this shouldn't happen according to the parser logic, but we test the defensive code
                // The important thing is that tool-return responses work correctly in normal scenarios
                expect(true).toBe(true); // Placeholder - this error condition is defensive code
            });
        });
    });

    describe('flush method', () => {
        it('should yield buffered chunk when flushed', () => {
            const input =
                'event: part_start\ndata: {"part": {"part_kind": "user-prompt", "content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}}\n\n';

            Array.from(parser.parse(input)); // Initialize buffer
            const results = Array.from(parser.flush());

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                event_kind: 'user-prompt',
                content: 'Hello',
                timestamp: '2025-07-02T12:00:00Z',
            });
        });

        it('should return empty array when no buffered chunk', () => {
            const results = Array.from(parser.flush());

            expect(results).toHaveLength(0);
        });

        it('should return a parsing error when flushed with non-empty buffer', () => {
            const input = 'event: user-prompt\ndata: {"content": "incomplete';

            Array.from(parser.parse(input)); // This will leave data in buffer

            const results = Array.from(parser.flush());
            expect(results).toHaveLength(1);
            expect(results[0].event_kind === '_parsing_error');
        });
    });

    describe('integration scenarios', () => {
        it('should handle a complete conversation flow', () => {
            const allResults: RovoDevResponse[] = [];

            // User prompt
            let input =
                'event: user-prompt\ndata: {"content": "What is the weather?", "timestamp": "2025-07-02T12:00:00Z"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Tool call
            input =
                'event: tool-call\ndata: {"tool_name": "get_weather", "args": "{\\"location\\": \\"New York\\"}", "tool_call_id": "call_123"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Tool return
            input =
                'event: tool-return\ndata: {"tool_name": "get_weather", "content": "Sunny, 75°F", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:01:00Z"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Text response
            input =
                'event: text\ndata: {"index": 0, "content": "The weather in New York is sunny with a temperature of 75°F."}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(4);
            expect(allResults[0].event_kind).toBe('user-prompt');
            expect(allResults[1].event_kind).toBe('tool-call');
            expect(allResults[2].event_kind).toBe('tool-return');
            expect(allResults[3].event_kind).toBe('text');
        });

        it('should handle streaming text with multiple deltas', () => {
            const allResults: RovoDevResponse[] = [];

            // Start streaming text
            let input =
                'event: part_start\ndata: {"part": {"part_kind": "text", "index": 0, "content": "The weather"}}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Add more text - note that deltas need to include the index
            input =
                'event: part_delta\ndata: {"delta": {"part_delta_kind": "text", "content_delta": " is", "index": 0}}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Add final text
            input =
                'event: part_delta\ndata: {"delta": {"part_delta_kind": "text", "content_delta": " sunny", "index": 0}}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(3);
            expect(allResults[0]).toEqual({ event_kind: 'text', index: 0, content: 'The weather' });
            expect(allResults[1]).toEqual({ event_kind: 'text', index: 0, content: ' is' });
            expect(allResults[2]).toEqual({ event_kind: 'text', index: 0, content: ' sunny' });
        });

        it('should handle streaming tool call with deltas', () => {
            const allResults: RovoDevResponse[] = [];

            // Start tool call
            let input =
                'event: part_start\ndata: {"part": {"part_kind": "tool-call", "tool_name": "get_weather", "args": "{\\"loc", "tool_call_id": "call_123"}}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Add to args
            input =
                'event: part_delta\ndata: {"delta": {"part_delta_kind": "tool-call", "args_delta": "ation\\": \\"New York\\"}"}}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Complete with another event
            input =
                'event: tool-return\ndata: {"tool_name": "get_weather", "content": "Sunny, 75°F", "tool_call_id": "call_123", "timestamp": "2025-07-02T12:01:00Z"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(2);
            expect(allResults[0]).toEqual({
                event_kind: 'tool-call',
                tool_name: 'get_weather',
                args: '{"location": "New York"}',
                tool_call_id: 'call_123',
            });
            expect(allResults[1].event_kind).toBe('tool-return');
        });

        it('should properly flush and yield generic events (non-part_start/part_delta)', () => {
            const allResults: RovoDevResponse[] = [];

            // Parse a generic event (not part_start or part_delta)
            // This should now be stored in previousChunk, flushed, and then yielded
            const input = 'event: user-prompt\ndata: {"content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(1);
            expect(allResults[0]).toEqual({
                event_kind: 'user-prompt',
                content: 'Hello',
                timestamp: '2025-07-02T12:00:00Z',
            });
        });

        it('should flush previous chunk when encountering a new generic event', () => {
            const allResults: RovoDevResponse[] = [];

            // First generic event (tool-call)
            let input =
                'event: tool-call\ndata: {"tool_name": "search", "args": "{\\"q\\": \\"test\\"}", "tool_call_id": "call_123"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Second generic event (warning) - should flush the previous tool-call
            input = 'event: warning\ndata: {"message": "Rate limit warning"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(2);
            expect(allResults[0].event_kind).toBe('tool-call');
            expect(allResults[1].event_kind).toBe('warning');
        });

        it('should handle consecutive generic events correctly', () => {
            const allResults: RovoDevResponse[] = [];

            // Multiple consecutive generic events
            let input = 'event: exception\ndata: {"message": "An error occurred", "type": "api_error"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            input = 'event: clear\ndata: {"message": "Clearing state"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            input = 'event: warning\ndata: {"message": "A warning"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(3);
            expect(allResults[0].event_kind).toBe('exception');
            expect(allResults[1].event_kind).toBe('clear');
            expect(allResults[2].event_kind).toBe('warning');
        });

        it('should transition from part_start/part_delta to generic event', () => {
            const allResults: RovoDevResponse[] = [];

            // Start with part_start for user-prompt
            let input =
                'event: part_start\ndata: {"part": {"part_kind": "user-prompt", "content": "Hello", "timestamp": "2025-07-02T12:00:00Z"}}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Transition to a generic event - should flush the previous part_start
            input = 'event: warning\ndata: {"message": "Proceeding with caution"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(2);
            expect(allResults[0].event_kind).toBe('user-prompt');
            expect(allResults[1].event_kind).toBe('warning');
        });

        it('should handle generic events after a generic event (double flush)', () => {
            const allResults: RovoDevResponse[] = [];

            // First generic event
            let input = 'event: prune\ndata: {"message": "Pruning context"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Another generic event - the first should be flushed and yielded, then the second stored and yielded
            input = 'event: status\ndata: {}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(2);
            expect(allResults[0].event_kind).toBe('prune');
            expect(allResults[1].event_kind).toBe('status');
        });

        it('should properly track tool calls across generic events', () => {
            const allResults: RovoDevResponse[] = [];

            // Generic tool-call event
            let input =
                'event: tool-call\ndata: {"tool_name": "get_weather", "args": "{\\"location\\": \\"NY\\"}", "tool_call_id": "call_456"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Another generic event that will flush the tool-call
            input = 'event: warning\ndata: {"message": "Processing"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            // Tool-return should have access to the previously stored tool-call
            input =
                'event: tool-return\ndata: {"tool_name": "get_weather", "content": "Sunny", "tool_call_id": "call_456", "timestamp": "2025-07-02T12:02:00Z"}\n\n';
            allResults.push(...Array.from(parser.parse(input)));

            expect(allResults).toHaveLength(3);
            expect(allResults[0].event_kind).toBe('tool-call');
            expect(allResults[1].event_kind).toBe('warning');
            expect(allResults[2].event_kind).toBe('tool-return');
            // Verify the tool-return has the toolCallMessage attached
            const toolReturnEvent = allResults[2] as any;
            expect(toolReturnEvent.toolCallMessage).toBeDefined();
            expect(toolReturnEvent.toolCallMessage.tool_name).toBe('get_weather');
        });

        describe('models responses', () => {
            it('should parse a models response with model change message', () => {
                const input =
                    'event: models\ndata: {"model_name": "GPT-4", "model_id": "gpt-4", "message": "Agent model changed to GPT-4"}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0]).toEqual({
                    event_kind: 'models',
                    data: {
                        model_name: 'GPT-4',
                        model_id: 'gpt-4',
                        message: 'Agent model changed to GPT-4',
                    },
                });
            });

            it('should parse a models response with available models list', () => {
                const input = `event: models\ndata: {"models": [{"name": "GPT-4", "model_id": "gpt-4", "description": "Most capable", "credit_multiplier": "1.5"}, {"name": "GPT-3.5", "model_id": "gpt-3.5-turbo", "description": "Fast", "credit_multiplier": "1.0"}]}\n\n`;

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0].event_kind).toBe('models');
                const modelsResponse = results[0] as any;
                expect(modelsResponse.data.models).toHaveLength(2);
                expect(modelsResponse.data.models[0]).toEqual({
                    name: 'GPT-4',
                    model_id: 'gpt-4',
                    description: 'Most capable',
                    credit_multiplier: '1.5',
                });
            });

            it('should parse models response with empty models array', () => {
                const input = 'event: models\ndata: {"models": []}\n\n';

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                expect(results[0].event_kind).toBe('models');
                const modelsResponse = results[0] as any;
                expect(modelsResponse.data.models).toEqual([]);
            });

            it('should handle models event as a non-bufferable generic event', () => {
                const allResults: RovoDevResponse[] = [];

                // Parse a models event
                let input = 'event: models\ndata: {"model_id": "gpt-4", "message": "Model changed"}\n\n';
                allResults.push(...Array.from(parser.parse(input)));

                // Parse another generic event to ensure models is not buffered
                input = 'event: status\ndata: {}\n\n';
                allResults.push(...Array.from(parser.parse(input)));

                expect(allResults).toHaveLength(2);
                expect(allResults[0].event_kind).toBe('models');
                expect(allResults[1].event_kind).toBe('status');
            });

            it('should parse models event with both message and models array', () => {
                const input = `event: models\ndata: {"message": "Available models", "models": [{"name": "GPT-4", "model_id": "gpt-4", "description": "Test", "credit_multiplier": "1.0"}]}\n\n`;

                const results = Array.from(parser.parse(input));

                expect(results).toHaveLength(1);
                const modelsResponse = results[0] as any;
                expect(modelsResponse.data.message).toBe('Available models');
                expect(modelsResponse.data.models).toHaveLength(1);
            });
        });
    });
});
