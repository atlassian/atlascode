import { ServerPullRequestApi } from './pullRequests';
import { BitbucketSite } from '../model';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
jest.mock('../httpClient', () => ({
    HTTPClient: jest.fn().mockImplementation(() => ({
        get: mockGet,
        post: mockPost,
        put: mockPut,
        delete: mockDelete,
    })),
}));
import { HTTPClient } from '../httpClient';
import { AxiosResponse } from 'axios';

describe('ServerPullRequestApi', () => {
    let api: ServerPullRequestApi;
    const mockClient: HTTPClient = new HTTPClient('', '', '', async (errJson: AxiosResponse) => Error('some error'));
    let site: BitbucketSite;

    beforeEach(() => {
        jest.clearAllMocks();
        api = new ServerPullRequestApi(mockClient);
        site = { ownerSlug: 'owner', repoSlug: 'repo', details: { userId: 'user' } } as BitbucketSite;
    });

    it('should get with a v8 if no 404s', async () => {
        mockGet.mockImplementation((url, queryParams?) => {
            if (
                url.includes('/rest/api/1.0/projects/owner/repos/repo/pull-requests/PR-1/blocker-comments?count=true')
            ) {
                return Promise.resolve(getTaskCountDataV8);
            }
            if (
                url.includes('/rest/api/1.0/projects/owner/repos/repo/pull-requests/PR-1') &&
                queryParams?.['markup'] === true
            ) {
                return Promise.resolve({ data: getPullRequestData });
            }

            return Promise.reject(new Error('Not Found'));
        });

        await api.get(site, 'PR-1');

        expect(mockGet).lastCalledWith(
            '/rest/api/1.0/projects/owner/repos/repo/pull-requests/PR-1/blocker-comments?count=true',
        );
    });
});

const getTaskCountDataV8 = {
    data: {
        OPEN: 5,
    },
    headers: {},
};

const getPullRequestData = {
    id: 1,
    version: 4,
    title: 'a change',
    description: 'some words\\\n\\\nI can change the description\\\n\\\nChange me',
    state: 'OPEN',
    open: true,
    closed: false,
    draft: false,
    createdDate: 1739222096918,
    updatedDate: 1739329991386,
    fromRef: {
        id: 'refs/heads/testing-3',
        displayId: 'testing-3',
        latestCommit: 'b70a6199c92a978bf9a4862e1b96c9301400cbfa',
        type: 'BRANCH',
        repository: {
            slug: 'testing-axon',
            id: 1,
            name: 'testing-axon',
            hierarchyId: '451f980d695b670538b0',
            scmId: 'git',
            state: 'AVAILABLE',
            statusMessage: 'Available',
            forkable: true,
            project: {
                key: 'AX',
                id: 1,
                name: 'axon-test',
                public: false,
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX',
                        },
                    ],
                },
                avatarUrl: '/projects/AX/avatar.png?s=64&v=1735870958971',
            },
            public: false,
            archived: false,
            links: {
                clone: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/scm/ax/testing-axon.git',
                        name: 'http',
                    },
                    {
                        href: 'ssh://git@instenv-452647-24mv-alt-3a61ca65736a0f8b.elb.us-east-1.amazonaws.com:7999/ax/testing-axon.git',
                        name: 'ssh',
                    },
                ],
                self: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX/repos/testing-axon/browse',
                    },
                ],
            },
        },
    },
    toRef: {
        id: 'refs/heads/main',
        displayId: 'main',
        latestCommit: 'de320695ae3092a489bcb31da5a8c8bb75d833a1',
        type: 'BRANCH',
        repository: {
            slug: 'testing-axon',
            id: 1,
            name: 'testing-axon',
            hierarchyId: '451f980d695b670538b0',
            scmId: 'git',
            state: 'AVAILABLE',
            statusMessage: 'Available',
            forkable: true,
            project: {
                key: 'AX',
                id: 1,
                name: 'axon-test',
                public: false,
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX',
                        },
                    ],
                },
                avatarUrl: '/projects/AX/avatar.png?s=64&v=1735870958971',
            },
            public: false,
            archived: false,
            links: {
                clone: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/scm/ax/testing-axon.git',
                        name: 'http',
                    },
                    {
                        href: 'ssh://git@instenv-452647-24mv-alt-3a61ca65736a0f8b.elb.us-east-1.amazonaws.com:7999/ax/testing-axon.git',
                        name: 'ssh',
                    },
                ],
                self: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX/repos/testing-axon/browse',
                    },
                ],
            },
        },
    },
    locked: false,
    author: {
        user: {
            name: 'admin',
            emailAddress: 'admin@admin.com',
            active: true,
            displayName: 'Ansible Admin',
            id: 2,
            slug: 'admin',
            type: 'NORMAL',
            links: {
                self: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/users/admin',
                    },
                ],
            },
            avatarUrl: 'https://secure.gravatar.com/avatar/64e1b8d34f425d19e1ee2ea7236d3028.jpg?s=64&d=mm',
        },
        role: 'AUTHOR',
        approved: false,
        status: 'UNAPPROVED',
    },
    reviewers: [],
    participants: [],
    links: {
        self: [
            {
                href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX/repos/testing-axon/pull-requests/1',
            },
        ],
    },
    descriptionAsHtml: '<p>some words<br />\n<br />\nI can change the description<br />\n<br />\nChange me</p>\n',
};
