export const prCommentPost = {
    id: 'pr-comment-124',
    content: {
        raw: 'This is a test comment added to the pull request via e2e test',
        markup: 'markdown',
        html: '<p>This is a test comment added to the pull request via e2e test</p>',
    },
    created_on: '2025-01-17T14:18:00+00:00',
    updated_on: '2025-01-17T14:18:00+00:00',
    user: {
        type: 'user',
        display_name: 'Mock User',
        uuid: '{mock-uuid}',
        account_id: 'mock-account-id',
        username: 'mockuser',
        links: {
            self: {
                href: 'https://api.bitbucket.org/2.0/users/%7Bmock-uuid%7D',
            },
            html: {
                href: 'https://bitbucket.org/%7Bmock-uuid%7D/',
            },
            avatar: {
                href: 'https://example.com/avatar.png',
            },
        },
    },
    deleted: false,
    type: 'pullrequest_comment',
    links: {
        self: {
            href: 'https://api.bitbucket.org/2.0/repositories/mockuser/test-repository/pullrequests/123/comments/pr-comment-124',
        },
        html: {
            href: 'https://bitbucket.org/mockuser/test-repository/pull-requests/123/_/diff#comment-pr-comment-124',
        },
    },
    pullrequest: {
        id: 123,
        type: 'pullrequest',
        links: {
            self: {
                href: 'https://api.bitbucket.org/2.0/repositories/mockuser/test-repository/pullrequests/123',
            },
            html: {
                href: 'https://bitbucket.org/mockuser/test-repository/pull-requests/123',
            },
        },
    },
};
