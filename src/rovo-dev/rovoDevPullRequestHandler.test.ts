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

const mockOnDidChangeState = jest.fn();
const mockOnDidOpenRepository = jest.fn();

const mockGitApi = jest.fn().mockReturnValue({
    repositories: [],
    state: 'initialized',
    onDidChangeState: mockOnDidChangeState,
    onDidOpenRepository: mockOnDidOpenRepository,
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
        jest.clearAllMocks();
        // Reset mockGitApi to default state
        mockGitApi.mockReturnValue({
            repositories: [],
            state: 'initialized',
            onDidChangeState: mockOnDidChangeState.mockReturnValue({ dispose: jest.fn() }),
            onDidOpenRepository: mockOnDidOpenRepository.mockReturnValue({ dispose: jest.fn() }),
        });
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

    describe('getGitRepository (via getCurrentBranchName)', () => {
        it('Should return repository immediately when API is initialized and repositories exist', async () => {
            const mockRepo = {
                state: { HEAD: { name: 'main' } },
                rootUri: { fsPath: '/mock/path' },
            };

            mockGitApi.mockReturnValue({
                repositories: [mockRepo],
                state: 'initialized',
                onDidChangeState: mockOnDidChangeState.mockReturnValue({ dispose: jest.fn() }),
                onDidOpenRepository: mockOnDidOpenRepository.mockReturnValue({ dispose: jest.fn() }),
            });

            const branchName = await handler.getCurrentBranchName();
            expect(branchName).toBe('main');
        });

        it('Should wait for repository when API is initialized but no repositories exist yet', async () => {
            const mockRepo = {
                state: { HEAD: { name: 'feature-branch' } },
                rootUri: { fsPath: '/mock/path' },
            };

            let onDidOpenRepoCallback: (repo: any) => void;
            mockOnDidOpenRepository.mockImplementation((callback: (repo: any) => void) => {
                onDidOpenRepoCallback = callback;
                return { dispose: jest.fn() };
            });

            mockGitApi.mockReturnValue({
                repositories: [],
                state: 'initialized',
                onDidChangeState: mockOnDidChangeState.mockReturnValue({ dispose: jest.fn() }),
                onDidOpenRepository: mockOnDidOpenRepository,
            });

            // Start the async operation
            const branchNamePromise = handler.getCurrentBranchName();

            // Simulate repository being discovered after a delay
            setTimeout(() => {
                onDidOpenRepoCallback(mockRepo);
            }, 10);

            const branchName = await branchNamePromise;
            expect(branchName).toBe('feature-branch');
            expect(mockOnDidOpenRepository).toHaveBeenCalled();
        });

        it('Should wait for API initialization when state is uninitialized', async () => {
            const mockRepo = {
                state: { HEAD: { name: 'develop' } },
                rootUri: { fsPath: '/mock/path' },
            };

            let onDidChangeStateCallback: (state: string) => void;
            mockOnDidChangeState.mockImplementation((callback: (state: string) => void) => {
                onDidChangeStateCallback = callback;
                return { dispose: jest.fn() };
            });

            mockGitApi.mockReturnValue({
                repositories: [mockRepo],
                state: 'uninitialized',
                onDidChangeState: mockOnDidChangeState,
                onDidOpenRepository: mockOnDidOpenRepository.mockReturnValue({ dispose: jest.fn() }),
            });

            // Start the async operation
            const branchNamePromise = handler.getCurrentBranchName();

            // Simulate API becoming initialized after a delay
            setTimeout(() => {
                onDidChangeStateCallback('initialized');
            }, 10);

            const branchName = await branchNamePromise;
            expect(branchName).toBe('develop');
            expect(mockOnDidChangeState).toHaveBeenCalled();
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
                state: 'initialized',
                onDidChangeState: mockOnDidChangeState.mockReturnValue({ dispose: jest.fn() }),
                onDidOpenRepository: mockOnDidOpenRepository.mockReturnValue({ dispose: jest.fn() }),
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
