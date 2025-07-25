import {
    FieldSuggestionFetcher,
    JqlAutocompleteRestData,
    JqlFieldRestData,
    JqlFuncRestData,
    JQLToken,
    ParserData,
    Suggestion,
} from '../jqlTypes';
import {
    AutocompleteTypes,
    ChangedFields,
    ChangedPredicates,
    EmptyOperators,
    emptyParserData,
    EmptyToken,
    JoinKeywords,
    ListOperators,
    Operators,
    OrderByDirectionSuggestions,
    TokenTypes,
    WasPredicates,
} from './jqlConstants';
import {
    findNextTokenOfType,
    findPreviousTokenOfType,
    parseUntilCurrentToken,
    tokenBlockForCursorIndex,
} from './jqlParser';
import {
    backTrackUntil,
    forceRemoveQuotes,
    getFunctionsForType,
    getUserInputPrefix,
    getValidFunctionsForField,
    isEmptyToken,
    isInFunction,
    isInList,
    isInOrderBy,
    isSeparatorToken,
    sortByLength,
    typeForField,
    typeForPredicate,
} from './jqlUtils';

// TODO: AXON-687 get rid of vars after migration
/* eslint-disable no-var */
export class JqlSuggestor {
    private jqlAutocompleteData: JqlAutocompleteRestData;
    private suggestionFetcher: FieldSuggestionFetcher;
    private currentJQL: string;
    private currentParserData: ParserData;
    private currentTokenList: JQLToken[];

    constructor(jqlAutocompleteData: JqlAutocompleteRestData, suggestionFetcher: FieldSuggestionFetcher) {
        this.jqlAutocompleteData = jqlAutocompleteData;
        this.suggestionFetcher = suggestionFetcher;
        this.currentJQL = '';
        this.currentParserData = emptyParserData;
        this.currentTokenList = [];
    }

    public getCurrentToken(): JQLToken {
        return this.currentParserData.currentToken;
    }

