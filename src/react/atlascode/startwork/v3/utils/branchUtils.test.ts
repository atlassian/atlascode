jest.mock('mustache', () => ({
    __esModule: true,
    default: {
        render: jest.fn().mockReturnValue('mocked template result'),
    },
}));

const mockMustacheRender = require('mustache').default.render;

import { generateBranchName, getAllBranches, getDefaultSourceBranch } from './branchUtils';

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

        it('should return first local branch when no development branch', () => {
            const repoDataWithoutDevelopmentBranch = {
                ...mockRepoData,
                developmentBranch: 'non-existent',
            };
            const result = getDefaultSourceBranch(repoDataWithoutDevelopmentBranch);
            expect(result).toEqual(mockRepoData.localBranches[0]); // main branch
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
    });
});
