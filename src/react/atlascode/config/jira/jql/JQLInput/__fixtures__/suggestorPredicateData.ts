/*
format is:
['some jql', // the jql under test
    2, // the index of the cursor in the text
    // an array of expected suggestions (use NONE for empty array)
    [],
    // an array of suggestions that should NOT be in the results
    [],
],
*/

export const suggestorPredicateData = [
    [
        `status changed FROM "In Progress" TO Done BY currentUser() b`,
        60,
        ['BEFORE'],
        ['TO', 'AFTER', 'DURING (', 'ON', 'AND', 'OR', 'ORDER BY'],
    ],
    [`status changed F`, 16, ['FROM'], ['TO', 'AFTER', 'BEFORE', 'BY', 'DURING (', 'ON', 'AND', 'OR', 'ORDER BY']],
    [
        `status changed FROM "In Progress" T`,
        35,
        ['TO'],
        ['AFTER', 'BEFORE', 'BY', 'DURING (', 'ON', 'AND', 'OR', 'ORDER BY'],
    ],
    [
        `status changed FROM "In Progress" TO Declined AFTER currentLogin() `,
        67,
        ['AFTER', 'BEFORE', 'BY', 'DURING (', 'ON', 'AND', 'OR', 'ORDER BY'],
        [],
    ],
    [`status was VTS DURING ( endOfWeek() ,  cur`, 35, ['NONE'], []],
    [`status was VTS DURING ( endOfWeek() ,  cur`, 42, ['currentLogin()'], []],
    [`status changed FROM VTC TO VTS DURING ( endOfWeek() ,`, 53, ['now()'], []],
    [`status changed FROM VTC TO VTS DURING ( endOfWeek() `, 52, [','], []],
    [
        `status changed FROM VTC `,
        24,
        ['after', 'before', 'by', 'during (', 'on', 'from', 'to', 'and', 'or', 'order by'],
        [],
    ],
    [`status changed DURING `, 22, ['('], []],
    [`status changed DURING (`, 23, ['now()'], []],
    [`status changed `, 15, ['after', 'before', 'by', 'during (', 'on', 'from', 'to', 'and', 'or', 'order by'], []],
    [
        `status was "In Progress" BY someone BEFORE now() AFTER "2019/01/04"`,
        25,
        ['AFTER', 'BEFORE', 'BY', 'DURING', 'ON', 'AND', 'OR', 'ORDER BY'],
        [],
    ],
    [
        `status was "In Progress" BY someone BEFORE now() AFTER "2019/01/05"`,
        26,
        ['BEFORE', 'BY'],
        ['AFTER', 'DURING', 'ON', 'AND', 'OR', 'ORDER BY'],
    ],
    [
        `status was "In Progress" BY someone BEFORE now() AFTER "2019/01/06"`,
        27,
        ['BY'],
        ['BEFORE', 'AFTER', 'DURING', 'ON', 'AND', 'OR', 'ORDER BY'],
    ],
    [`status was "In Progress" BY someone BEFORE now() AFTER "2019/01/07"`, 28, ['currentuser()'], ['BY']],
    [`status was "In Progress" BY someone BEFORE now() AFTER "2019/01/08"`, 29, ['s (user)'], []],
    [
        `status was "In Progress" BY currentUser() BEFORE now() AFTER "2019/01/09"`,
        28,
        ['currentUser()', 'inactiveusers()'],
        [],
    ],
    [
        `status was "In Progress" BY currentUser() BEFORE now() AFTER "2019/01/10"`,
        30,
        ['currentUser()'],
        ['inactiveusers()'],
    ],
    [`status was "In Progress" BY someone BEFORE now() AFTER "2019/01/11"`, 33, ['someo (user)'], []],
    [
        `status was "In Progress" BY someone BEFORE now() AFTER "2019/01/12"`,
        36,
        ['AFTER', 'BEFORE', 'BY', 'DURING (', 'ON'],
        [],
    ],
    [
        `status was "In Progress" BY someone BEFORE now() AFTER "2019/01/13"`,
        42,
        ['BEFORE'],
        ['AFTER', 'BY', 'DURING', 'ON', 'AND', 'OR', 'ORDER BY'],
    ],
    [
        `status was "In Progress" BY someone BEFORE now() AFTER "2019/01/14"`,
        43,
        ['currentlogin()', 'endofday()', 'endofmonth()', 'endofweek()', 'endofyear()'],
        [],
    ],
];
