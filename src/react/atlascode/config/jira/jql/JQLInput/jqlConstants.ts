import { JQLToken, ParserData } from '../jqlTypes';

export const TokenTypes = {
    WS: 'WS',
    startGroup: 'startGroup',
    endGroup: 'endGroup',
    startList: 'startList',
    endList: 'endList',
    startFunc: 'startFunc',
    endFunc: 'endFunc',
    fieldName: 'fieldName',
    operator: 'operator',
    value: 'value',
    orderByDirection: 'orderByDirection',
    orderBy: 'orderBy',
    join: 'join',
    not: 'not',
    comma: 'comma',
    predicateName: 'predicateName',
    errFieldName: 'errFieldName',
    errOperator: 'errOperator',
    errValue: 'errValue',
    errList: 'errList',
    errFuncValue: 'errFuncValue',
    errOrderBy: 'errOrderBy',
    emptyToken: 'emptyToken',
};

export const SeparatorTokens = [
    TokenTypes.WS,
    TokenTypes.startGroup,
    TokenTypes.endGroup,
    TokenTypes.startList,
    TokenTypes.endList,
    //TokenTypes.endFunc,
    TokenTypes.comma,
];

export const EmptyToken: JQLToken = {
    col: 0,
    line: 1,
    lineBreaks: 0,
    offset: 0,
    tokenIndex: 0,
    text: '',
    value: '',
    type: TokenTypes.emptyToken,
};

export const emptyParserData: ParserData = {
    openGroups: 0,
    openLists: 0,
    openFunc: false,
    currentToken: EmptyToken,
    previousToken: EmptyToken,
    previousNonWSToken: EmptyToken,
    nextToken: EmptyToken,
    nextNonWSToken: EmptyToken,
    currentField: EmptyToken,
    currentOperator: EmptyToken,
    currentPredicate: EmptyToken,
};

export const AutocompleteTypes = {
    fieldName: 'fieldName',
    operator: 'operator',
    value: 'value',
    join: 'join',
    startList: 'startList',
    comma: 'comma',
    listValue: 'listValue',
    endList: 'endList',
    endGroup: 'endGroup',
    endOrderBy: 'endOrderBy',
    orderByDirection: 'orderByDirection',
    predicateName: 'predicateName',
    predicateValue: 'predicateValue',
    predicateListValue: 'predicateListValue',
    closeParen: 'closeParen',
};

export const Operators = [
    '=',
    '!=',
    '<=',
    '>=',
    '<',
    '>',
    '~',
    '!~',
    'IS',
    'IS NOT',
    'IN',
    'NOT IN',
    'WAS',
    'WAS IN',
    'WAS NOT',
    'WAS NOT IN',
    'CHANGED',
];

export const JoinKeywords = ['AND', 'OR', 'ORDER BY'];

export const EmptyOperators = ['is', 'is not', 'in', 'was', 'not in', 'was not', 'was not in', 'changed'];

export const ListOperators = ['in', 'not in', 'was in', 'was not in'];

export const OrderByDirectionSuggestions = [
    {
        value: 'ASC',
        displayName: 'ASC',
    },
    {
        value: 'DESC',
        displayName: 'DESC',
    },
];

export const WasPredicates = ['AFTER', 'BEFORE', 'BY', 'DURING', 'ON'];

export const ChangedPredicates = [...WasPredicates, 'FROM', 'TO'];

export const PredicateTypes = {
    AFTER: 'java.util.Date',
    BEFORE: 'java.util.Date',
    DURING: 'java.util.Date',
    ON: 'java.util.Date',
    BY: 'com.atlassian.jira.user.ApplicationUser',
};

export const ChangedFields = ['sssignee', 'fix version', 'priority', 'reporter', 'resolution', 'status'];
