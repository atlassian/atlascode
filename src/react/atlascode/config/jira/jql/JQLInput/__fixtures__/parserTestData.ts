import { Token } from '@atlassianlabs/moo-relexed';

import { TokenTypes } from '../jqlConstants';

/*
format is:
['some jql', // the jql under test
    2, // the index of the cursor in the text
    // an object of TestData
    { ... }
],
*/

export interface TestData {
    openGroups: number;
    openLists: number;
    openFunc: boolean;
    currentToken: TestToken;
    previousToken: TestToken;
    previousNonWSToken: TestToken;
    nextToken: TestToken;
    currentField: TestToken;
    currentOperator: TestToken;
    currentPredicate: TestToken;
}

export type TestToken = Pick<Token, 'type' | 'text' | 'value'>;

const emptyTestToken: TestToken = { type: TokenTypes.emptyToken, value: '', text: '' };

export const parserTestData = [
    //CREATES
    [
        ``,
        0,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: emptyTestToken,
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: emptyTestToken,
            currentField: emptyTestToken,
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `p`,
        `p`.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'p', text: 'p' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'p', text: 'p' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `proj`,
        `proj`.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'proj', text: 'proj' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'proj', text: 'proj' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `proj `,
        `proj `.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            previousToken: { type: TokenTypes.fieldName, value: 'proj', text: 'proj' },
            previousNonWSToken: { type: TokenTypes.fieldName, value: 'proj', text: 'proj' },
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'proj', text: 'proj' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `proj was not me`,
        `proj was not me`.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.value, value: 'me', text: 'me' },
            previousToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            previousNonWSToken: { type: TokenTypes.operator, value: 'was not', text: 'was not' },
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'proj', text: 'proj' },
            currentOperator: { type: TokenTypes.operator, value: 'was not', text: 'was not' },
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `(project = myproject) a`,
        `(project = myproject) a`.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.join, value: 'a', text: 'a' },
            previousToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            previousNonWSToken: { type: TokenTypes.endGroup, value: ')', text: ')' },
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: { type: TokenTypes.operator, value: '=', text: '=' },
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject a`,
        `project = myproject a`.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.join, value: 'a', text: 'a' },
            previousToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            previousNonWSToken: { type: TokenTypes.value, value: 'myproject', text: 'myproject' },
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: { type: TokenTypes.operator, value: '=', text: '=' },
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `assignee = currentUser(`,
        `assignee = currentUser(`.length,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: true,
            currentToken: { type: TokenTypes.startFunc, value: 'currentUser(', text: 'currentUser(' },
            previousToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            previousNonWSToken: { type: TokenTypes.operator, value: '=', text: '=' },
            nextToken: emptyTestToken,
            currentField: { type: TokenTypes.fieldName, value: 'assignee', text: 'assignee' },
            currentOperator: { type: TokenTypes.operator, value: '=', text: '=' },
            currentPredicate: emptyTestToken,
        } as TestData,
    ],

    // EDITS
    [
        `project = myproject`,
        0,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: '', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `"project" = myproject`,
        3,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: '"project"' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: '"project"' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject`,
        7,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject order by fixVersion DESC`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject order by fixVersion DESC`,
        22,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.orderBy, value: 'or', text: 'order by' },
            previousToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            previousNonWSToken: { type: TokenTypes.value, value: 'myproject', text: 'myproject' },
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: { type: TokenTypes.operator, value: '=', text: '=' },
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject order by fixVersion, assignee DESC`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject AND (assignee = "me" OR assignee = "not me")`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject AND (assignee = "me" OR assignee = "not me") order by fixVersion, assignee DESC`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject AND (status WAS "In Progress" BY "me" AFTER now() BEFORE lastWeek())`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
    [
        `project = myproject AND (status WAS "In Progress" BY "me" AFTER now() BEFORE lastWeek())order by fixVersion, assignee DESC`,
        2,
        {
            openGroups: 0,
            openLists: 0,
            openFunc: false,
            currentToken: { type: TokenTypes.fieldName, value: 'pr', text: 'project' },
            previousToken: emptyTestToken,
            previousNonWSToken: emptyTestToken,
            nextToken: { type: TokenTypes.WS, value: ' ', text: ' ' },
            currentField: { type: TokenTypes.fieldName, value: 'project', text: 'project' },
            currentOperator: emptyTestToken,
            currentPredicate: emptyTestToken,
        } as TestData,
    ],
];
