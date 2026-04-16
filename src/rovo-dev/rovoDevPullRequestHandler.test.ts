import { exec } from 'child_process';
import { env } from 'vscode';

import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';

jest.mock('src/logger', () => ({
    Logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('./rovoDevTelemetryProvider', () => ({
    RovoDevTelemetryProvider: {
        logError: jest.fn(),
    },
}));

jest.mock('child_process');
const mockExec = exec as jest.MockedFunction<typeof exec>;

const mockGitApi = jest.fn().mockReturnValue({
    repositories: [],
});

jest.mock('vscode', () => {
    const originalModule = jest.requireActual('jest-mock-vscode');
    return {
        ...originalModule.createVSCodeMock(jest),
        env: {
            openExternal: jest.fn(),
        },
        extensions: {
            getExtension: jest.fn((extensionId: string) => {
                if (extensionId === 'vscode.git') {
                    return {
                        activate: jest.fn().mockResolvedValue({
                            getAPI: mockGitApi,
                        }),
                    };
                }
                return null;
            }),
        },
    };
});

describe('RovoDevPullRequestHandler', () => {
    let handler: RovoDevPullRequestHandler;
    let findPRLink: (output: string) => string | undefined;

    beforeEach(() => {
        handler = new RovoDevPullRequestHandler();
        findPRLink = (output) => handler['findPRLink'](output);
    });

    describe('findPRLink', () => {
        it('Should match the link in GitHub push output', () => {
            const link = findPRLink(`
remote:      https://github.com/my-org/my-repo/pull/new/my-branch
remote:`);
            expect(link).toBe('https://github.com/my-org/my-repo/pull/new/my-branch');
        });

        it('Should match the link in Bitbucket push output', () => {
            const link = findPRLink(`
remote:      https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch
remote:`);
            expect(link).toBe('https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch');
        });

        it('Should match the link in internal Bitbucket push output', () => {
            const link = findPRLink(`
remote:      https://integration.bb-inf.net/my-org/my-repo/pull-requests/new?source=my-branch
remote:`);
            expect(link).toBe('https://integration.bb-inf.net/my-org/my-repo/pull-requests/new?source=my-branch');
        });

        it('Should match the link in generic push output', () => {
            const link = findPRLink(`
                remote:      https://example.com/my-org/my-repo/pull/new/my-branch
remote:`);
            expect(link).toBe('https://example.com/my-org/my-repo/pull/new/my-branch');
        });

        it('Should return undefined for empty output', () => {
            const link = findPRLink('');
            expect(link).toBeUndefined();
        });

        it('Should not match anything to odd links', () => {
            const link = findPRLink(`
                remote:      https://example.com/my-org/my-repo/not-a-pr-link
remote:`);
            expect(link).toBeUndefined();
        });
    });

    describe('buildCreatePrLinkFromGitOutput', () => {
        it('Should match for a github.com remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To github.com:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBe('https://github.com/atlassian/atlascode/pull/new/my-branch');
        });

        it('Should match for a bitbucket.org remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To bitbucket.org:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBe('https://bitbucket.org/atlassian/atlascode/pull-requests/new?source=my-branch');
        });

        it('Should match for an internal staging instance of Bitbucket remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To integration.bb-inf.net:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBe('https://integration.bb-inf.net/atlassian/atlascode/pull-requests/new?source=my-branch');
        });

        it('Should return undefined for unknown git host', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To unknown-host.com:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBeUndefined();
        });

        it('Should return undefined for empty output', () => {
            const link = handler.buildCreatePrLinkFromGitOutput('', 'my-branch');
            expect(link).toBeUndefined();
        });

        it('Should return undefined for output without git remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBeUndefined();
        });
    });

    describe('createPR', () => {
        const setupCreatePRMocks = ({
            branchName,
            uncommittedChanges = [],
            hasUnpushedCommits = false,
            commitFails = false,
            gitHost = 'github.com',
            repo = 'test/repo',
            gitPushFailMessage,
        }: {
            branchName: string;
            uncommittedChanges?: Array<{ relativePath: string }>;
            hasUnpushedCommits?: boolean;
            commitFails?: boolean;
            gitHost?: string;
            repo?: string;
            gitPushFailMessage?: string;
        }) => {
            const mockCommit = commitFails
                ? jest.fn().mockRejectedValue(new Error('Commit failed'))
                : jest.fn().mockResolvedValue(undefined);
            const mockCreateBranch = jest.fn().mockResolvedValue(undefined);
            const mockFetch = jest.fn().mockResolvedValue(undefined);

            const mockRepo = {
                state: {
                    HEAD: { name: 'main', ahead: hasUnpushedCommits ? 2 : 0 },
                    workingTreeChanges:
                        uncommittedChanges?.map((change) => ({
                            uri: change.relativePath,
                        })) || [],
                    indexChanges: [],
                    mergeChanges: [],
                },
                rootUri: { fsPath: '/mock/path' },
                commit: mockCommit,
                createBranch: mockCreateBranch,
                fetch: mockFetch,
            };

            mockGitApi.mockReturnValue({
                repositories: [mockRepo],
            });

            (mockExec as any).mockImplementation((command: string, options: any, callback: any) => {
                if (typeof options === 'function') {
                    callback = options;
                }

                if (command.includes(`git push origin ${branchName}`)) {
                    if (gitPushFailMessage) {
                        callback(new Error('Git push failed'), { stdout: '', stderr: gitPushFailMessage });
                    } else {
                        let gitPushOutput: string;
                        if (gitHost === 'github.com') {
                            gitPushOutput = `remote: https://${gitHost}/${repo}/pull/new/${branchName}`;
                        } else if (gitHost === 'bitbucket.org' || gitHost.includes('bb-inf.net')) {
                            gitPushOutput = `remote: https://${gitHost}/${repo}/pull-requests/new?source=${branchName}`;
                        } else {
                            gitPushOutput = `remote: https://${gitHost}/${repo}/pull/new/${branchName}`;
                        }
                        callback(null, { stdout: '', stderr: gitPushOutput });
                    }
                } else {
                    callback(new Error(`Unexpected command: ${command}`), null);
                }
            });

            return {
                mockCommit,
                mockCreateBranch,
                mockFetch,
                mockRepo,
            };
        };

        it('Should commit the changes if there are uncommitted changes', async () => {
            const branchName = 'my-branch';
            const commitMessage = 'My commit message';

            const { mockCommit, mockCreateBranch, mockFetch } = setupCreatePRMocks({
                branchName,
                uncommittedChanges: [{ relativePath: 'file1.txt' }],
            });

            await handler.createPR(branchName, commitMessage);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockCreateBranch).toHaveBeenCalledWith(branchName, true);

            expect(mockCommit).toHaveBeenCalledWith(commitMessage, { all: true });
        });

        it('Should throw helpful error when git user.name is not configured', async () => {
            const branchName = 'my-branch';
            const commitMessage = 'My commit message';

            const mockCommit = jest.fn().mockRejectedValue({
                message: 'Failed to execute git',
                gitErrorCode: 'NoUserNameConfigured',
            });

            mockGitApi.mockReturnValue({
                repositories: [
                    {
                        state: {
                            HEAD: { name: 'main' },
                            workingTreeChanges: [{ uri: 'file1.txt' }],
                            indexChanges: [],
                            mergeChanges: [],
                        },
                        rootUri: { fsPath: '/mock/path' },
                        commit: mockCommit,
                        createBranch: jest.fn(),
                        fetch: jest.fn(),
                    },
                ],
            });

            await expect(handler.createPR(branchName, commitMessage)).rejects.toThrow(
                'Failed to commit changes: Git user.name is not configured',
            );
            await expect(handler.createPR(branchName, commitMessage)).rejects.toThrow('git config --global user.name');
        });

        it('Should throw helpful error when git user.email is not configured', async () => {
            const branchName = 'my-branch';
            const commitMessage = 'My commit message';

            const mockCommit = jest.fn().mockRejectedValue({
                message: 'Failed to execute git',
                gitErrorCode: 'NoUserEmailConfigured',
            });

            mockGitApi.mockReturnValue({
                repositories: [
                    {
                        state: {
                            HEAD: { name: 'main' },
                            workingTreeChanges: [{ uri: 'file1.txt' }],
                            indexChanges: [],
                            mergeChanges: [],
                        },
                        rootUri: { fsPath: '/mock/path' },
                        commit: mockCommit,
                        createBranch: jest.fn(),
                        fetch: jest.fn(),
                    },
                ],
            });

            await expect(handler.createPR(branchName, commitMessage)).rejects.toThrow(
                'Failed to commit changes: Git user.email is not configured',
            );
            await expect(handler.createPR(branchName, commitMessage)).rejects.toThrow('git config --global user.email');
        });

        it('Should call env.openExternal when a standard success git push occurs', async () => {
            const branchName = 'feature-branch';
            const commitMessage = 'Add new feature';

            setupCreatePRMocks({
                branchName,
                hasUnpushedCommits: true,
            });

            await handler.createPR(branchName, commitMessage);

            expect(env.openExternal).toHaveBeenCalledWith(
                expect.objectContaining({
                    scheme: 'https',
                    authority: 'github.com',
                    path: '/test/repo/pull/new/feature-branch',
                }),
            );
        });
    });
});
