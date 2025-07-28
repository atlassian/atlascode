import { ParserData } from '../../jql/jqlTypes';
import { parserTestData, TestData, TestToken } from './__fixtures__/parserTestData';
import { parseUntilCurrentToken } from './jqlParser';

describe.each(parserTestData)('#%# parserTest %s', (jqlInput: string, cursorIndex: number, expectedData: TestData) => {
    const [data] = parseUntilCurrentToken(jqlInput, cursorIndex);

    test('has matching data', () => {
        const testData: TestData = parserToTestData(data);
        expect(testData).toStrictEqual(expectedData);
    });
});

function parserToTestData(data: ParserData): TestData {
    return {
        openGroups: data.openGroups,
        openLists: data.openLists,
        openFunc: data.openFunc,
        currentToken: pick(data.currentToken, 'type', 'text', 'value') as TestToken,
        previousToken: pick(data.previousToken, 'type', 'text', 'value') as TestToken,
        previousNonWSToken: pick(data.previousNonWSToken, 'type', 'text', 'value') as TestToken,
        nextToken: pick(data.nextToken, 'type', 'text', 'value') as TestToken,
        currentField: pick(data.currentField, 'type', 'text', 'value') as TestToken,
        currentOperator: pick(data.currentOperator, 'type', 'text', 'value') as TestToken,
        currentPredicate: pick(data.currentPredicate, 'type', 'text', 'value') as TestToken,
    };
}

function pick<T, K extends keyof T>(obj: T, ...keys: K[]): T {
    const copy = {} as T;

    keys.forEach((key) => (copy[key] = obj[key]));

    return copy;
}
