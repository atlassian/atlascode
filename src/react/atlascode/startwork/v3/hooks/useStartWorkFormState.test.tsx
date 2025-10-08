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
}));

const mockGenerateBranchName = require('../utils/branchUtils').generateBranchName;

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
    });

    describe('handleRepositoryChange', () => {
        it('should reset selectedBranchType to first branchType when switching to Bitbucket repo', () => {
            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockBitbucketRepo);
            });

            expect(result.current.formState.selectedBranchType).toEqual({
                kind: 'Feature',
                prefix: 'feature/',
            });
        });

        it('should reset selectedBranchType to empty when switching to non-Bitbucket repo without custom prefixes', () => {
            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockGitHubRepo);
            });

            expect(result.current.formState.selectedBranchType).toEqual({
                kind: '',
                prefix: '',
            });
        });

        it('should reset selectedBranchType to first custom prefix when switching to non-Bitbucket repo with custom prefixes', () => {
            const stateWithCustomPrefixes = {
                ...mockState,
                customPrefixes: ['hotfix', 'chore'],
            };

            const { result } = renderHook(() => useStartWorkFormState(stateWithCustomPrefixes, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockGitHubRepo);
            });

            expect(result.current.formState.selectedBranchType).toEqual({
                kind: 'hotfix',
                prefix: 'hotfix/',
            });
        });
    });

    describe('branch name generation', () => {
        it('should generate branch name with prefix when selectedBranchType has prefix', () => {
            mockGenerateBranchName.mockReturnValue('feature/TEST-123-test-issue');

            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockBitbucketRepo);
            });

            expect(mockGenerateBranchName).toHaveBeenCalledWith(
                mockBitbucketRepo,
                { kind: 'Feature', prefix: 'feature/' },
                mockState.issue,
                mockState.customTemplate,
            );
        });

        it('should generate branch name without prefix when selectedBranchType has no prefix', () => {
            mockGenerateBranchName.mockReturnValue('TEST-123-test-issue');

            const { result } = renderHook(() => useStartWorkFormState(mockState, mockController));

            act(() => {
                result.current.formActions.onRepositoryChange(mockGitHubRepo);
            });

            expect(mockGenerateBranchName).toHaveBeenCalledWith(
                mockGitHubRepo,
                { kind: '', prefix: '' },
                mockState.issue,
                '{{issueKey}}-{{summary}}', // Template without prefix
            );
        });
    });
});