    public async getSuggestions(
        jqlInput: string,
        cursorIndex: number,
        abortSignal?: AbortSignal,
    ): Promise<Suggestion[]> {
        const [data, tokens] = parseUntilCurrentToken(jqlInput, cursorIndex, true);
        this.currentParserData = data;
        this.currentTokenList = tokens;
        this.currentJQL = jqlInput;

        const primaryCompleteType =
            cursorIndex < 1 ? AutocompleteTypes.fieldName : this.getPrimaryAutocompleteTypeByToken(data, cursorIndex);
        const suggestions: Suggestion[] = [];
        const fields = this.jqlAutocompleteData.visibleFieldNames;
        const currentToken = data.currentToken ? data.currentToken : EmptyToken;
        const currentJqlField = fields.find((field: JqlFieldRestData) => {
            return (
                data.currentField &&
                (field.value === data.currentField.value || field.displayName === data.currentField.value)
            );
        });

        switch (primaryCompleteType) {
            case AutocompleteTypes.orderByDirection: {
                if (data.currentToken.type === TokenTypes.orderByDirection) {
                    suggestions.push(...OrderByDirectionSuggestions);
                }
                break;
            }

            case AutocompleteTypes.startList: {
                suggestions.push({ displayName: 'start list (', value: '(' });
                break;
            }

            case AutocompleteTypes.comma: {
                suggestions.push({ displayName: ',', value: ',' });
                break;
            }
            case AutocompleteTypes.closeParen: {
                suggestions.push({ displayName: ')', value: ')' });
                break;
            }

            case AutocompleteTypes.fieldName: {
                // if we're at a whitespace before an open group, don't complete
                if (currentToken.type === TokenTypes.WS && data.nextToken.type === TokenTypes.startGroup) {
                    break;
                }

                //if we're at the beginning or on WS without a previous not, add NOT
                if (
                    cursorIndex < 1 ||
                    (currentToken.type === TokenTypes.WS && data.previousToken.type !== TokenTypes.not)
                ) {
                    suggestions.push({ displayName: 'NOT', value: 'NOT' });
                }

                const prefix =
                    currentToken.type === TokenTypes.fieldName || currentToken.type === TokenTypes.errFieldName
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : '';
                const forOrderBy: boolean = isInOrderBy(currentToken, this.currentTokenList);

                if (
                    !forOrderBy &&
                    ((currentToken.type !== TokenTypes.WS && cursorIndex === currentToken.offset) ||
                        (currentToken.type === TokenTypes.WS && cursorIndex === currentToken.col))
                ) {
                    suggestions.push({ displayName: 'start group (', value: '(' });
                }

                for (const i in fields) {
                    if (
                        forOrderBy &&
                        fields[i].orderable !== undefined &&
                        fields[i].orderable?.toLowerCase() === 'false'
                    ) {
                        continue;
                    }
                    if (
                        fields[i].value.toLowerCase().startsWith(prefix) ||
                        fields[i].displayName.toLowerCase().startsWith(prefix)
                    ) {
                        suggestions.push({ displayName: fields[i].displayName, value: fields[i].value });
                    }
                }

                break;
            }
            case AutocompleteTypes.operator: {
                const prefix =
                    currentToken.type === TokenTypes.operator || currentToken.type === TokenTypes.errOperator
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : '';

                if (currentJqlField) {
                    suggestions.push(
                        ...currentJqlField.operators
                            .sort()
                            .sort(sortByLength)
                            .filter((op) => op.toLowerCase().startsWith(prefix))
                            .map<Suggestion>((op) => ({ displayName: op, value: op })),
                    );
                } else {
                    suggestions.push(
                        ...Operators.sort()
                            .sort(sortByLength)
                            .filter((op) => op.toLowerCase().startsWith(prefix))
                            .map<Suggestion>((op) => ({ displayName: op, value: op })),
                    );
                }

                break;
            }
            case AutocompleteTypes.value: {
                var unQuotedPrefix =
                    currentToken.type === TokenTypes.endFunc
                        ? getUserInputPrefix(
                              data.previousNonWSToken,
                              data.previousNonWSToken.offset + data.previousNonWSToken.value.length,
                          )
                        : '';
                unQuotedPrefix =
                    currentToken.type === TokenTypes.value ||
                    currentToken.type === TokenTypes.errValue ||
                    currentToken.type === TokenTypes.startFunc
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : unQuotedPrefix;

                // add empty value if needed
                if (data.currentOperator && EmptyOperators.includes(data.currentOperator.value.toLowerCase())) {
                    if (unQuotedPrefix === '' || 'empty'.startsWith(unQuotedPrefix)) {
                        suggestions.push({ displayName: 'EMPTY', value: 'EMPTY' });
                    }
                    // is and is not only work with empty ot null
                    if (
                        data.currentOperator.value.toLowerCase() === 'is' ||
                        data.currentOperator.value.toLowerCase() === 'is not'
                    ) {
                        break;
                    }
                }
                // add field functions
                const funcs = getValidFunctionsForField(currentJqlField, this.jqlAutocompleteData.visibleFunctionNames);
                suggestions.push(
                    ...funcs.filter(
                        (f) =>
                            f.value.toLowerCase().startsWith(unQuotedPrefix) ||
                            f.displayName.toLowerCase().startsWith(unQuotedPrefix),
                    ),
                );

                // todo - cancel the handling if they changed the input
                if (data.currentField && currentToken) {
                    const results = await this.suggestionFetcher(
                        data.currentField.value,
                        unQuotedPrefix,
                        undefined,
                        abortSignal,
                    );
                    suggestions.push(
                        ...results.filter(
                            (v) =>
                                forceRemoveQuotes(v.value).toLowerCase().startsWith(unQuotedPrefix) ||
                                forceRemoveQuotes(v.displayName).toLowerCase().startsWith(unQuotedPrefix),
                        ),
                    );
                }
                break;
            }
            case AutocompleteTypes.listValue: {
                const hasOpenList = isInList(data.currentOperator, currentToken, this.currentTokenList);

                var unQuotedPrefix =
                    currentToken.type === TokenTypes.endFunc
                        ? getUserInputPrefix(
                              data.previousNonWSToken,
                              data.previousNonWSToken.offset + data.previousNonWSToken.value.length,
                          )
                        : '';
                unQuotedPrefix =
                    currentToken.type === TokenTypes.value ||
                    currentToken.type === TokenTypes.errValue ||
                    currentToken.type === TokenTypes.startFunc
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : unQuotedPrefix;

                // add functions
                const funcs = getValidFunctionsForField(currentJqlField, this.jqlAutocompleteData.visibleFunctionNames);
                suggestions.push(
                    ...funcs.filter((f: JqlFuncRestData) => {
                        return (
                            f.isList !== undefined &&
                            f.isList.toLowerCase() === 'true' &&
                            (f.value.toLowerCase().startsWith(unQuotedPrefix) ||
                                f.displayName.toLowerCase().startsWith(unQuotedPrefix))
                        );
                    }),
                );

                // todo - cancel the handling if they changed the input
                if (data.currentField && currentToken) {
                    let results = (
                        await this.suggestionFetcher(data.currentField.value, unQuotedPrefix, undefined, abortSignal)
                    ).filter(
                        (v) =>
                            forceRemoveQuotes(v.value).toLowerCase().startsWith(unQuotedPrefix) ||
                            forceRemoveQuotes(v.displayName).toLowerCase().startsWith(unQuotedPrefix),
                    );
                    if (!hasOpenList) {
                        results = results.map<Suggestion>((r: Suggestion) => ({
                            displayName: r.displayName,
                            value: '(' + r.value,
                        }));
                    }
                    suggestions.push(...results);
                }

                break;
            }
            //Predicates
            case AutocompleteTypes.predicateValue: {
                const unQuotedPrefix =
                    currentToken.type === TokenTypes.value ||
                    currentToken.type === TokenTypes.errValue ||
                    currentToken.type === TokenTypes.startFunc
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : '';

                // add empty value if needed
                if (data.currentOperator && EmptyOperators.includes(data.currentOperator.value.toLowerCase())) {
                    if (unQuotedPrefix === '' || 'empty'.startsWith(unQuotedPrefix)) {
                        suggestions.push({ displayName: 'EMPTY', value: 'EMPTY' });
                    }
                    // is and is not only work with empty ot null
                    if (
                        data.currentOperator.value.toLowerCase() === 'is' ||
                        data.currentOperator.value.toLowerCase() === 'is not'
                    ) {
                        break;
                    }
                }

                const pFuncs = getFunctionsForType(
                    typeForPredicate(data.currentPredicate),
                    this.jqlAutocompleteData.visibleFunctionNames,
                );
                suggestions.push(
                    ...pFuncs.filter(
                        (f) =>
                            f.value.toLowerCase().startsWith(unQuotedPrefix) ||
                            f.displayName.toLowerCase().startsWith(unQuotedPrefix),
                    ),
                );

                // todo - cancel the handling if they changed the input
                if (data.currentField && currentToken) {
                    if (typeForPredicate(data.currentPredicate).toLowerCase() !== 'java.util.date') {
                        var pResults = await this.suggestionFetcher(
                            data.currentField.value,
                            unQuotedPrefix,
                            data.currentPredicate.value,
                            abortSignal,
                        );

                        //this sucks, but Jira returns (invalid) field values along with predicate values so we need to filter them
                        const fType = typeForField(currentJqlField);
                        const pType = typeForPredicate(data.currentPredicate).toLowerCase();
                        if (fType !== '' && pType !== '' && fType.toLowerCase() !== pType.toLowerCase()) {
                            const fResults = await this.suggestionFetcher(
                                data.currentField.value,
                                unQuotedPrefix,
                                undefined,
                                abortSignal,
                            );
                            const fieldValues = fResults.map<string>((f) => f.value);
                            pResults = pResults.filter((r) => fieldValues.indexOf(r.value) < 0);
                        }
                        suggestions.push(
                            ...pResults.filter(
                                (v) =>
                                    forceRemoveQuotes(v.value).toLowerCase().startsWith(unQuotedPrefix) ||
                                    forceRemoveQuotes(v.displayName).toLowerCase().startsWith(unQuotedPrefix),
                            ),
                        );
                    }
                }
                break;
            }
            case AutocompleteTypes.predicateListValue: {
                var unQuotedPrefix =
                    currentToken.type === TokenTypes.endFunc
                        ? getUserInputPrefix(
                              data.previousNonWSToken,
                              data.previousNonWSToken.offset + data.previousNonWSToken.value.length,
                          )
                        : '';
                unQuotedPrefix =
                    currentToken.type === TokenTypes.value ||
                    currentToken.type === TokenTypes.errValue ||
                    currentToken.type === TokenTypes.startFunc
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : unQuotedPrefix;

                const pFuncs = getFunctionsForType(
                    typeForPredicate(data.currentPredicate),
                    this.jqlAutocompleteData.visibleFunctionNames,
                );
                suggestions.push(
                    ...pFuncs.filter(
                        (f) =>
                            f.value.toLowerCase().startsWith(unQuotedPrefix) ||
                            f.displayName.toLowerCase().startsWith(unQuotedPrefix),
                    ),
                );

                // todo - cancel the handling if they changed the input
                if (data.currentField && currentToken) {
                    if (typeForPredicate(data.currentPredicate).toLowerCase() !== 'java.util.date') {
                        var pResults = await this.suggestionFetcher(
                            data.currentField.value,
                            unQuotedPrefix,
                            data.currentPredicate.value,
                            abortSignal,
                        );

                        //this sucks, but Jira returns (invalid) field values along with predicate values so we need to filter them
                        const fType = typeForField(currentJqlField);
                        const pType = typeForPredicate(data.currentPredicate).toLowerCase();
                        if (fType !== '' && pType !== '' && fType.toLowerCase() !== pType.toLowerCase()) {
                            const fResults = await this.suggestionFetcher(
                                data.currentField.value,
                                unQuotedPrefix,
                                undefined,
                                abortSignal,
                            );
                            const fieldValues = fResults.map<string>((f) => f.value);
                            pResults = pResults.filter((r) => fieldValues.indexOf(r.value) < 0);
                        }
                        suggestions.push(
                            ...pResults.filter(
                                (v) =>
                                    forceRemoveQuotes(v.value).toLowerCase().startsWith(unQuotedPrefix) ||
                                    forceRemoveQuotes(v.displayName).toLowerCase().startsWith(unQuotedPrefix),
                            ),
                        );
                    }
                }

                break;
            }
            // End Predicates
            case AutocompleteTypes.endList: {
                suggestions.push(
                    ...[
                        { displayName: 'end list )', value: ')' },
                        { displayName: 'comma', value: ',' },
                    ],
                );
                break;
            }
            case AutocompleteTypes.join: {
                const unQuotedPrefix =
                    currentToken.type === TokenTypes.join || currentToken.type === TokenTypes.orderBy
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : '';

                if (data.currentOperator.value.toLowerCase().startsWith('was')) {
                    const filteredPredicates = WasPredicates.filter((k) => k.toLowerCase().startsWith(unQuotedPrefix));
                    suggestions.push(
                        ...filteredPredicates.map<Suggestion>((word) => ({ displayName: word, value: word })),
                    );
                }
                const filtered = JoinKeywords.filter((k) => k.toLowerCase().startsWith(unQuotedPrefix));
                suggestions.push(...filtered.map<Suggestion>((word) => ({ displayName: word, value: word })));
                break;
            }
            case AutocompleteTypes.predicateName: {
                const unQuotedPrefix =
                    currentToken.type === TokenTypes.predicateName || currentToken.type === TokenTypes.errValue
                        ? getUserInputPrefix(currentToken, cursorIndex)
                        : '';

                if (data.currentOperator.value.toLowerCase().startsWith('was')) {
                    const filteredPredicates = WasPredicates.filter((k) => k.toLowerCase().startsWith(unQuotedPrefix));
                    suggestions.push(
                        ...filteredPredicates.map<Suggestion>((word) => {
                            let val = word;
                            if (word.toLowerCase() === 'during' && data.nextNonWSToken.type !== TokenTypes.startList) {
                                val = word + ' (';
                            }
                            return { displayName: word, value: val };
                        }),
                    );
                } else if (
                    data.currentOperator.value.toLowerCase() === 'changed' &&
                    ChangedFields.includes(data.currentField.value.toLowerCase())
                ) {
                    const filteredPredicates = ChangedPredicates.filter((k) =>
                        k.toLowerCase().startsWith(unQuotedPrefix),
                    );
                    suggestions.push(
                        ...filteredPredicates.map<Suggestion>((word) => {
                            let val = word;
                            if (word.toLowerCase() === 'during' && data.nextNonWSToken.type !== TokenTypes.startList) {
                                val = word + ' (';
                            }
                            return { displayName: word, value: val };
                        }),
                    );
                    const filteredJoins = JoinKeywords.filter((k) => k.toLowerCase().startsWith(unQuotedPrefix));
                    suggestions.push(...filteredJoins.map<Suggestion>((word) => ({ displayName: word, value: word })));
                }
                break;
            }
            case AutocompleteTypes.endOrderBy: {
                suggestions.push(...[...OrderByDirectionSuggestions, { displayName: 'comma', value: ',' }]);
                break;
            }
        }

        return suggestions.map<Suggestion>((s) => ({
            value: s.value,
            displayName: s.displayName.replace(/<b>/g, '').replace(/<\/b>/g, ''),
        }));
    }

