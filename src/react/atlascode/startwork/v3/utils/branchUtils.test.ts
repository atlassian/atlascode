jest.mock('mustache', () => ({
    __esModule: true,
    default: {
        render: jest.fn().mockReturnValue('mocked template result'),
    },
}));

const mockMustacheRender = require('mustache').default.render;

import { findDefaultSourceBranch, generateBranchName, getAllBranches, getDefaultSourceBranch } from './branchUtils';

describe('branchUtils', () => {
    const mockRepoData = {
        localBranches: [
            { name: 'main', type: 0 },
            { name: 'develop', type: 0 },
            { name: 'feature/test', type: 0 },
        ],
        remoteBranches: [
            { name: 'origin/main', type: 1, remote: 'origin' },
            { name: 'origin/develop', type: 1, remote: 'origin' },
        ],
        developmentBranch: 'develop',
    } as any;

    describe('getAllBranches', () => {
        it('should return empty array when no repoData', () => {
            const result = getAllBranches(undefined);
            expect(result).toEqual([]);
        });

        it('should return all branches when repoData exists', () => {
            const result = getAllBranches(mockRepoData);
            expect(result).toHaveLength(5);
            expect(result.map((b) => b.name)).toEqual([
                'main',
                'develop',
                'feature/test',
                'origin/main',
                'origin/develop',
            ]);
        });
    });

    describe('getDefaultSourceBranch', () => {
        it('should return empty branch when no repo data', () => {
            const result = getDefaultSourceBranch(undefined);
            expect(result).toEqual({ type: 0, name: '' });
        });

        it('should return development branch when available', () => {
            const result = getDefaultSourceBranch(mockRepoData);
            expect(result).toEqual(mockRepoData.localBranches[1]); // develop branch
        });

        it('should return main branch when no development branch but main exists', () => {
            const repoDataWithoutDevelopmentBranch = {
                ...mockRepoData,
                developmentBranch: 'non-existent',
            };
            const result = getDefaultSourceBranch(repoDataWithoutDevelopmentBranch);
            expect(result).toEqual(mockRepoData.localBranches[0]); // main branch
        });

        it('should return master branch when no development branch and no main', () => {
            const repoDataWithMaster = {
                ...mockRepoData,
                localBranches: [
                    { name: 'master', type: 0 },
                    { name: 'feature/test', type: 0 },
                ],
                developmentBranch: undefined,
            };
            const result = getDefaultSourceBranch(repoDataWithMaster);
            expect(result).toEqual({ name: 'master', type: 0 });
        });

        it('should return develop branch when no main or master', () => {
            const repoDataWithDevelop = {
                ...mockRepoData,
                localBranches: [
                    { name: 'feature/test', type: 0 },
                    { name: 'develop', type: 0 },
                    { name: 'bugfix/something', type: 0 },
                ],
                developmentBranch: undefined,
            };
            const result = getDefaultSourceBranch(repoDataWithDevelop);
            expect(result).toEqual({ name: 'develop', type: 0 });
        });

        it('should return first branch when no common main branches exist', () => {
            const repoDataWithoutCommonBranches = {
                ...mockRepoData,
                localBranches: [
                    { name: 'feature/test', type: 0 },
                    { name: 'bugfix/something', type: 0 },
                ],
                developmentBranch: undefined,
            };
            const result = getDefaultSourceBranch(repoDataWithoutCommonBranches);
            expect(result).toEqual({ name: 'feature/test', type: 0 });
        });

        it('should return empty branch when no local branches', () => {
            const repoDataWithoutLocalBranches = {
                ...mockRepoData,
                localBranches: [],
            };
            const result = getDefaultSourceBranch(repoDataWithoutLocalBranches);
            expect(result).toEqual({ type: 0, name: '' });
        });
    });

    describe('findDefaultSourceBranch', () => {
        const branches = [
            { name: 'main', type: 0 },
            { name: 'develop', type: 0 },
            { name: 'feature/test', type: 0 },
        ];

        it('should return configured development branch when available', () => {
            const result = findDefaultSourceBranch(branches, 'develop');
            expect(result).toEqual({ name: 'develop', type: 0 });
        });

        it('should return main when no development branch configured', () => {
            const result = findDefaultSourceBranch(branches, undefined);
            expect(result).toEqual({ name: 'main', type: 0 });
        });

        it('should return master when no main branch', () => {
            const branchesWithMaster = [
                { name: 'master', type: 0 },
                { name: 'feature/test', type: 0 },
            ];
            const result = findDefaultSourceBranch(branchesWithMaster, undefined);
            expect(result).toEqual({ name: 'master', type: 0 });
        });

        it('should return develop when no main or master', () => {
            const branchesWithDevelop = [
                { name: 'feature/test', type: 0 },
                { name: 'develop', type: 0 },
            ];
            const result = findDefaultSourceBranch(branchesWithDevelop, undefined);
            expect(result).toEqual({ name: 'develop', type: 0 });
        });

        it('should return first branch when no common main branches', () => {
            const featureBranches = [
                { name: 'feature/test', type: 0 },
                { name: 'bugfix/something', type: 0 },
            ];
            const result = findDefaultSourceBranch(featureBranches, undefined);
            expect(result).toEqual({ name: 'feature/test', type: 0 });
        });

        it('should return undefined when no branches', () => {
            const result = findDefaultSourceBranch([], undefined);
            expect(result).toBeUndefined();
        });
    });

    describe('generateBranchName', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const mockRepo = {
            userEmail: 'test.user@example.com',
        } as any;

        const mockBranchType = {
            kind: 'Bugfix',
            prefix: 'bugfix/',
        } as any;

        const mockIssue = {
            key: 'TEST-123',
            summary: 'Test issue summary',
        } as any;

        const defaultTemplate = '{{prefix}}{{issueKey}}-{{summary}}';

        it('should generate branch name with default template', () => {
            mockMustacheRender.mockReturnValue('bugfix/TEST-123-Test-issue-summary');
            const result = generateBranchName(mockRepo, mockBranchType, mockIssue, defaultTemplate);
            expect(mockMustacheRender).toHaveBeenCalledWith(
                defaultTemplate,
                expect.objectContaining({
                    prefix: 'bugfix/',
                    issueKey: 'TEST-123',
                    summary: 'test-issue-summary',
                }),
            );
            expect(result).toBe('bugfix/TEST-123-Test-issue-summary');
        });

        it('should handle missing user email', () => {
            mockMustacheRender.mockReturnValue('username/bugfix/TEST-123');
            const repoWithoutEmail = {
                userEmail: undefined,
            } as any;
            const template = '{{username}}/{{prefix}}{{issueKey}}';
            const result = generateBranchName(repoWithoutEmail, mockBranchType, mockIssue, template);
            expect(result).toBe('username/bugfix/TEST-123');
        });

        it('should handle spaces in branch type prefix', () => {
            mockMustacheRender.mockReturnValue('feature-branch/TEST-123-Test-issue-summary');
            const branchTypeWithSpaces = {
                kind: 'Feature',
                prefix: 'feature branch/',
            };
            const result = generateBranchName(mockRepo, branchTypeWithSpaces, mockIssue, defaultTemplate);
            expect(result).toBe('feature-branch/TEST-123-Test-issue-summary');
        });

        it('should handle invalid template', () => {
            mockMustacheRender.mockImplementation(() => {
                throw new Error('Invalid template');
            });
            const invalidTemplate = '{{invalid}}';
            const result = generateBranchName(mockRepo, mockBranchType, mockIssue, invalidTemplate);
            expect(result).toBe('Invalid template: please follow the format described above');
        });

        it('should generate branch name without prefix when prefix is empty', () => {
            mockMustacheRender.mockReturnValue('TEST-123-Test-issue-summary');
            const emptyBranchType = {
                kind: '',
                prefix: '',
            };
            const templateWithoutPrefix = '{{issueKey}}-{{summary}}';
            const result = generateBranchName(mockRepo, emptyBranchType, mockIssue, templateWithoutPrefix);
            expect(mockMustacheRender).toHaveBeenCalledWith(
                templateWithoutPrefix,
                expect.objectContaining({
                    prefix: '',
                    issueKey: 'TEST-123',
                    summary: 'test-issue-summary',
                }),
            );
            expect(result).toBe('TEST-123-Test-issue-summary');
        });
    });
});
