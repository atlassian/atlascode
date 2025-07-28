import { FieldSuggestionFetcher, Suggestion } from '../../jql/jqlTypes';
import * as restdata from './__fixtures__/autocompletedata.json';
import { completionTestData } from './__fixtures__/completorTestData';
import { JqlSuggestor } from './jqlSuggestor';

const fetcher: FieldSuggestionFetcher = async (
    fieldName: string,
    userInput: string,
    predicateName?: string,
): Promise<Suggestion[]> => {
    return [];
};

const suggestor = new JqlSuggestor(restdata, fetcher);

describe.each(completionTestData)(
    '#%# completionTest %s',
    (jqlInput: string, cursorIndex: number, optionToInsert: string, expectedValue: string, expectedIndex: number) => {
        test('jql matches', () => {
            const [newValue] = suggestor.calculateNewValueForSelected(jqlInput, optionToInsert, cursorIndex);
            expect(newValue.toLowerCase()).toEqual<string>(expectedValue.toLowerCase());
        });

        test('index matches', () => {
            const [, newIndex] = suggestor.calculateNewValueForSelected(jqlInput, optionToInsert, cursorIndex);
            expect(newIndex).toEqual<number>(expectedIndex);
        });
    },
);
