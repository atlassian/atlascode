import { getFilledFieldKeys, isFieldValueFilled } from './fieldValues';

describe('fieldValues utils', () => {
    describe('isFieldValueFilled', () => {
        const emptyValues = [
            { description: 'undefined', value: undefined },
            { description: 'null', value: null },
            { description: 'empty string', value: '' },
            { description: 'empty array', value: [] },
            { description: 'empty object', value: {} },
        ];

        emptyValues.forEach(({ description, value }) => {
            it(`should return false for ${description}`, () => {
                expect(isFieldValueFilled(value)).toBe(false);
            });
        });

        const filledValues = [
            { description: 'non-empty string', value: 'hello' },
            { description: 'non-empty array', value: ['item'] },
            { description: 'non-empty object', value: { key: 'value' } },
            { description: 'number zero', value: 0 },
            { description: 'boolean false', value: false },
            { description: 'boolean true', value: true },
            { description: 'nested object with values', value: { id: '123', name: 'Test' } },
            { description: 'array with multiple items', value: [1, 2, 3] },
        ];

        filledValues.forEach(({ description, value }) => {
            it(`should return true for ${description}`, () => {
                expect(isFieldValueFilled(value)).toBe(true);
            });
        });
    });

    describe('getFilledFieldKeys', () => {
        const testCases = [
            { description: 'undefined', input: undefined, expected: [] },
            { description: 'null', input: null, expected: [] },
            { description: 'empty object', input: {}, expected: [] },
            {
                description: 'all fields empty',
                input: {
                    field1: '',
                    field2: null,
                    field3: undefined,
                    field4: [],
                    field5: {},
                },
                expected: [],
            },
            {
                description: 'mixed filled and empty fields',
                input: {
                    summary: 'Test summary',
                    description: '',
                    priority: { id: '1', name: 'High' },
                    labels: [],
                    assignee: null,
                },
                expected: ['summary', 'priority'],
            },
            {
                description: 'all fields filled',
                input: {
                    summary: 'Test',
                    description: 'Description',
                    priority: { id: '1' },
                },
                expected: ['summary', 'description', 'priority'],
            },
            {
                description: 'mixed value types',
                input: {
                    stringField: 'value',
                    numberField: 42,
                    boolField: false,
                    arrayField: ['item'],
                    objectField: { key: 'val' },
                    emptyString: '',
                    emptyArray: [],
                    emptyObject: {},
                },
                expected: ['stringField', 'numberField', 'boolField', 'arrayField', 'objectField'],
            },
        ];

        testCases.forEach(({ description, input, expected }) => {
            it(`should return ${JSON.stringify(expected)} for ${description}`, () => {
                expect(getFilledFieldKeys(input)).toEqual(expected);
            });
        });
    });
});
