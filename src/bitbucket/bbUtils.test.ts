// Mock dependencies
const mockGitUrlParse = jest.fn();
jest.mock('git-url-parse', () => ({
    __esModule: true,
    default: mockGitUrlParse,
}));
jest.mock('../container', () => ({
    Container: {
        siteManager: {
            getSiteForHostname: jest.fn(),
        },
        clientManager: {
            bbClient: jest.fn(),
        },
        config: {
            bitbucket: {
                preferredRemotes: ['origin', 'upstream'],
            },
        },
    },
}));

// Import after mocking
import { DetailedSiteInfo, ProductBitbucket } from '../atlclients/authInfo';
import { bbAPIConnectivityError } from '../constants';
import { Container } from '../container';
import { Remote, Repository, RepositoryState } from '../typings/git';
import {
    bitbucketSiteForRemote,
    clientForHostname,
    clientForRemote,
    clientForSite,
    encodePathParts,
    getBitbucketCloudRemotes,
    getBitbucketRemotes,
    parseGitUrl,
    siteDetailsForRemote,
    urlForRemote,
    workspaceRepoFor,
} from './bbUtils';
import { BitbucketApi, BitbucketSite } from './model';

describe('bbUtils', () => {
    let mockSiteInfo: DetailedSiteInfo;
    let mockBbClient: BitbucketApi;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGitUrlParse.mockReset();

        mockSiteInfo = {
            id: 'test-site',
            name: 'Test Site',
            host: 'bitbucket.org',
            isCloud: true,
            baseApiUrl: 'https://api.bitbucket.org',
            avatarUrl: 'https://bitbucket.org/avatar',
            baseLinkUrl: 'https://bitbucket.org',
            product: ProductBitbucket,
            userId: 'test-user',
            credentialId: 'test-cred',
        };

        mockBbClient = {} as BitbucketApi;

        // Reset the mocked Container methods
        (Container.siteManager.getSiteForHostname as jest.Mock).mockReset();
        (Container.clientManager.bbClient as jest.Mock).mockResolvedValue(mockBbClient);
    });

    describe('parseGitUrl', () => {
        it('should parse a standard git URL', () => {
            const mockParsed = {
                owner: 'testuser',
                name: 'testrepo',
                resource: 'bitbucket.org',
                source: 'git@bitbucket.org',
                full_name: 'testuser/testrepo',
            };
            mockGitUrlParse.mockReturnValue(mockParsed as any);

            const result = parseGitUrl('git@bitbucket.org:testuser/testrepo.git');

            expect(mockGitUrlParse).toHaveBeenCalledWith('git@bitbucket.org:testuser/testrepo.git');
            expect(result.owner).toBe('testuser');
        });

        it('should handle URLs with nested paths by extracting the last part', () => {
            const mockParsed = {
                owner: 'some/nested/path/testuser',
                name: 'testrepo',
                resource: 'bitbucket.org',
                source: 'git@bitbucket.org',
                full_name: 'testuser/testrepo',
            };
            mockGitUrlParse.mockReturnValue(mockParsed as any);

            const result = parseGitUrl('git@bitbucket.org:some/nested/path/testuser/testrepo.git');

            expect(result.owner).toBe('testuser');
        });

        it('should handle Bitbucket Server URLs with users type', () => {
            const mockParsed = {
                owner: 'repos',
                name: 'testrepo',
                resource: 'bitbucket.example.com',
                source: 'git@bitbucket.example.com',
                full_name: '',
            };
            mockGitUrlParse.mockReturnValue(mockParsed as any);

            const result = parseGitUrl('git@bitbucket.example.com:users/testuser/repos/testrepo.git');

            expect(result.owner).toBe('~testuser');
            expect(result.full_name).toBe('~testuser/testrepo');
        });

        it('should handle Bitbucket Server URLs with projects type', () => {
            const mockParsed = {
                owner: 'repos',
                name: 'testrepo',
                resource: 'bitbucket.example.com',
                source: 'git@bitbucket.example.com',
                full_name: '',
            };
            mockGitUrlParse.mockReturnValue(mockParsed as any);

            const result = parseGitUrl('git@bitbucket.example.com:projects/TESTPROJECT/repos/testrepo.git');

            expect(result.owner).toBe('TESTPROJECT');
            expect(result.full_name).toBe('TESTPROJECT/testrepo');
        });
    });

    describe('getBitbucketRemotes', () => {
        it('should return only remotes that have site details', () => {
            const mockRemote1: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };
            const mockRemote2: Remote = {
                name: 'other',
                fetchUrl: 'git@github.com:user/repo.git',
                isReadOnly: false,
            };
            const mockRepository: Repository = {
                state: {
                    remotes: [mockRemote1, mockRemote2],
                } as RepositoryState,
            } as Repository;

            // Set up gitUrlParse mock for both remotes
            mockGitUrlParse.mockImplementation((url: string) => {
                if (url.includes('bitbucket.org')) {
                    return {
                        resource: 'bitbucket.org',
                        source: 'git@bitbucket.org',
                        owner: 'user',
                        name: 'repo',
                    };
                } else {
                    return {
                        resource: 'github.com',
                        source: 'git@github.com',
                        owner: 'user',
                        name: 'repo',
                    };
                }
            });

            (Container.siteManager.getSiteForHostname as jest.Mock).mockImplementation(
                (product: any, hostname: string) => {
                    return hostname.includes('bitbucket') ? mockSiteInfo : undefined;
                },
            );

            const result = getBitbucketRemotes(mockRepository);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(mockRemote1);
        });

        it('should return empty array when no Bitbucket remotes found', () => {
            const mockRepository: Repository = {
                state: {
                    remotes: [
                        {
                            name: 'origin',
                            fetchUrl: 'git@github.com:user/repo.git',
                            isReadOnly: false,
                        },
                    ],
                } as RepositoryState,
            } as Repository;

            // Set up gitUrlParse mock to return github (non-bitbucket)
            mockGitUrlParse.mockReturnValue({
                resource: 'github.com',
                source: 'git@github.com',
                owner: 'user',
                name: 'repo',
            });

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(undefined);

            const result = getBitbucketRemotes(mockRepository);

            expect(result).toHaveLength(0);
        });
    });

    describe('getBitbucketCloudRemotes', () => {
        it('should return only cloud remotes', () => {
            const mockCloudRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };
            const mockServerRemote: Remote = {
                name: 'server',
                fetchUrl: 'git@bitbucket.example.com:user/repo.git',
                isReadOnly: false,
            };
            const mockRepository: Repository = {
                state: {
                    remotes: [mockCloudRemote, mockServerRemote],
                } as RepositoryState,
            } as Repository;

            // Set up gitUrlParse mock for both remotes
            mockGitUrlParse.mockImplementation((url: string) => {
                if (url.includes('bitbucket.org')) {
                    return {
                        resource: 'bitbucket.org',
                        source: 'git@bitbucket.org',
                        owner: 'user',
                        name: 'repo',
                    };
                } else {
                    return {
                        resource: 'bitbucket.example.com',
                        source: 'git@bitbucket.example.com',
                        owner: 'user',
                        name: 'repo',
                    };
                }
            });

            const cloudSiteInfo = { ...mockSiteInfo, isCloud: true };
            const serverSiteInfo = { ...mockSiteInfo, isCloud: false };

            (Container.siteManager.getSiteForHostname as jest.Mock).mockImplementation(
                (product: any, hostname: string) => {
                    if (hostname === 'bitbucket.org') {
                        return cloudSiteInfo;
                    }
                    if (hostname === 'bitbucket.example.com') {
                        return serverSiteInfo;
                    }
                    return undefined;
                },
            );

            const result = getBitbucketCloudRemotes(mockRepository);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(mockCloudRemote);
        });
    });

    describe('siteDetailsForRemote', () => {
        it('should return site details for a valid Bitbucket remote', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'bitbucket.org',
                source: 'git@bitbucket.org',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = siteDetailsForRemote(mockRemote);

            expect(result).toBe(mockSiteInfo);
            expect(Container.siteManager.getSiteForHostname).toHaveBeenCalledWith(ProductBitbucket, 'bitbucket.org');
        });

        it('should handle bitbucket.org variations in hostname', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket_org:user/repo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'bitbucket_org',
                source: 'git@bitbucket_org',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock)
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(mockSiteInfo);

            const result = siteDetailsForRemote(mockRemote);

            expect(result).toBe(mockSiteInfo);
            expect(Container.siteManager.getSiteForHostname).toHaveBeenCalledWith(ProductBitbucket, 'bitbucket.org');
        });

        it('should return undefined for non-Bitbucket remotes', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@github.com:user/repo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'github.com',
                source: 'git@github.com',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(undefined);

            const result = siteDetailsForRemote(mockRemote);

            expect(result).toBeUndefined();
        });
    });

    describe('bitbucketSiteForRemote', () => {
        it('should return BitbucketSite for a valid remote', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:testuser/testrepo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'bitbucket.org',
                source: 'git@bitbucket.org',
                owner: 'testuser',
                name: 'testrepo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = bitbucketSiteForRemote(mockRemote);

            expect(result).toEqual({
                details: mockSiteInfo,
                ownerSlug: 'testuser',
                repoSlug: 'testrepo',
            });
        });

        it('should return undefined for invalid remote', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@github.com:user/repo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'github.com',
                source: 'git@github.com',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(undefined);

            const result = bitbucketSiteForRemote(mockRemote);

            expect(result).toBeUndefined();
        });
    });

    describe('urlForRemote', () => {
        it('should return fetchUrl when available', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'https://bitbucket.org/user/repo.git',
                pushUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };

            const result = urlForRemote(mockRemote);

            expect(result).toBe('https://bitbucket.org/user/repo.git');
        });

        it('should return pushUrl when fetchUrl is not available', () => {
            const mockRemote: Remote = {
                name: 'origin',
                pushUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };

            const result = urlForRemote(mockRemote);

            expect(result).toBe('git@bitbucket.org:user/repo.git');
        });

        it('should return empty string for null/undefined remote', () => {
            expect(urlForRemote(null as any)).toBe('');
            expect(urlForRemote(undefined as any)).toBe('');
        });
    });

    describe('clientForRemote', () => {
        it('should return client for valid remote', async () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'bitbucket.org',
                source: 'git@bitbucket.org',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = await clientForRemote(mockRemote);

            expect(result).toBe(mockBbClient);
            expect(Container.clientManager.bbClient).toHaveBeenCalledWith(mockSiteInfo);
        });

        it('should reject for invalid remote', async () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@github.com:user/repo.git',
                isReadOnly: false,
            };

            mockGitUrlParse.mockReturnValue({
                resource: 'github.com',
                source: 'git@github.com',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(undefined);

            await expect(clientForRemote(mockRemote)).rejects.toBe(bbAPIConnectivityError);
        });
    });

    describe('clientForHostname', () => {
        it('should return client for valid hostname', async () => {
            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = await clientForHostname('bitbucket.org');

            expect(result).toBe(mockBbClient);
            expect(Container.clientManager.bbClient).toHaveBeenCalledWith(mockSiteInfo);
        });

        it('should reject for invalid hostname', async () => {
            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(undefined);

            await expect(clientForHostname('invalid.com')).rejects.toBe(bbAPIConnectivityError);
        });
    });

    describe('clientForSite', () => {
        it('should return client for site', async () => {
            const mockSite: BitbucketSite = {
                details: mockSiteInfo,
                ownerSlug: 'testuser',
                repoSlug: 'testrepo',
            };

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = await clientForSite(mockSite);

            expect(result).toBe(mockBbClient);
        });
    });

    describe('workspaceRepoFor', () => {
        it('should create WorkspaceRepo for repository with Bitbucket remotes', () => {
            const mockRemote1: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };
            const mockRemote2: Remote = {
                name: 'upstream',
                fetchUrl: 'git@bitbucket.org:upstream/repo.git',
                isReadOnly: false,
            };
            const mockRepository: Repository = {
                rootUri: { toString: () => '/path/to/repo' } as any,
                state: {
                    remotes: [mockRemote1, mockRemote2],
                } as RepositoryState,
            } as Repository;

            const mockBitbucketSite1: BitbucketSite = {
                details: mockSiteInfo,
                ownerSlug: 'user',
                repoSlug: 'repo',
            };

            mockGitUrlParse.mockImplementation((url: string) => {
                if (url.includes('user/repo')) {
                    return {
                        resource: 'bitbucket.org',
                        owner: 'user',
                        name: 'repo',
                    } as any;
                }
                return {
                    resource: 'bitbucket.org',
                    owner: 'upstream',
                    name: 'repo',
                } as any;
            });

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = workspaceRepoFor(mockRepository);

            expect(result.rootUri).toBe('/path/to/repo');
            expect(result.mainSiteRemote.remote).toBe(mockRemote1);
            expect(result.mainSiteRemote.site).toEqual(mockBitbucketSite1);
            expect(result.siteRemotes).toHaveLength(2);
        });

        it('should handle repository with no Bitbucket remotes', () => {
            const mockRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@github.com:user/repo.git',
                isReadOnly: false,
            };
            const mockRepository: Repository = {
                rootUri: { toString: () => '/path/to/repo' } as any,
                state: {
                    remotes: [mockRemote],
                } as RepositoryState,
            } as Repository;

            mockGitUrlParse.mockReturnValue({
                resource: 'github.com',
                source: 'git@github.com',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(undefined);

            const result = workspaceRepoFor(mockRepository);

            expect(result.rootUri).toBe('/path/to/repo');
            expect(result.mainSiteRemote.remote).toBe(mockRemote);
            expect(result.mainSiteRemote.site).toBeUndefined();
        });

        it('should prefer remotes based on configured preference', () => {
            const mockOriginRemote: Remote = {
                name: 'origin',
                fetchUrl: 'git@bitbucket.org:user/repo.git',
                isReadOnly: false,
            };
            const mockUpstreamRemote: Remote = {
                name: 'upstream',
                fetchUrl: 'git@bitbucket.org:upstream/repo.git',
                isReadOnly: false,
            };
            const mockRepository: Repository = {
                rootUri: { toString: () => '/path/to/repo' } as any,
                state: {
                    remotes: [mockUpstreamRemote, mockOriginRemote], // upstream first
                } as RepositoryState,
            } as Repository;

            mockGitUrlParse.mockReturnValue({
                resource: 'bitbucket.org',
                owner: 'user',
                name: 'repo',
            } as any);

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSiteInfo);

            const result = workspaceRepoFor(mockRepository);

            // Should prefer 'origin' over 'upstream' based on preferredRemotes config
            expect(result.mainSiteRemote.remote).toBe(mockOriginRemote);
        });
    });

    describe('encodePathParts', () => {
        it('should encode URI components in path segments', () => {
            const result = encodePathParts('path/with spaces/and%chars');

            expect(result).toBe('path/with%20spaces/and%25chars');
        });

        it('should handle empty or undefined paths', () => {
            expect(encodePathParts('')).toBe('');
            expect(encodePathParts(undefined as any)).toBe(undefined);
        });

        it('should handle paths without special characters', () => {
            const result = encodePathParts('simple/path/without/special/chars');

            expect(result).toBe('simple/path/without/special/chars');
        });

        it('should handle single segment paths', () => {
            const result = encodePathParts('file with spaces.txt');

            expect(result).toBe('file%20with%20spaces.txt');
        });
    });
});