    public calculateNewValueForSelected(
        jqlInput: string,
        selectedOption: string,
        cursorIndex: number,
    ): [string, number] {
        if (selectedOption === '') {
            return [jqlInput, cursorIndex];
        }

        if (jqlInput !== this.currentJQL) {
            const [data, tokens] = parseUntilCurrentToken(jqlInput, cursorIndex);
            this.currentParserData = data;
            this.currentTokenList = tokens;
            this.currentJQL = jqlInput;
        }
        let newText = this.currentJQL + selectedOption;
        let newIndex = newText.length;

        let { current, next } = tokenBlockForCursorIndex(this.currentTokenList, cursorIndex);

        if (cursorIndex < this.currentJQL.length) {
            if (isSeparatorToken(current) && current.offset + current.text.length < jqlInput.length) {
                ({ current, next } = tokenBlockForCursorIndex(this.currentTokenList, cursorIndex + 1));
            }

            var beforeText = this.currentJQL.substring(0, current.offset);
            let afterText = !isEmptyToken(next) ? this.currentJQL.substr(next.offset, this.currentJQL.length) : '';

            if (current.type === TokenTypes.startFunc) {
                const endFunc = findNextTokenOfType(TokenTypes.endFunc, current.tokenIndex, this.currentTokenList);
                if (!isEmptyToken(endFunc)) {
                    afterText = this.currentJQL.substr(endFunc.offset + endFunc.text.length, this.currentJQL.length);
                }
            }

            if (current.type === TokenTypes.endFunc) {
                const startFunc = findPreviousTokenOfType(
                    TokenTypes.startFunc,
                    current.tokenIndex,
                    this.currentTokenList,
                );
                if (!isEmptyToken(startFunc)) {
                    beforeText = this.currentJQL.substr(0, startFunc.offset);
                }
            }

            newText = beforeText + selectedOption + afterText;
            newIndex = (beforeText + selectedOption).length;
        } else {
            var beforeText = !isEmptyToken(current) ? this.currentJQL.substring(0, current.offset) : '';
            if (isSeparatorToken(current)) {
                beforeText = this.currentJQL.substring(0, current.offset + current.text.length);
            }

            if (current.type === TokenTypes.endFunc) {
                const startFunc = findPreviousTokenOfType(
                    TokenTypes.startFunc,
                    current.tokenIndex,
                    this.currentTokenList,
                );
                if (!isEmptyToken(startFunc)) {
                    beforeText = this.currentJQL.substr(0, startFunc.offset);
                }
            }

            newText = beforeText + selectedOption;
            newIndex = newText.length;
        }

        return [newText, newIndex];
    }

