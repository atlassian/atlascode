import { TokenTypes } from '../jqlConstants';

/*
format is:
['some jql', // the jql under test

    //an array of expected tokens
    [
        { t: TokenTypes.fieldName // the token type, v: 'priority' // the expected value },
    ]
],
*/

export const lexerTestData = [
    [
        `project in( ,)`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `project = myproject`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
        ],
    ],
    [
        `(project = myproject)`,
        [
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.endGroup, v: ')' },
        ],
    ],
    [
        `priority = 'qwerty'`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: "'qwerty'" },
        ],
    ],
    [
        `priority = \"qwerty\"`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: '"qwerty"' },
        ],
    ],
    [
        `priority =      "qwerty"       `,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: '"qwerty"' },
        ],
    ],
    [
        `key = one-1`,
        [
            { t: TokenTypes.fieldName, v: 'key' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'one-1' },
        ],
    ],
    [
        `key in (one-1, -1)`,
        [
            { t: TokenTypes.fieldName, v: 'key' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'one-1' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '-1' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `key in (one-1, 1-1)`,
        [
            { t: TokenTypes.fieldName, v: 'key' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'one-1' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '1-1' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `-78a = a`,
        [
            { t: TokenTypes.fieldName, v: '-78a' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'a' },
        ],
    ],
    [
        `numberfield >= -29202`,
        [
            { t: TokenTypes.fieldName, v: 'numberfield' },
            { t: TokenTypes.operator, v: '>=' },
            { t: TokenTypes.value, v: '-29202' },
        ],
    ],
    [
        `numberfield >= -29202-`,
        [
            { t: TokenTypes.fieldName, v: 'numberfield' },
            { t: TokenTypes.operator, v: '>=' },
            { t: TokenTypes.value, v: '-29202-' },
        ],
    ],
    [
        `numberfield >= w-88 `,
        [
            { t: TokenTypes.fieldName, v: 'numberfield' },
            { t: TokenTypes.operator, v: '>=' },
            { t: TokenTypes.value, v: 'w-88' },
        ],
    ],
    [
        `(project = myproject) a`,
        [
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.endGroup, v: ')' },
            { t: TokenTypes.join, v: 'a' },
        ],
    ],
    [
        `project = myproject a`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.join, v: 'a' },
        ],
    ],
    [
        `project = "Another Project" AND (fixVersion in unreleasedVersions() or fixVersion = "1.0")`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: '"Another Project"' },
            { t: TokenTypes.join, v: 'AND' },
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'fixVersion' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startFunc, v: 'unreleasedVersions(' },
            { t: TokenTypes.endFunc, v: ')' },
            { t: TokenTypes.join, v: 'or' },
            { t: TokenTypes.fieldName, v: 'fixVersion' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: '"1.0"' },
            { t: TokenTypes.endGroup, v: ')' },
        ],
    ],

    // Test dev/jira.properties
    [
        `development[pullrequests].all > 0 AND NOT development[pullrequests].open > 0`,
        [
            { t: TokenTypes.fieldName, v: 'development[pullrequests].all' },
            { t: TokenTypes.operator, v: '>' },
            { t: TokenTypes.value, v: '0' },
            { t: TokenTypes.join, v: 'AND' },
            { t: TokenTypes.not, v: 'NOT' },
            { t: TokenTypes.fieldName, v: 'development[pullrequests].open' },
            { t: TokenTypes.operator, v: '>' },
            { t: TokenTypes.value, v: '0' },
        ],
    ],

    // Test groupings
    [
        `project = myproject and(me != you)`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.join, v: 'and' },
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'me' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.value, v: 'you' },
            { t: TokenTypes.endGroup, v: ')' },
        ],
    ],
    [
        `project = myproject and   (me != "you")`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.join, v: 'and' },
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'me' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.value, v: '"you"' },
            { t: TokenTypes.endGroup, v: ')' },
        ],
    ],
    [
        `project = myproject and not (me = "you" or me='nobody')`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.join, v: 'and' },
            { t: TokenTypes.not, v: 'not' },
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'me' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: '"you"' },
            { t: TokenTypes.join, v: 'or' },
            { t: TokenTypes.fieldName, v: 'me' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: "'nobody'" },
            { t: TokenTypes.endGroup, v: ')' },
        ],
    ],
    [
        `project = VSC or (project = myproject and not (me = "you" or me='nobody'))`,
        [
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'VSC' },
            { t: TokenTypes.join, v: 'or' },
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'project' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: 'myproject' },
            { t: TokenTypes.join, v: 'and' },
            { t: TokenTypes.not, v: 'not' },
            { t: TokenTypes.startGroup, v: '(' },
            { t: TokenTypes.fieldName, v: 'me' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: '"you"' },
            { t: TokenTypes.join, v: 'or' },
            { t: TokenTypes.fieldName, v: 'me' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: "'nobody'" },
            { t: TokenTypes.endGroup, v: ')' },
            { t: TokenTypes.endGroup, v: ')' },
        ],
    ],
    // Test functions
    [
        `somefield != currentUser()`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'currentUser(' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield != currentUser(              )`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'currentUser(' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield != currentUser           (              )`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'currentUser           (' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield != "currentUser"           (              )`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: '"currentUser"           (' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield != "currentUser"(              )`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: '"currentUser"(' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield !=users("one",two)`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'users(' },
            { t: TokenTypes.value, v: '"one"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'two' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield !=users("one",two, 'three')`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'users(' },
            { t: TokenTypes.value, v: '"one"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'two' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: "'three'" },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield !=users(      "one"       ,        two)`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'users(' },
            { t: TokenTypes.value, v: '"one"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'two' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield !=users(    "on e",      two, 'th   ree')`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: 'users(' },
            { t: TokenTypes.value, v: '"on e"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'two' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: "'th   ree'" },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `somefield !='users'("one",two)`,
        [
            { t: TokenTypes.fieldName, v: 'somefield' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.startFunc, v: "'users'(" },
            { t: TokenTypes.value, v: '"one"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'two' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    // Test predicates
    [
        `priority was 'qwerty'`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: 'was' },
            { t: TokenTypes.value, v: "'qwerty'" },
        ],
    ],
    [
        `priority was 'qwerty' by 'me'`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: 'was' },
            { t: TokenTypes.value, v: "'qwerty'" },
            { t: TokenTypes.predicateName, v: 'by' },
            { t: TokenTypes.value, v: "'me'" },
        ],
    ],
    [
        `priority was 'qwerty' by 'me' after today()`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: 'was' },
            { t: TokenTypes.value, v: "'qwerty'" },
            { t: TokenTypes.predicateName, v: 'by' },
            { t: TokenTypes.value, v: "'me'" },
            { t: TokenTypes.predicateName, v: 'after' },
            { t: TokenTypes.startFunc, v: 'today(' },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `priority was 'qwerty' by 'me' after now() during("some date", "some other date")`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: 'was' },
            { t: TokenTypes.value, v: "'qwerty'" },
            { t: TokenTypes.predicateName, v: 'by' },
            { t: TokenTypes.value, v: "'me'" },
            { t: TokenTypes.predicateName, v: 'after' },
            { t: TokenTypes.startFunc, v: 'now(' },
            { t: TokenTypes.endFunc, v: ')' },
            { t: TokenTypes.predicateName, v: 'during' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: '"some date"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"some other date"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `priority was 'qwerty' by 'me' after now() during("some date", "some other date") order by key desc`,
        [
            { t: TokenTypes.fieldName, v: 'priority' },
            { t: TokenTypes.operator, v: 'was' },
            { t: TokenTypes.value, v: "'qwerty'" },
            { t: TokenTypes.predicateName, v: 'by' },
            { t: TokenTypes.value, v: "'me'" },
            { t: TokenTypes.predicateName, v: 'after' },
            { t: TokenTypes.startFunc, v: 'now(' },
            { t: TokenTypes.endFunc, v: ')' },
            { t: TokenTypes.predicateName, v: 'during' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: '"some date"' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"some other date"' },
            { t: TokenTypes.endList, v: ')' },
            { t: TokenTypes.orderBy, v: 'order by' },
            { t: TokenTypes.fieldName, v: 'key' },
            { t: TokenTypes.orderByDirection, v: 'desc' },
        ],
    ],
    //Test to ensure that newline is accepted.
    [
        `newline = \"hello\nworld\"`,
        [
            { t: TokenTypes.fieldName, v: 'newline' },
            { t: TokenTypes.operator, v: '=' },

            { t: TokenTypes.value, v: '"hello\nworld"' },
        ],
    ],
    [
        `newline = \"hello\\nworld\"`,
        [
            { t: TokenTypes.fieldName, v: 'newline' },
            { t: TokenTypes.operator, v: '=' },

            { t: TokenTypes.value, v: '"hello\\nworld"' },
        ],
    ],
    [
        `newline = 'hello\r'`,
        [
            { t: TokenTypes.fieldName, v: 'newline' },
            { t: TokenTypes.operator, v: '=' },

            { t: TokenTypes.value, v: "'hello\r'" },
        ],
    ],
    [
        `newline = 'hello\\r'`,
        [
            { t: TokenTypes.fieldName, v: 'newline' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: "'hello\\r'" },
        ],
    ],
    [
        `newline = '\r'`,
        [
            { t: TokenTypes.fieldName, v: 'newline' },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.value, v: "'\r'" },
        ],
    ],
    [
        `newline = '\\r'`,
        [
            { t: TokenTypes.fieldName, v: 'newline' },
            { t: TokenTypes.operator, v: '=' },

            { t: TokenTypes.value, v: "'\\r'" },
        ],
    ],
    [
        `'new\nline' = 'b'`,
        [
            { t: TokenTypes.fieldName, v: "'new\nline'" },

            { t: TokenTypes.operator, v: '=' },

            { t: TokenTypes.value, v: "'b'" },
        ],
    ],
    [
        `'new\\nline' = 'b'`,
        [
            { t: TokenTypes.fieldName, v: "'new\\nline'" },

            { t: TokenTypes.operator, v: '=' },

            { t: TokenTypes.value, v: "'b'" },
        ],
    ],
    [
        `'newline' = 'fun\rc'()`,
        [
            { t: TokenTypes.fieldName, v: "'newline'" },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.startFunc, v: "'fun\rc'(" },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    [
        `'newline' = 'fun\\rc'()`,
        [
            { t: TokenTypes.fieldName, v: "'newline'" },
            { t: TokenTypes.operator, v: '=' },
            { t: TokenTypes.startFunc, v: "'fun\\rc'(" },
            { t: TokenTypes.endFunc, v: ')' },
        ],
    ],
    // //Some tests for the other operators.
    [
        `coolness >= awesome`,
        [
            { t: TokenTypes.fieldName, v: 'coolness' },
            { t: TokenTypes.operator, v: '>=' },
            { t: TokenTypes.value, v: 'awesome' },
        ],
    ],
    [
        `coolness > awesome`,
        [
            { t: TokenTypes.fieldName, v: 'coolness' },
            { t: TokenTypes.operator, v: '>' },
            { t: TokenTypes.value, v: 'awesome' },
        ],
    ],
    [
        `coolness < awesome`,
        [
            { t: TokenTypes.fieldName, v: 'coolness' },
            { t: TokenTypes.operator, v: '<' },
            { t: TokenTypes.value, v: 'awesome' },
        ],
    ],
    [
        `coolness <= awesome`,
        [
            { t: TokenTypes.fieldName, v: 'coolness' },
            { t: TokenTypes.operator, v: '<=' },
            { t: TokenTypes.value, v: 'awesome' },
        ],
    ],
    [
        `coolness        !=       awesome order     by     coolness desc`,
        [
            { t: TokenTypes.fieldName, v: 'coolness' },
            { t: TokenTypes.operator, v: '!=' },
            { t: TokenTypes.value, v: 'awesome' },
            { t: TokenTypes.orderBy, v: 'order     by' },
            { t: TokenTypes.fieldName, v: 'coolness' },
            { t: TokenTypes.orderByDirection, v: 'desc' },
        ],
    ],

    //Some tests for the in operator.
    [
        `language not in (java, c, \"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'language' },
            { t: TokenTypes.operator, v: 'not in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `languagein  NOT   IN    (   java, c     , \"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'languagein' },
            { t: TokenTypes.operator, v: 'NOT   IN' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `inlanguage in (java, c, \"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'inlanguage' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri in (java,c,\"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri in(java)`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri In(java)`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'In' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri iN(java)`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'iN' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],

    //Some tests for the NOT in operator.
    [
        `language not in (java, c, \"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'language' },
            { t: TokenTypes.operator, v: 'not in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `languagein  NOT   IN    (   java, c     , \"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'languagein' },
            { t: TokenTypes.operator, v: 'NOT   IN' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `inlanguage not in (java, c, \"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'inlanguage' },
            { t: TokenTypes.operator, v: 'not in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri NOT in (java,c,\"python2\")`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'NOT in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: 'c' },
            { t: TokenTypes.comma, v: ',' },
            { t: TokenTypes.value, v: '"python2"' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri not in(java)`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'not in' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri NoT In(java)`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'NoT In' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],
    [
        `pri nOT iN(java)`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'nOT iN' },
            { t: TokenTypes.startList, v: '(' },
            { t: TokenTypes.value, v: 'java' },
            { t: TokenTypes.endList, v: ')' },
        ],
    ],

    // // Some tests for the NOT_LIKE operator.
    [
        `pri !~ stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: '!~' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri!~stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: '!~' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri !~ 12`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: '!~' },
            { t: TokenTypes.value, v: '12' },
        ],
    ],
    [
        `pri!~12`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: '!~' },
            { t: TokenTypes.value, v: '12' },
        ],
    ],
    [
        `pri !~ \"stuff\"`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: '!~' },
            { t: TokenTypes.value, v: '"stuff"' },
        ],
    ],

    // // Some tests for the IS operator
    [
        `pri IS stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'IS' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri is stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'is' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri IS EMPTY`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'IS' },
            { t: TokenTypes.value, v: 'EMPTY' },
        ],
    ],

    // // Some tests for the IS_NOT operator
    [
        `pri IS NOT stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'IS NOT' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri IS not stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'IS not' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri is Not stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'is Not' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
    [
        `pri is not stuff`,
        [
            { t: TokenTypes.fieldName, v: 'pri' },
            { t: TokenTypes.operator, v: 'is not' },
            { t: TokenTypes.value, v: 'stuff' },
        ],
    ],
]; //?
