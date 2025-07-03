import * as vscode from 'vscode';

import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { Shell } from '../../util/shell';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { CommandBase } from '../command/command-base';
import { BitbucketCloudSite } from '../hosts/bitbucket-cloud';
import { BitbucketServerSite } from '../hosts/bitbucket-server';
import { Backend } from './backend';

// Mock dependencies
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../container', () => ({
    Container: {
        bitbucketContext: {
            getBitbucketRepositories: jest.fn(),
            getRepositoryScm: jest.fn(),
        },
    },
}));
jest.mock('../../util/shell');
jest.mock('../command/command-base', () => ({
    CommandBase: {
        getOpenEditor: jest.fn(),
    },
}));
jest.mock('../hosts/bitbucket-cloud');
jest.mock('../hosts/bitbucket-server');

const mockClientForSite = clientForSite as jest.MockedFunction<typeof clientForSite>;
const mockShell = Shell as jest.MockedClass<typeof Shell>;

describe('Backend', () => {
    let backend: Backend;
    let mockShellInstance: jest.Mocked<Shell>;
    let mockEditor: Partial<vscode.TextEditor>;
    let mockDocument: Partial<vscode.TextDocument>;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockBitbucketApi: any;
    let mockScm: any;
    let mockGetBitbucketRepositories: jest.Mock;
    let mockGetRepositoryScm: jest.Mock;
    let mockGetOpenEditor: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Shell instance
        mockShellInstance = {
            output: jest.fn(),
            exec: jest.fn(),
        } as any;
        mockShell.mockImplementation(() => mockShellInstance);

        // Mock Container functions
        mockGetBitbucketRepositories = jest.fn();
        mockGetRepositoryScm = jest.fn();
        (Container.bitbucketContext as any) = {
            getBitbucketRepositories: mockGetBitbucketRepositories,
            getRepositoryScm: mockGetRepositoryScm,
        };

        // Mock CommandBase
        mockGetOpenEditor = jest.fn();
        (CommandBase as any).getOpenEditor = mockGetOpenEditor;

        // Mock VSCode Editor
        mockDocument = {
            uri: {
                scheme: 'file',
                toString: jest.fn().mockReturnValue('file:///test/project/src/file.ts'),
                query: '',
            } as any,
        };

        mockEditor = {
            document: mockDocument as vscode.TextDocument,
        };

        mockGetOpenEditor.mockReturnValue(mockEditor);

        // Mock WorkspaceRepo
        mockWorkspaceRepo = {
            rootUri: 'file:///test/project',
            mainSiteRemote: {
                site: {
                    details: {
                        isCloud: true,
                        host: 'bitbucket.org',
                        id: 'test-site',
                        name: 'Test Site',
                        baseApiUrl: 'https://api.bitbucket.org',
                        avatarUrl: 'https://bitbucket.org/avatar',
                        baseLinkUrl: 'https://bitbucket.org',
                        userId: 'test-user',
                        credentialId: 'test-cred',
                        product: 'bitbucket' as any,
                    },
                    ownerSlug: 'test-owner',
                    repoSlug: 'test-repo',
                },
                remote: {
                    name: 'origin',
                    fetchUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                    pushUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                    isReadOnly: false,
                } as any,
            },
            siteRemotes: [],
        };

        // Mock Bitbucket API
        mockBitbucketApi = {
            repositories: {
                getPullRequestIdsForCommit: jest.fn(),
            },
        };

        // Mock SCM
        mockScm = {
            state: {
                HEAD: {
                    commit: 'abc123',
                },
            },
        };

        backend = new Backend('/test/project');
    });

    describe('constructor', () => {
        it('should initialize with root directory', () => {
            expect(backend.root).toBe('/test/project');
            expect(mockShell).toHaveBeenCalledWith('/test/project');
        });
    });

    describe('findRepository', () => {
        it('should find repository for regular file editor', () => {
            mockGetBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);

            const result = backend.findRepository();

            expect(result).toBe(mockWorkspaceRepo);
            expect(mockGetBitbucketRepositories).toHaveBeenCalled();
        });

        it('should find repository for pull request diff editor', () => {
            const prQueryParams = {
                lhs: false,
                repoUri: 'file:///test/project/src/file.ts',
                branchName: 'main',
                commitHash: 'abc123',
                rhsCommitHash: 'def456',
                path: 'src/file.ts',
                prId: 'PR-123',
                site: mockWorkspaceRepo.mainSiteRemote.site,
                repoHref: '/test/project',
                prHref: '/pr/123',
                participants: [],
                reviewers: [],
                workspaceSlug: 'test-workspace',
                repoSlug: 'test-repo',
            };

            const mockUri = {
                scheme: PullRequestNodeDataProvider.SCHEME,
                toString: jest.fn().mockReturnValue('pr-diff://test'),
                query: JSON.stringify(prQueryParams),
            };

            mockGetOpenEditor.mockReturnValue({
                document: {
                    uri: mockUri,
                },
            });

            mockGetBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);

            const result = backend.findRepository();

            expect(result).toBe(mockWorkspaceRepo);
            expect(mockGetBitbucketRepositories).toHaveBeenCalled();
        });

        it('should throw error when repository is not found', () => {
            mockGetBitbucketRepositories.mockReturnValue([]);

            expect(() => backend.findRepository()).toThrow('Unable to find a Bitbucket repository');
        });
    });

    describe('findBitbucketSite', () => {
        beforeEach(() => {
            mockGetBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
        });

        it('should return BitbucketCloudSite for cloud sites', async () => {
            const result = await backend.findBitbucketSite();

            expect(result).toBeInstanceOf(BitbucketCloudSite);
            expect(BitbucketCloudSite).toHaveBeenCalledWith(mockWorkspaceRepo.mainSiteRemote.site);
        });

        it('should return BitbucketServerSite for server sites', async () => {
            // Make it a server site
            mockWorkspaceRepo.mainSiteRemote.site!.details.isCloud = false;

            const result = await backend.findBitbucketSite();

            expect(result).toBeInstanceOf(BitbucketServerSite);
            expect(BitbucketServerSite).toHaveBeenCalledWith(mockWorkspaceRepo.mainSiteRemote.site);
        });

        it('should throw error when site is not found', async () => {
            mockWorkspaceRepo.mainSiteRemote.site = undefined;

            await expect(backend.findBitbucketSite()).rejects.toThrow('Unable to find bitbucket site');
        });
    });

    describe('findCurrentRevision', () => {
        beforeEach(() => {
            mockGetBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
        });

        it('should return current revision from SCM state', async () => {
            mockGetRepositoryScm.mockReturnValue(mockScm);

            const result = await backend.findCurrentRevision();

            expect(result).toBe('abc123');
            expect(mockGetRepositoryScm).toHaveBeenCalledWith(mockWorkspaceRepo.rootUri);
        });

        it('should throw error when SCM is not found', async () => {
            mockGetRepositoryScm.mockReturnValue(null);

            await expect(backend.findCurrentRevision()).rejects.toThrow('Unable to get the current revision');
        });

        it('should throw error when HEAD is not available', async () => {
            mockGetRepositoryScm.mockReturnValue({
                state: {},
            });

            await expect(backend.findCurrentRevision()).rejects.toThrow('Unable to get the current revision');
        });

        it('should throw error when commit is not available', async () => {
            mockGetRepositoryScm.mockReturnValue({
                state: {
                    HEAD: {},
                },
            });

            await expect(backend.findCurrentRevision()).rejects.toThrow('Unable to get the current revision');
        });
    });

    describe('findSelectedRevision', () => {
        it('should return revision from git blame output', async () => {
            const blameOutput = 'abc123def456 (John Doe 2023-01-01 12:00:00 +0000 1) some code';
            mockShellInstance.output.mockResolvedValue(blameOutput);

            const result = await backend.findSelectedRevision('src/file.ts', 5);

            expect(result).toBe('abc123def456');
            expect(mockShellInstance.output).toHaveBeenCalledWith('git blame --root -l -L 5,5 src/file.ts');
        });

        it('should throw error when git blame output is invalid', async () => {
            mockShellInstance.output.mockResolvedValue('');

            await expect(backend.findSelectedRevision('src/file.ts', 5)).rejects.toThrow(
                'Unable to find the selected revision',
            );
        });

        it('should throw error when git blame fails', async () => {
            mockShellInstance.output.mockRejectedValue(new Error('git blame failed'));

            await expect(backend.findSelectedRevision('src/file.ts', 5)).rejects.toThrow('git blame failed');
        });
    });

    describe('getPullRequestId', () => {
        beforeEach(() => {
            mockGetBitbucketRepositories.mockReturnValue([mockWorkspaceRepo]);
        });

        it('should return PR ID from pull request diff editor', async () => {
            const prQueryParams = {
                lhs: false,
                repoUri: 'file:///test/project/src/file.ts',
                branchName: 'main',
                commitHash: 'abc123',
                rhsCommitHash: 'def456',
                path: 'src/file.ts',
                prId: 'PR-123',
                site: mockWorkspaceRepo.mainSiteRemote.site,
                repoHref: '/test/project',
                prHref: '/pr/123',
                participants: [],
                reviewers: [],
                workspaceSlug: 'test-workspace',
                repoSlug: 'test-repo',
            };

            const mockUri = {
                scheme: PullRequestNodeDataProvider.SCHEME,
                toString: jest.fn().mockReturnValue('pr-diff://test'),
                query: JSON.stringify(prQueryParams),
            };

            mockGetOpenEditor.mockReturnValue({
                document: {
                    uri: mockUri,
                },
            });

            const result = await backend.getPullRequestId('abc123');

            expect(result).toBe('PR-123');
        });

        it('should return PR ID from API when not in PR diff editor', async () => {
            mockClientForSite.mockResolvedValue(mockBitbucketApi);
            mockBitbucketApi.repositories.getPullRequestIdsForCommit.mockResolvedValue(['PR-1', 'PR-2', 'PR-3']);

            const result = await backend.getPullRequestId('abc123');

            expect(result).toBe('PR-3'); // Should return the last PR ID
            expect(mockClientForSite).toHaveBeenCalledWith(mockWorkspaceRepo.mainSiteRemote.site);
            expect(mockBitbucketApi.repositories.getPullRequestIdsForCommit).toHaveBeenCalledWith(
                mockWorkspaceRepo.mainSiteRemote.site,
                'abc123',
            );
        });

        it('should throw error when no PR IDs are found', async () => {
            mockClientForSite.mockResolvedValue(mockBitbucketApi);
            mockBitbucketApi.repositories.getPullRequestIdsForCommit.mockResolvedValue([]);

            await expect(backend.getPullRequestId('abc123')).rejects.toThrow('Unable to determine the pull request');
        });

        it('should throw error when site is not available', async () => {
            mockWorkspaceRepo.mainSiteRemote.site = undefined;

            await expect(backend.getPullRequestId('abc123')).rejects.toThrow('Unable to determine the pull request');
        });

        it('should throw error when API call fails', async () => {
            mockClientForSite.mockRejectedValue(new Error('API call failed'));

            await expect(backend.getPullRequestId('abc123')).rejects.toThrow('API call failed');
        });
    });

    describe('static root property', () => {
        it('should have the correct git command', () => {
            expect(Backend.root).toBe('git rev-parse --show-toplevel');
        });
    });
});
