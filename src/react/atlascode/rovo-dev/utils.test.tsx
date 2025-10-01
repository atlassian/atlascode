import { appendResponse, ChatMessage } from './utils';
import { Response, ToolReturnGenericMessage } from './utils';

describe('appendResponse', () => {
    const mockHandleAppendModifiedFileToolReturns = jest.fn();
    const mockSetIsDeepPlanCreated = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return prev when response is null', () => {
        const prev: Response[] = [{ text: 'test', source: 'User' }];
        const result = appendResponse(null, prev, mockHandleAppendModifiedFileToolReturns, mockSetIsDeepPlanCreated);
        expect(result).toEqual(prev);
    });

    it('should append streaming RovoDev text to existing RovoDev message', () => {
        const prev: Response[] = [{ text: 'Hello ', source: 'RovoDev' }];
        const response = { text: 'world', source: 'RovoDev' } as const;

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ text: 'Hello world', source: 'RovoDev' });
    });

    it('should not append streaming text when sources differ', () => {
        const prev: Response[] = [{ text: 'Hello', source: 'User' }];
        const response = { text: 'world', source: 'RovoDev' } as const;

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ text: 'Hello', source: 'User' });
        expect(result[1]).toEqual({ text: 'world', source: 'RovoDev' });
    });

    it('should group ToolReturn with previous message when groupable', () => {
        const prev: Response[] = [
            { tool_name: 'grep', source: 'ToolReturn', content: 'prev result', args: 'args', tool_call_id: 'id' },
        ];
        const response: ToolReturnGenericMessage = {
            tool_name: 'bash',
            source: 'ToolReturn',
            content: 'result',
            tool_call_id: 'id',
        };

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(mockHandleAppendModifiedFileToolReturns).toHaveBeenCalledWith(response);
        expect(result).toHaveLength(1);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0]).toHaveLength(2);
    });

    it('should not group ToolReturn when latest is User message', () => {
        const prev: Response[] = [{ text: 'user message', source: 'User' }];
        const response: ToolReturnGenericMessage = {
            tool_name: 'bash',
            source: 'ToolReturn',
            content: 'result',
            tool_call_id: 'id',
        };

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ text: 'user message', source: 'User' });
        expect(Array.isArray(result[1])).toBe(true);
        expect(result[1]).toHaveLength(1);
    });

    it('should not group ToolReturn when latest is RovoDevDialog message', () => {
        const prev: Response[] = [
            {
                type: 'error',
                text: 'error',
                source: 'RovoDevDialog',
                isRetriable: false,
                uid: 'uid',
            },
        ];
        const response: ToolReturnGenericMessage = {
            tool_name: 'bash',
            source: 'ToolReturn',
            content: 'result',
            tool_call_id: 'id',
        };

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(2);
        expect(Array.isArray(result[1])).toBe(true);
        expect(result[1]).toHaveLength(1);
    });

    it('should handle create_technical_plan as separate message', () => {
        const prev: Response[] = [{ text: 'previous', source: 'RovoDev' }];
        const response: ToolReturnGenericMessage = {
            tool_name: 'create_technical_plan',
            source: 'ToolReturn',
            content: 'plan',
            tool_call_id: 'id',
        };

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(mockSetIsDeepPlanCreated).toHaveBeenCalledWith(true);
        expect(result).toHaveLength(2);
        expect(result[1]).toEqual(response);
    });

    it('should merge with existing thinking group', () => {
        const existingGroup: ChatMessage[] = [
            { tool_name: 'grep', source: 'ToolReturn', content: 'result', tool_call_id: 'id1' },
            { tool_name: 'grep', source: 'ToolReturn', content: 'result1', tool_call_id: 'id1' },
        ];
        const prev: Response[] = [existingGroup];
        const response: ToolReturnGenericMessage = {
            tool_name: 'bash',
            source: 'ToolReturn',
            content: 'result2',
            tool_call_id: 'id2',
        };

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(1);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0]).toHaveLength(3);
    });

    it('should handle create_technical_plan when latest is array', () => {
        const existingArray: ChatMessage[] = [
            { tool_name: 'tool1', source: 'ToolCall', args: 'args1', tool_call_id: 'id1' },
        ];
        const prev: Response[] = [existingArray];
        const response: ToolReturnGenericMessage = {
            tool_name: 'create_technical_plan',
            source: 'ToolReturn',
            content: 'plan',
            tool_call_id: 'id',
        };

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(mockSetIsDeepPlanCreated).toHaveBeenCalledWith(true);
        expect(result).toHaveLength(2);
        expect(result[1]).toEqual(response);
    });

    it('should handle array response when latest exists', () => {
        const prev: Response[] = [{ text: 'previous', source: 'User' }];
        const response: ChatMessage[] = [
            { tool_name: 'grep', source: 'ToolCall', args: 'args1', tool_call_id: 'id1' },
            { tool_name: 'grep', source: 'ToolReturn', content: 'result1', tool_call_id: 'id1' },
        ] as const;

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ text: 'previous', source: 'User' });
        expect(result[1]).toEqual(response);
    });

    it('should handle array response when no latest exists', () => {
        const prev: Response[] = [];
        const response: ChatMessage[] = [
            { tool_name: 'tool1', source: 'ToolCall', args: 'args1', tool_call_id: 'id1' },
        ] as const;

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(response);
    });

    it('should handle non-ToolReturn response when latest is array', () => {
        const existingArray: ChatMessage[] = [
            { tool_name: 'tool1', source: 'ToolCall', args: 'args1', tool_call_id: 'id1' },
        ];
        const prev: Response[] = [existingArray];
        const response = { text: 'new message', source: 'RovoDev' } as const;

        const result = appendResponse(
            response,
            prev,
            mockHandleAppendModifiedFileToolReturns,
            mockSetIsDeepPlanCreated,
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(existingArray);
        expect(result[1]).toEqual(response);
    });
});
