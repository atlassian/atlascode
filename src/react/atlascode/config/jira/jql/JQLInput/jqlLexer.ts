import moo from '@atlassianlabs/moo-relexed';

import { TokenTypes } from './jqlConstants';

const stringValue = /["'](?:\\["'bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"'\\])*['"]|[a-zA-Z0-9\.\_\-\[\]]+/;
const startFunction = /(?:["'](?:\\["'bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"'\\])*['"]|[a-zA-Z0-9\.\_\-\[\]]+)\s*[\(]/;

// it's dumb that moo doesn't support case-insensitivity in any way

/*
was not in
not in
was in
in

was not
is not
is
was
changed

*/
const ciOps = /[iI][sS]\s+[nN][oO][tT]|[wW][aA][sS]\s+[nN][oO][tT]|[iI][sS](?![a-zA-Z])|[wW][aA][sS](?![a-zA-Z])/;
const ciListOps =
    /[wW][aA][sS]\s+[nN][oO][tT]\s+[iI][nN]|[nN][oO][tT]\s+[iI][nN]|[wW][aA][sS]\s+[iI][nN]|[iI][nN](?![a-zA-Z])/;
const ciChangedOp = /[cC][hH][aA][nN][gG][eE][dD](?![a-zA-Z])/;
const ciOrderBy = /[oO][rR][dD][eE]?[rR]?\s+[bB]?[yY]?/;
const ciJoins = /[aA][nN]?[dD]?(?![a-zA-Z])|[oO][rR]?(?![a-zA-Z])/;
const predicates =
    /[aA][fF][tT][eE][rR](?![a-zA-Z])|[bB][eE][fF][oO][rR][eE](?![a-zA-Z])|[bB][yY](?![a-zA-Z])|[dD][uU][rR][iI][nN][gG](?![a-zA-Z])|[oO][nN](?![a-zA-Z])|[fF][rR][oO][mM](?![a-zA-Z])|[tT][oO](?![a-zA-Z])/;

const WS = /\s+/;
const ciDirection = /[aA][sS][cC]|[dD][eE][sS][cC]/;

export const JqlLexer = moo.states({
    groupOrField: {
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.startGroup]: { match: '(', next: 'groupOrField' },
        [TokenTypes.not]: { match: /[nN][oO][tT]/ },
        [TokenTypes.fieldName]: { match: stringValue, next: 'operator' },
        [TokenTypes.errFieldName]: moo.error,
    },
    operator: {
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.operator]: [
            { match: ['=', '!=', '~', '<=', '>=', '>', '<', '!~'], next: 'singleValue', push: 'endSingleValue' },
            { match: ciListOps, next: 'startList', push: 'endSingleValue' },
            { match: ciOps, next: 'singleValue', push: 'endSingleValue' },
            { match: ciChangedOp, next: 'endSingleValue' },
        ],
        [TokenTypes.errOperator]: moo.error,
    },
    singleValue: {
        // values can be strings, quoted strings, lists or functions.
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.startFunc]: { match: startFunction, push: 'endSingleValue', next: 'innerFunc' },
        [TokenTypes.value]: { match: stringValue, pop: 1 },
        [TokenTypes.errValue]: moo.error,
    },
    innerFunc: {
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.endFunc]: { match: ')', pop: 1 },
        [TokenTypes.comma]: { match: ',' },
        [TokenTypes.value]: { match: stringValue },
        [TokenTypes.errFuncValue]: moo.error,
    },
    endSingleValue: {
        // values can be strings, quoted strings, lists or functions.
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.endGroup]: { match: ')', pop: 1 },

        [TokenTypes.predicateName]: { match: predicates, push: 'predicateValue' },
        [TokenTypes.orderBy]: { match: ciOrderBy, next: 'innerOrderBy' },
        [TokenTypes.join]: { match: ciJoins, next: 'groupOrField' },
        [TokenTypes.errValue]: moo.error,
    },
    predicateValue: {
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.startList]: { match: '(', next: 'innerList' },
        [TokenTypes.startFunc]: { match: startFunction, push: 'endSingleValue', next: 'innerFunc' },
        [TokenTypes.value]: { match: stringValue, pop: 1 },
        [TokenTypes.errValue]: moo.error,
    },
    startList: {
        // values can be strings, quoted strings, lists or functions.
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.startList]: { match: '(', next: 'innerList' },
        [TokenTypes.startFunc]: { match: startFunction, push: 'endSingleValue', next: 'innerFunc' },
        [TokenTypes.errList]: moo.error,
    },
    innerList: {
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.endList]: { match: ')', pop: 1 },
        [TokenTypes.comma]: { match: ',' },
        [TokenTypes.startFunc]: { match: startFunction, push: 'innerFunc' },
        [TokenTypes.value]: { match: stringValue },
        [TokenTypes.errList]: moo.error,
    },

    innerOrderBy: {
        [TokenTypes.WS]: { match: WS, lineBreaks: true },
        [TokenTypes.comma]: { match: ',' },
        [TokenTypes.orderByDirection]: { match: ciDirection },
        [TokenTypes.fieldName]: { match: stringValue },
        [TokenTypes.errOrderBy]: moo.error,
    },
});
