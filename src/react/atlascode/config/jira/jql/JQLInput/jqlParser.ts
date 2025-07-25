import { Token } from '@atlassianlabs/moo-relexed';

import { JQLToken, ParserData, TokenBlock } from '../jqlTypes';
import { EmptyToken, TokenTypes } from './jqlConstants';
import { JqlLexer } from './jqlLexer';

// TODO: AXON-687 get rid of vars after migration
/* eslint-disable no-var */
export function tokenBlock(tokens: JQLToken[], index: number): TokenBlock {
    const prev = index > 0 ? tokens[index - 1] : EmptyToken;
    const current: JQLToken = tokens[index];
    const next = index < tokens.length - 1 ? tokens[index + 1] : EmptyToken;

    let prevNonWS: JQLToken = EmptyToken;
    if (current.tokenIndex > 0) {
        for (var i = current.tokenIndex - 1; i >= 0; i--) {
            if (tokens[i].type !== TokenTypes.WS) {
                prevNonWS = tokens[i];
                break;
            }
        }
    }

    let nextNonWS: JQLToken = EmptyToken;
    if (current.tokenIndex < tokens.length) {
        for (var i = current.tokenIndex + 1; i < tokens.length; i++) {
            if (tokens[i].type !== TokenTypes.WS) {
                nextNonWS = tokens[i];
                break;
            }
        }
    }

    return { previous: prev, previousNonWS: prevNonWS, current: current, next: next, nextNonWS: nextNonWS };
}

export function tokenBlockForCursorIndex(tokens: JQLToken[], cursorIndex: number): TokenBlock {
    let current: JQLToken = EmptyToken;
    let previous: JQLToken = EmptyToken;
    let previousNonWS: JQLToken = EmptyToken;
    let next: JQLToken = EmptyToken;
    let nextNonWS: JQLToken = EmptyToken;

    for (let i = 0; i < tokens.length; i++) {
        ({ previous, previousNonWS, current, next, nextNonWS } = tokenBlock(tokens, i));
        if (current && i < tokens.length - 1 && next && next.col > cursorIndex) {
            break;
        }
    }

    return { previous: previous, previousNonWS: previousNonWS, current: current, next: next, nextNonWS: nextNonWS };
}

export function findNextTokenOfType(type: string, startIndex: number, tokens: JQLToken[]): JQLToken {
    let found: JQLToken = EmptyToken;

    for (let i = startIndex; i < tokens.length; i++) {
        if (tokens[i].type === type) {
            found = tokens[i];
            break;
        }
    }

    return found;
}

export function findPreviousTokenOfType(type: string, startIndex: number, tokens: JQLToken[]): JQLToken {
    let found: JQLToken = EmptyToken;

    for (let i = startIndex - 1; i >= 0; i--) {
        if (tokens[i].type === type) {
            found = tokens[i];
            break;
        }
    }

    return found;
}

export function parseUntilCurrentToken(
    jqlInput: string,
    cursorIndex: number,
    ws: boolean = true,
): [ParserData, JQLToken[]] {
    JqlLexer.reset(jqlInput);

    let tokens: JQLToken[] = Array.from(JqlLexer).map<JQLToken>((t: Token, i: number) => ({ ...t, tokenIndex: i }));

    if (!ws) {
        tokens = tokens
            .filter((t) => t.type !== TokenTypes.WS)
            .map<JQLToken>((t: Token, i: number) => ({ ...t, tokenIndex: i }));
    }

    let openGroups: number = 0;
    let openLists: number = 0;
    let openFunc: boolean = false;
    let currentField: JQLToken = EmptyToken;
    let currentOperator: JQLToken = EmptyToken;
    let currentPredicate: JQLToken = EmptyToken;

    //tokens
    let current: JQLToken = EmptyToken;
    let previous: JQLToken = EmptyToken;
    let previousNonWS: JQLToken = EmptyToken;
    let next: JQLToken = EmptyToken;
    let nextNonWS: JQLToken = EmptyToken;

    for (let i: number = 0; i < tokens.length; i++) {
        const token = tokens[i];
        ({ previous, previousNonWS, current, next, nextNonWS } = tokenBlock(tokens, i));
        switch (token.type) {
            case TokenTypes.startGroup: {
                currentPredicate = EmptyToken;
                openGroups++;
                break;
            }
            case TokenTypes.endGroup: {
                currentPredicate = EmptyToken;
                openGroups--;
                break;
            }
            case TokenTypes.errFieldName:
            case TokenTypes.fieldName: {
                currentPredicate = EmptyToken;
                currentField = token;
                break;
            }
            case TokenTypes.startList: {
                openLists++;
                break;
            }
            case TokenTypes.endList: {
                openLists--;
                break;
            }
            case TokenTypes.errOperator:
            case TokenTypes.operator: {
                currentOperator = token;
                break;
            }
            case TokenTypes.startFunc: {
                openFunc = true;
                break;
            }
            case TokenTypes.endFunc: {
                openFunc = false;
                break;
            }
            case TokenTypes.value: {
                // just here so we can break on it during debugging
                break;
            }
            case TokenTypes.predicateName: {
                currentPredicate = token;
                break;
            }

            case TokenTypes.orderByDirection:
            case TokenTypes.orderBy:
            case TokenTypes.not:
            case TokenTypes.join: {
                currentPredicate = EmptyToken;
                break;
            }

            default: {
            }
        }

        // remove quotes from values (but keep them on the text prop)
        let truncatedValue: string = jqlInput.substr(current.offset, cursorIndex - current.offset);

        if (truncatedValue.startsWith('"') || truncatedValue.startsWith("'")) {
            truncatedValue = truncatedValue.substr(1);
        }

        if (truncatedValue.endsWith('"') || truncatedValue.endsWith("'")) {
            truncatedValue = truncatedValue.slice(0, -1);
        }

        if (current.value.startsWith('"') || current.value.startsWith("'")) {
            current.value = current.value.substr(1);
        }

        if (current.value.endsWith('"') || current.value.endsWith("'")) {
            current.value = current.value.slice(0, -1);
        }

        current = { ...current, ...{ value: truncatedValue } };

        // stop if we've reached the end or the cursor index
        if (
            current.type !== TokenTypes.emptyToken &&
            i < tokens.length - 1 &&
            next.type !== TokenTypes.emptyToken &&
            next.col > cursorIndex
        ) {
            break;
        }
    }

    return [
        {
            openGroups: openGroups,
            openLists: openLists,
            openFunc: openFunc,
            currentToken: current,
            previousToken: previous,
            previousNonWSToken: previousNonWS,
            nextToken: next,
            nextNonWSToken: nextNonWS,
            currentField: currentField,
            currentOperator: currentOperator,
            currentPredicate: currentPredicate,
        },
        tokens,
    ];
}
