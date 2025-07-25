import { Token } from '@atlassianlabs/moo-relexed';

export type JQLToken = Token & { tokenIndex: number };
export type TokenBlock = {
    previous: JQLToken;
    previousNonWS: JQLToken;
    current: JQLToken;
    next: JQLToken;
    nextNonWS: JQLToken;
};

export interface ParserData {
    openGroups: number;
    openLists: number;
    openFunc: boolean;
    currentToken: JQLToken;
    previousToken: JQLToken;
    previousNonWSToken: JQLToken;
    nextToken: JQLToken;
    nextNonWSToken: JQLToken;
    currentField: JQLToken;
    currentOperator: JQLToken;
    currentPredicate: JQLToken;
}

export type Suggestion = { displayName: string; value: string };
export type Suggestions = Suggestion[];

export interface JqlFieldRestData {
    value: string;
    displayName: string;
    orderable?: string;
    searchable?: string;
    auto?: string;
    cfid?: string;
    operators: string[];
    types: string[];
}

export interface JqlFuncRestData {
    value: string;
    displayName: string;
    isList?: string;
    types: string[];
}

export interface JqlAutocompleteRestData {
    visibleFieldNames: JqlFieldRestData[];
    visibleFunctionNames: JqlFuncRestData[];
    jqlReservedWords: string[];
}

export interface JqlParserFieldData extends JqlFieldRestData {
    hyphenValue: string;
    hyphenDisplayName: string;
    hyphenOperators: string[];
}

export interface JqlParserFuncData extends JqlFuncRestData {
    hyphenValue: string;
    hyphenDisplayName: string;
}

export interface JqlParserAutocompleteData {
    fields: JqlParserFieldData[];
    functions: JqlParserFuncData[];
}

export type FieldSuggestionFetcher = (
    fieldName: string,
    userInput: string,
    predicateName?: string,
    abortSignal?: AbortSignal,
) => Promise<Suggestion[]>;
