import { FieldSuggestionFetcher, Suggestion } from '../../jql/jqlTypes';
import * as restdata from './__fixtures__/autocompletedata.json';
import { suggestorPredicateData } from './__fixtures__/suggestorPredicateData';
import { suggestorTestData } from './__fixtures__/suggestorTestData';
import { JqlSuggestor } from './jqlSuggestor';

const fetcher: FieldSuggestionFetcher = async (
    fieldName: string,
    userInput: string,
    predicateName?: string,
): Promise<Suggestion[]> => {
    if (!predicateName || predicateName.toUpperCase() === 'TO' || predicateName.toUpperCase() === 'FROM') {
        return [
            { value: '"VSCODE"', displayName: 'VSCODE (VSCode)' },
            { value: '"VTC"', displayName: 'VTC (Classic)' },
            { value: 'VTS', displayName: 'VTS (Server)' },
            { value: 'VTN', displayName: 'VTN (Next Gen)' },
            { value: 'Some Project', displayName: 'Some Project' },
            { value: '"Quoted Project"', displayName: 'Quoted Project' },
            { value: `${userInput}`, displayName: `${userInput}` },
        ];
    } else if (predicateName.toUpperCase() === 'BY') {
        return [
            { value: '"VSCODE"', displayName: 'VSCODE (VSCode)' },
            { value: '"VTC"', displayName: 'VTC (Classic)' },
            { value: 'VTS', displayName: 'VTS (Server)' },
            { value: 'VTN', displayName: 'VTN (Next Gen)' },
            { value: 'Some Project', displayName: 'Some Project' },
            { value: '"Quoted Project"', displayName: 'Quoted Project' },
            { value: `${userInput[0]} (user)`, displayName: `${userInput[0]} (user)` },
            { value: `${userInput} (user)`, displayName: `${userInput} (user)` },
        ];
    } else {
        return [];
    }
};

const suggestor = new JqlSuggestor(restdata, fetcher);

describe.each(suggestorTestData)(
    '#%# suggestorTest %s %d',
    (jqlInput: string, cursorIndex: number, includes: string[], excludes: string[]) => {
        test('basic has includes', async () => {
            expect.assertions(includes.length);
            const suggestions: Suggestion[] = await suggestor.getSuggestions(jqlInput, cursorIndex);
            const values = suggestions.map<string>((s) => s.value.toLowerCase());

            if (includes.length === 1 && includes[0] === 'NONE') {
                expect(values.length).toEqual(0);
            } else if (includes.length > 0) {
                includes.forEach((i) => {
                    expect(values).toContain(i.toLowerCase());
                });
            }
        });

        test('basic does not contain excludes', async () => {
            expect.assertions(excludes.length);
            const suggestions: Suggestion[] = await suggestor.getSuggestions(jqlInput, cursorIndex);
            const values = suggestions.map<string>((s) => s.value.toLowerCase());
            if (excludes.length > 0) {
                excludes.forEach((e) => {
                    expect(values).not.toContain(e.toLowerCase());
                });
            }
        });
    },
);

describe.each(suggestorPredicateData)(
    '#%# suggestorPredicateTest %s %d',
    (jqlInput: string, cursorIndex: number, includes: string[], excludes: string[]) => {
        test('predicate has includes', async () => {
            expect.assertions(includes.length);
            const suggestions: Suggestion[] = await suggestor.getSuggestions(jqlInput, cursorIndex);
            const values = suggestions.map<string>((s) => s.value.toLowerCase());

            if (includes.length === 1 && includes[0] === 'NONE') {
                expect(values.length).toEqual(0);
            } else if (includes.length > 0) {
                includes.forEach((i) => {
                    expect(values).toContain(i.toLowerCase());
                });
            }
        });

        test('predicate does not contain excludes', async () => {
            expect.assertions(excludes.length);
            const suggestions: Suggestion[] = await suggestor.getSuggestions(jqlInput, cursorIndex);
            const values = suggestions.map<string>((s) => s.value.toLowerCase());
            if (excludes.length > 0) {
                excludes.forEach((e) => {
                    expect(values).not.toContain(e.toLowerCase());
                });
            }
        });
    },
);