    protected getPrimaryAutocompleteTypeByToken(data: ParserData, cursorIndex: number): string {
        let completeType = 'unknown';

        const atEndOfJql =
            data.currentToken.tokenIndex === this.currentTokenList.length - 1 &&
            cursorIndex === data.currentToken.offset + data.currentToken.text.length;

        switch (data.currentToken.type) {
            case TokenTypes.WS: {
                // if (cursorIndex !== data.currentToken.offset + data.currentToken.text.length) {
                //     break;
                // }
                // WHITESPACE
                switch (data.previousToken.type) {
                    case TokenTypes.startGroup:
                    case TokenTypes.errFieldName: {
                        completeType = AutocompleteTypes.fieldName;
                        break;
                    }

                    case TokenTypes.fieldName: {
                        if (isInOrderBy(data.previousToken, this.currentTokenList)) {
                            completeType = AutocompleteTypes.endOrderBy;
                        } else {
                            completeType = AutocompleteTypes.operator;
                        }

                        break;
                    }

                    case TokenTypes.endGroup: {
                        completeType = AutocompleteTypes.join;
                        break;
                    }

                    case TokenTypes.startList: {
                        completeType =
                            data.currentPredicate.type !== TokenTypes.emptyToken
                                ? AutocompleteTypes.predicateListValue
                                : AutocompleteTypes.listValue;
                        break;
                    }

                    case TokenTypes.endList: {
                        completeType = AutocompleteTypes.join;
                        break;
                    }

                    case TokenTypes.startFunc: {
                        break;
                    }

                    case TokenTypes.endFunc: {
                        if (isInList(data.currentOperator, data.currentToken, this.currentTokenList)) {
                            completeType = AutocompleteTypes.endList;
                        } else if (data.currentPredicate.value.toLowerCase() === 'during') {
                            const predicateValueType = backTrackUntil(
                                [TokenTypes.startList, TokenTypes.comma],
                                data.currentToken,
                                this.currentTokenList,
                            );
                            if (
                                predicateValueType === TokenTypes.startList &&
                                data.nextNonWSToken.type !== TokenTypes.comma
                            ) {
                                completeType = AutocompleteTypes.comma;
                            } else if (
                                predicateValueType === TokenTypes.comma &&
                                data.nextNonWSToken.type !== TokenTypes.endList
                            ) {
                                completeType = AutocompleteTypes.closeParen;
                            }
                        } else if (data.currentPredicate.type !== TokenTypes.emptyToken) {
                            completeType = AutocompleteTypes.predicateName;
                        } else {
                            completeType = AutocompleteTypes.join;
                        }
                        break;
                    }

                    case TokenTypes.errOperator: {
                        completeType = AutocompleteTypes.operator;
                        break;
                    }
                    case TokenTypes.operator: {
                        if (data.previousToken.value.toLowerCase() === 'changed') {
                            completeType = AutocompleteTypes.predicateName;
                        } else if (
                            ListOperators.includes(data.currentOperator.value.toLowerCase()) &&
                            data.nextToken.type !== TokenTypes.startList
                        ) {
                            completeType = AutocompleteTypes.listValue;
                        } else if (!ListOperators.includes(data.currentOperator.value.toLowerCase())) {
                            completeType = AutocompleteTypes.value;
                        }
                        break;
                    }

                    case TokenTypes.errValue: {
                        completeType = AutocompleteTypes.value;
                        break;
                    }

                    case TokenTypes.value: {
                        if (
                            data.currentPredicate.type !== TokenTypes.emptyToken &&
                            data.currentPredicate.value.toLowerCase() !== 'during'
                        ) {
                            completeType = AutocompleteTypes.predicateName;
                        } else if (isInList(data.currentOperator, data.previousToken, this.currentTokenList)) {
                            completeType = AutocompleteTypes.endList;
                        } else if (data.currentPredicate.value.toLowerCase() === 'during') {
                            completeType =
                                backTrackUntil(
                                    [TokenTypes.startList, TokenTypes.comma],
                                    data.previousToken,
                                    this.currentTokenList,
                                ) === TokenTypes.startList
                                    ? AutocompleteTypes.comma
                                    : AutocompleteTypes.closeParen;
                        } else if (!isInFunction(data.currentToken, this.currentTokenList)) {
                            completeType = AutocompleteTypes.join;
                        }

                        break;
                    }

                    case TokenTypes.orderBy: {
                    }
                    case TokenTypes.join: {
                        completeType = AutocompleteTypes.fieldName;
                        break;
                    }

                    case TokenTypes.orderByDirection: {
                        break;
                    }

                    case TokenTypes.not: {
                        completeType = AutocompleteTypes.fieldName;
                        break;
                    }

                    case TokenTypes.comma: {
                        if (isInOrderBy(data.previousToken, this.currentTokenList)) {
                            completeType = AutocompleteTypes.fieldName;
                        } else if (data.nextToken.type !== TokenTypes.WS) {
                            if (data.currentPredicate.type !== TokenTypes.emptyToken) {
                                completeType = AutocompleteTypes.predicateListValue;
                            } else {
                                completeType = AutocompleteTypes.listValue;
                            }
                        }
                        break;
                    }

                    case TokenTypes.predicateName: {
                        if (
                            data.previousToken.value.toLowerCase() === 'during' &&
                            data.nextNonWSToken.type !== TokenTypes.startList
                        ) {
                            completeType = AutocompleteTypes.startList;
                        } else {
                            completeType = AutocompleteTypes.predicateValue;
                        }

                        break;
                    }
                }
                break;
            }

            // END WHITESPACE
            case TokenTypes.startGroup:
            case TokenTypes.errFieldName: {
                completeType = AutocompleteTypes.fieldName;
                break;
            }

            case TokenTypes.fieldName: {
                if (atEndOfJql && isInOrderBy(data.currentToken, this.currentTokenList)) {
                    break;
                }

                completeType = AutocompleteTypes.fieldName;
                break;
            }

            case TokenTypes.endGroup: {
                if (atEndOfJql && !isInList(data.currentOperator, data.currentToken, this.currentTokenList)) {
                    break;
                }

                completeType = AutocompleteTypes.endGroup;
                break;
            }

            case TokenTypes.startList: {
                if (data.previousNonWSToken.type === TokenTypes.predicateName) {
                    completeType = AutocompleteTypes.predicateListValue;
                } else {
                    completeType = AutocompleteTypes.listValue;
                }

                break;
            }

            case TokenTypes.endList: {
                if (atEndOfJql && !isInList(data.currentOperator, data.currentToken, this.currentTokenList)) {
                    break;
                }

                completeType = AutocompleteTypes.join;
                break;
            }

            case TokenTypes.startFunc: {
                if (data.currentPredicate.type !== TokenTypes.emptyToken) {
                    completeType = ListOperators.includes(data.currentOperator.value.toLowerCase())
                        ? AutocompleteTypes.predicateListValue
                        : AutocompleteTypes.predicateValue;
                } else {
                    completeType = ListOperators.includes(data.currentOperator.value.toLowerCase())
                        ? AutocompleteTypes.listValue
                        : AutocompleteTypes.value;
                }
                break;
            }

            case TokenTypes.endFunc: {
                if (
                    atEndOfJql &&
                    !isInList(data.currentOperator, data.currentToken, this.currentTokenList) &&
                    data.currentPredicate.value.toLowerCase() !== 'during'
                ) {
                    break;
                }

                if (isInList(data.currentOperator, data.currentToken, this.currentTokenList)) {
                    completeType = AutocompleteTypes.endList;
                } else if (data.currentPredicate.type !== TokenTypes.emptyToken) {
                    if (data.currentPredicate.value.toLowerCase() === 'during') {
                        const predicateValueType = backTrackUntil(
                            [TokenTypes.predicateName, TokenTypes.startList, TokenTypes.comma],
                            data.currentToken,
                            this.currentTokenList,
                        );
                        if (predicateValueType === TokenTypes.predicateName) {
                            completeType = AutocompleteTypes.predicateName;
                        } else if (
                            predicateValueType === TokenTypes.startList &&
                            data.nextNonWSToken.type !== TokenTypes.comma
                        ) {
                            completeType = AutocompleteTypes.comma;
                        } else if (
                            predicateValueType === TokenTypes.comma &&
                            data.nextNonWSToken.type !== TokenTypes.endList
                        ) {
                            completeType = AutocompleteTypes.closeParen;
                        }
                    } else {
                        completeType = AutocompleteTypes.predicateName;
                    }
                } else {
                    completeType = AutocompleteTypes.value;
                }
                break;
            }

            case TokenTypes.errOperator:
            case TokenTypes.operator: {
                completeType = AutocompleteTypes.operator;
                break;
            }

            case TokenTypes.errValue:
            case TokenTypes.value: {
                if (
                    data.currentToken.type === TokenTypes.value &&
                    atEndOfJql &&
                    !isInList(data.currentOperator, data.currentToken, this.currentTokenList) &&
                    data.currentPredicate.value.toLowerCase() !== 'during'
                ) {
                    completeType = AutocompleteTypes.value;
                    break;
                }

                if (isInFunction(data.currentToken, this.currentTokenList)) {
                    break;
                }

                if (
                    data.currentPredicate.type !== TokenTypes.emptyToken ||
                    (data.previousNonWSToken.type === TokenTypes.operator &&
                        data.previousNonWSToken.value.toLowerCase() === 'changed')
                ) {
                    if (
                        data.previousNonWSToken.type === TokenTypes.value ||
                        data.previousNonWSToken.type === TokenTypes.endFunc ||
                        (data.previousNonWSToken.type === TokenTypes.operator &&
                            data.previousNonWSToken.value.toLowerCase() === 'changed')
                    ) {
                        completeType = AutocompleteTypes.predicateName;
                    } else {
                        const isList =
                            backTrackUntil(
                                [TokenTypes.predicateName, TokenTypes.startList],
                                data.currentToken,
                                this.currentTokenList,
                            ) === TokenTypes.startList;
                        completeType = isList ? AutocompleteTypes.predicateListValue : AutocompleteTypes.predicateValue;
                    }
                } else {
                    completeType = AutocompleteTypes.value;
                }
                break;
            }

            case TokenTypes.orderBy:
            case TokenTypes.join: {
                completeType = AutocompleteTypes.join;
                break;
            }

            case TokenTypes.orderByDirection: {
                if (atEndOfJql) {
                    break;
                }

                completeType = AutocompleteTypes.orderByDirection;
                break;
            }

            case TokenTypes.not: {
                break;
            }

            case TokenTypes.comma: {
                if (cursorIndex === this.currentJQL.length || data.nextToken.type !== TokenTypes.WS) {
                    if (data.currentPredicate.value.toLowerCase() === 'during') {
                        completeType = AutocompleteTypes.predicateListValue;
                    } else if (!isInFunction(data.currentToken, this.currentTokenList)) {
                        completeType = AutocompleteTypes.listValue;
                    }
                }

                if (isInOrderBy(data.currentToken, this.currentTokenList)) {
                    completeType = AutocompleteTypes.fieldName;
                }
                break;
            }

            case TokenTypes.predicateName: {
                completeType = AutocompleteTypes.predicateName;
                break;
            }
        }

        return completeType;
    }
}
