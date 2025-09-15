export const pullrequestDC = {
    id: 123,
    version: 0,
    title: 'test-branch',
    state: 'OPEN',
    open: true,
    closed: false,
    draft: false,
    createdDate: 1757000629662,
    updatedDate: 1757000629662,
    fromRef: {
        id: 'refs/heads/test-branch',
        displayId: 'test-branch',
        latestCommit: 'def456abc789012345678901234567890123456',
        type: 'BRANCH',
        repository: {
            slug: 'dc-mocked-repo',
            id: 1,
            name: 'dc-mocked-repo',
            hierarchyId: 'bf29c75d66fd50070728',
            scmId: 'git',
            state: 'AVAILABLE',
            statusMessage: 'Available',
            forkable: true,
            project: {
                key: 'dc-mocked-repo',
                id: 1,
                name: 'dc-mocked-repo',
                public: false,
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://bitbucket.mockeddomain.com/projects/mocked-project',
                        },
                    ],
                },
                avatarUrl: 'https://example.com/avatar.png',
            },
            public: false,
            archived: false,
            links: {
                clone: [
                    {
                        href: 'https://bitbucket.mockeddomain.com/scm/mocked-project/dc-mocked-repo.git',
                        name: 'http',
                    },
                    {
                        href: 'ssh://git@https://bitbucket.mockeddomain.com:7999/mocked-project/dc-mocked-repo.git',
                        name: 'ssh',
                    },
                ],
                self: [
                    {
                        href: 'https://bitbucket.mockeddomain.com/projects/mocked-project/repos/dc-mocked-repo/browse',
                    },
                ],
            },
        },
    },
    toRef: {
        id: 'refs/heads/main',
        displayId: 'main',
        latestCommit: 'abcdef1234567890abcdef1234567890abcdef12',
        type: 'BRANCH',
        repository: {
            slug: 'dc-mocked-repo',
            id: 1,
            name: 'dc-mocked-repo',
            hierarchyId: 'bf29c75d66fd50070728',
            scmId: 'git',
            state: 'AVAILABLE',
            statusMessage: 'Available',
            forkable: true,
            project: {
                key: 'dc-mocked-repo',
                id: 1,
                name: 'dc-mocked-repo',
                public: false,
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://bitbucket.mockeddomain.com/projects/mocked-project',
                        },
                    ],
                },
                avatarUrl: 'https://example.com/avatar.png',
            },
            public: false,
            archived: false,
            links: {
                clone: [
                    {
                        href: 'https://bitbucket.mockeddomain.com/scm/mocked-project/dc-mocked-repo.git',
                        name: 'http',
                    },
                    {
                        href: 'ssh://git@https://bitbucket.mockeddomain.com:7999/mocked-project/dc-mocked-repo.git',
                        name: 'ssh',
                    },
                ],
                self: [
                    {
                        href: 'https://bitbucket.mockeddomain.com/projects/mocked-project/repos/dc-mocked-repo/browse',
                    },
                ],
            },
        },
    },
    locked: false,
    author: {
        user: {
            name: 'mockuser2',
            emailAddress: 'mockuser2@atlassian.code',
            active: true,
            displayName: 'Mock User',
            id: 2,
            slug: 'mockuser2',
            type: 'NORMAL',
            links: {
                self: [
                    {
                        href: 'https://bitbucket.mockeddomain.com/users/mockuser2',
                    },
                ],
            },
            avatarUrl: 'https://example.com/avatar.png',
        },
        role: 'AUTHOR',
        approved: false,
        status: 'UNAPPROVED',
    },
    reviewers: [
        {
            user: {
                name: 'mockuser',
                emailAddress: 'mockuser@atlassian.code',
                active: true,
                displayName: 'mockuser',
                id: 4,
                slug: 'mockuser',
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://bitbucket.mockeddomain.com/users/mockuser',
                        },
                    ],
                },
                avatarUrl: 'https://example.com/avatar.png',
            },
            role: 'REVIEWER',
            approved: false,
            status: 'UNAPPROVED',
        },
    ],
    participants: [],
    links: {
        self: [
            {
                href: 'https://bitbucket.mockeddomain.com/projects/mocked-project/repos/dc-mocked-repo/pull-requests/123',
            },
        ],
    },
};
