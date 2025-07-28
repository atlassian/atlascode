/*
format is:
['some jql', // the jql under test
    2, // the index of the cursor in the text
    'value', // the new value to insert
    'new jql', // the new jql expected
    5, // the new cursor index expected
],
*/

export const completionTestData = [
    [`project = "Another Project"`, 7, '', `project = "Another Project"`, 7],
    [`project = "Another Project"`, 27, '', `project = "Another Project"`, 27],
    [`project = "Another Project"`, 0, 'afield', `afield = "Another Project"`, 6],
    [`project = "Another Project"`, 3, 'afield', `afield = "Another Project"`, 6],
    [`project = "Another Project"`, 7, 'afield', `afield = "Another Project"`, 6],
    [`project = "Another Project"`, 8, '!=', `project != "Another Project"`, 10],
    [`project = "Another Project"`, 13, 'vscode', `project = vscode`, 16],
    [`project in ("A Project", "Another Project")`, 12, 'vscode', `project in (vscode, "Another Project")`, 18],
    [`assignee = currentUser()`, 11, 'currentUser()', `assignee = currentUser()`, 24],
    [`assignee = currentUser()`, 12, 'currentUser()', `assignee = currentUser()`, 24],
    [`assignee = currentUser()`, 12, 'currentUser()', `assignee = currentUser()`, 24],
    [`assignee = currentUser()`, 22, 'currentUser()', `assignee = currentUser()`, 24],
    [`assignee = currentUser()`, 23, 'currentUser()', `assignee = currentUser()`, 24],
    [`assignee = currentUser()`, 24, 'currentUser()', `assignee = currentUser()`, 24],
    [`assignee = currentUser() AND`, 24, 'currentUser()', `assignee = currentUser() AND`, 24],
    [`assignee = currentUser(      ) AND`, 15, 'currentUser()', `assignee = currentUser() AND`, 24],
    [`assignee = currentUser(      ) AND`, 15, 'currentUser()', `assignee = currentUser() AND`, 24],
    [`assignee = currentUser(      ) AND`, 22, 'currentUser()', `assignee = currentUser() AND`, 24],
    [`assignee = currentUser(      ) AND`, 23, 'currentUser()', `assignee = currentUser() AND`, 24],
    [`assignee = currentUser(      ) AND`, 30, 'currentUser()', `assignee = currentUser() AND`, 24],
    [`assignee `, 9, '=', `assignee =`, 10],
    [`pro`, 3, 'project', `project`, 7],
];
