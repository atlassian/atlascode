import { JqlFieldRestData, JqlFuncRestData, JQLToken } from '../jqlTypes';
import { ListOperators, PredicateTypes, SeparatorTokens, TokenTypes } from './jqlConstants';

export function isInList(opToken: JQLToken, curToken: JQLToken, tokens: JQLToken[]): boolean {
    let numOpen = 0;
    let numClose = 0;

    if (!ListOperators.includes(opToken.value.toLowerCase())) {
        return false;
    }

    if (
        opToken.type !== TokenTypes.emptyToken &&
        curToken.type !== TokenTypes.emptyToken &&
        opToken.tokenIndex < curToken.tokenIndex
    ) {
        for (let i = opToken.tokenIndex + 1; i <= curToken.tokenIndex; i++) {
            if (tokens[i].type === TokenTypes.startList) {
                numOpen++;
            }
            if (tokens[i].type === TokenTypes.endList && numOpen > 0) {
                numClose++;
            }
        }
    }

    return numOpen > numClose;
}

export function isEditing(tokenType: string, curToken: JQLToken, cursorIndex: number): boolean {
    return curToken.type === tokenType && cursorIndex < curToken.offset + curToken.text.length;
}

export function isInOrderBy(curToken: JQLToken, tokens: JQLToken[]): boolean {
    if (curToken.type === TokenTypes.orderBy) {
        return true;
    }

    if (curToken.type !== TokenTypes.emptyToken && curToken.tokenIndex > 0) {
        for (let i = curToken.tokenIndex - 1; i > 0; i--) {
            if (
                tokens[i].type === TokenTypes.orderBy ||
                tokens[i].type === TokenTypes.errOrderBy ||
                tokens[i].type === TokenTypes.orderByDirection
            ) {
                return true;
            }
            if (
                tokens[i].type !== TokenTypes.fieldName &&
                tokens[i].type !== TokenTypes.comma &&
                tokens[i].type !== TokenTypes.WS
            ) {
                return false;
            }
        }
    }

    return false;
}

export function isInFunction(curToken: JQLToken, tokens: JQLToken[]): boolean {
    if (
        curToken.type === TokenTypes.startFunc ||
        curToken.type === TokenTypes.endFunc ||
        curToken.type === TokenTypes.errFuncValue
    ) {
        return true;
    }

    if (curToken.type !== TokenTypes.emptyToken && curToken.tokenIndex > 0) {
        for (let i = curToken.tokenIndex - 1; i > 0; i--) {
            if (tokens[i].type === TokenTypes.startFunc || tokens[i].type === TokenTypes.errFuncValue) {
                return true;
            }
            if (
                tokens[i].type !== TokenTypes.startFunc &&
                tokens[i].type !== TokenTypes.comma &&
                tokens[i].type !== TokenTypes.WS &&
                tokens[i].type !== TokenTypes.value
            ) {
                return false;
            }
        }
    }

    return false;
}

export function backTrackUntil(oneOf: string[], curToken: JQLToken, tokens: JQLToken[]): string {
    const oneOfLower = oneOf.map((s) => s.toLowerCase());
    if (!curToken.type) {
        return '';
    }
    if (oneOfLower.includes(curToken.type.toLowerCase())) {
        return curToken.type;
    }

    if (curToken.type !== TokenTypes.emptyToken && curToken.tokenIndex > 0) {
        for (let i = curToken.tokenIndex - 1; i > 0; i--) {
            const tkn = tokens[i];

            if (tkn.type && oneOfLower.includes(tkn.type.toLowerCase())) {
                return tkn.type;
            }
        }
    }

    return '';
}

export function isInPredicate(curToken: JQLToken, tokens: JQLToken[]): boolean {
    if (curToken.type === TokenTypes.predicateName) {
        return true;
    }

    if (curToken.type !== TokenTypes.emptyToken && curToken.tokenIndex > 0) {
        for (let i = curToken.tokenIndex - 1; i > 0; i--) {
            if (tokens[i].type === TokenTypes.predicateName) {
                return true;
            }
            if (
                tokens[i].type !== TokenTypes.startFunc &&
                tokens[i].type !== TokenTypes.comma &&
                tokens[i].type !== TokenTypes.WS &&
                tokens[i].type !== TokenTypes.value &&
                tokens[i].type !== TokenTypes.startList &&
                tokens[i].type !== TokenTypes.endList &&
                tokens[i].type !== TokenTypes.endFunc
            ) {
                return false;
            }
        }
    }

    return false;
}

export function typeForField(fieldData: JqlFieldRestData | undefined): string {
    if (fieldData === undefined) {
        return '';
    }

    return fieldData.types.length > 0 ? fieldData.types[0] : '';
}

export function typeForPredicate(token: JQLToken): string {
    if (token.type !== TokenTypes.predicateName) {
        return '';
    }

    const tokenValue = token.value.toUpperCase();
    return tokenValue in PredicateTypes ? PredicateTypes[tokenValue as keyof typeof PredicateTypes] : '';
}

export function isSeparatorToken(token: JQLToken): boolean {
    return SeparatorTokens.includes(token.type || '');
}

export function isEmptyToken(token: JQLToken): boolean {
    return token.type === TokenTypes.emptyToken;
}

export function sortByLength(one: string, two: string): number {
    return one.length - two.length;
}

export function getValidFunctionsForField(
    field: JqlFieldRestData | undefined,
    functions: JqlFuncRestData[],
): JqlFuncRestData[] {
    if (field === undefined) {
        return [];
    }

    return functions.filter((f) => f.types.length > 0 && field.types.includes(f.types[0]));
}

export function getFunctionsForType(fType: string, functions: JqlFuncRestData[]): JqlFuncRestData[] {
    if (fType === '') {
        return [];
    }

    return functions.filter((f) => f.types.length > 0 && fType.toLowerCase() === f.types[0].toLowerCase());
}

export function getUserInputPrefix(token: JQLToken, cursorIndex: number): string {
    let prefix: string = '';
    //var quotedPrefix: string = '';

    if (cursorIndex > token.offset) {
        prefix = token.value;
        //quotedPrefix = token.text.substr(0, cursorIndex - token.offset);

        const newCursorIndex =
            (token.text.endsWith('"') || token.text.endsWith("'")) && cursorIndex === token.offset + token.text.length
                ? cursorIndex - 1
                : cursorIndex;

        if (newCursorIndex > token.offset) {
            prefix = token.value.substr(0, newCursorIndex - token.offset);
        }
    }

    return prefix.toLowerCase();
}

export function forceRemoveQuotes(str: string): string {
    return str.replace(/(^")|(^')|("$)|('$)/g, '');
}
