import { act, renderHook } from '@testing-library/react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { useStartWorkFormState } from './useStartWorkFormState';

// Mock dependencies
jest.mock('../../../common/errorController', () => ({
    ErrorControllerContext: {
        Provider: ({ children }: any) => children,
    },
}));

jest.mock('../../startWorkController', () => ({
    useStartWorkController: jest.fn(),
}));

jest.mock('../utils/branchUtils', () => ({
    getDefaultSourceBranch: jest.fn().mockReturnValue({ type: 0, name: 'main' }),
    generateBranchName: jest.fn().mockReturnValue('generated-branch-name'),
    getBranchTypeForRepo: jest.fn(),
}));

const mockGenerateBranchName = require('../utils/branchUtils').generateBranchName;
const mockGetBranchTypeForRepo = require('../utils/branchUtils').getBranchTypeForRepo;

describe('useStartWorkFormState', () => {
    const mockController = {
        postMessage: jest.fn(),
        startWork: jest.fn(),
    } as any;

    const mockBitbucketRepo: RepoData = {
        workspaceRepo: {
            rootUri: '/test/bitbucket-repo',
            mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
            siteRemotes: [],
        },
        localBranches: [],
        remoteBranches: [],
        branchTypes: [
            { kind: 'Feature', prefix: 'feature/' },
            { kind: 'Bugfix', prefix: 'bugfix/' },
        ],
        developmentBranch: 'main',
        userName: 'test',
        userEmail: 'test@example.com',
        isCloud: false,
    };

    const mockGitHubRepo: RepoData = {
        workspaceRepo: {
            rootUri: '/test/github-repo',
            mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
            siteRemotes: [],
        },
        localBranches: [],
        remoteBranches: [],
        branchTypes: [], // No branch types for GitHub
        developmentBranch: 'main',
        userName: 'test',
        userEmail: 'test@example.com',
        isCloud: false,
    };

    const mockState = {
        repoData: [mockBitbucketRepo, mockGitHubRepo],
        customPrefixes: [],
        customTemplate: '{{prefix}}/{{issueKey}}-{{summary}}',
        issue: { key: 'TEST-123', summary: 'Test issue' } as any,
        rovoDevPreference: false,
        isSomethingLoading: false,
        isRovoDevEnabled: false,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateBranchName.mockReturnValue('generated-branch-name');

        mockGetBranchTypeForRepo.mockImplementation((repo: RepoData, customPrefixes: string[]) => {
            if (repo.branchTypes?.length > 0) {
                return repo.branchTypes[0];
            } else if (customPrefixes.length > 0) {
                return { kind: customPrefixes[0], prefix: customPrefixes[0] + '/' };
            } else {
                return { kind: '', prefix: '' };
            }
        });
    });

    describe('hook behavior', () => {
        it('should initialize with correct branch type from utils', () => {
            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            // Hook should use the result from getBranchTypeForRepo
            expect(result.current.formState.selectedBranchType).toEqual({
                kind: 'Feature',
                prefix: 'feature/',
            });
        });

        it('should update branch type when repository changes', () => {
            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockGitHubRepo);
            });

            // Hook should call utils and update state accordingly
            expect(result.current.formState.selectedBranchType).toEqual({
                kind: '',
                prefix: '',
            });
        });
    });

    describe('integration with utils', () => {
        it('should call getBranchTypeForRepo with correct parameters on initialization', () => {
            renderHook(() => useStartWorkFormState(mockState, mockController));

            expect(mockGetBranchTypeForRepo).toHaveBeenCalledWith(mockBitbucketRepo, mockState.customPrefixes);
        });

        it('should call getBranchTypeForRepo when repository changes', () => {
            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockGitHubRepo);
            });

            expect(mockGetBranchTypeForRepo).toHaveBeenCalledWith(mockGitHubRepo, mockState.customPrefixes);
        });

        it('should call generateBranchName when repository or branch type changes', () => {
            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            expect(mockGenerateBranchName).toHaveBeenCalledWith(
                mockBitbucketRepo,
                { kind: 'Feature', prefix: 'feature/' },
                mockState.issue,
                mockState.customTemplate,
            );

            act(() => {
                result.current.formActions.onRepositoryChange(mockGitHubRepo);
            });

            expect(mockGenerateBranchName).toHaveBeenCalledWith(
                mockGitHubRepo,
                { kind: '', prefix: '' },
                mockState.issue,
                mockState.customTemplate,
            );
        });
    });
});
