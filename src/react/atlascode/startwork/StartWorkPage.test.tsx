import { buildBranchName } from './branchNameUtils';

const mockRepoData = {
    workspaceRepo: {
        rootUri: 'test-uri',
        mainSiteRemote: {
            remote: {
                name: 'origin',
            },
        },
        siteRemotes: [],
    },
    localBranches: [],
    remoteBranches: [],
    branchTypes: [],
    developmentBranch: 'main',
};

describe('buildBranchName', () => {
    it('should normalize and format branch name parts correctly', () => {
        const input = {
            branchType: { prefix: 'feature branch' },
            issue: {
                key: 'ABC-123',
                summary: 'Fix: naïve façade—remove bugs! (v2.0)   ',
            },
        };
        const view = buildBranchName(input);
        expect(view.prefix).toBe('feature-branch');
        expect(view.Prefix).toBe('feature-branch');
        expect(view.PREFIX).toBe('FEATURE-BRANCH');
        expect(view.issueKey).toBe('ABC-123');
        expect(view.issuekey).toBe('abc-123');
        expect(view.summary).toBe('fix-naive-facade-remove-bugs-v2-0');
        expect(view.Summary).toBe('Fix-naive-facade-remove-bugs-v2-0');
        expect(view.SUMMARY).toBe('FIX-NAIVE-FACADE-REMOVE-BUGS-V2-0');
    });

    it('should handle accented and special characters', () => {
        const input = {
            branchType: { prefix: 'hot fix' },
            issue: {
                key: 'ABC-124',
                summary: 'Crème brûlée: déjà vu!',
            },
        };
        const view = buildBranchName(input);
        expect(view.summary).toBe('creme-brulee-deja-vu');
    });

    it('should trim and collapse dashes', () => {
        const input = {
            branchType: { prefix: 'bug' },
            issue: {
                key: 'ABC-125',
                summary: '--- [More dashes are here]   ---Multiple---dashes--- ',
            },
        };
        const view = buildBranchName(input);
        expect(view.summary).toBe('more-dashes-are-here-multiple-dashes');
    });

    it('should build branch name with username when userEmail is available', () => {
        const mockRepo = {
            ...mockRepoData,
            userEmail: 'user.name@example.com',
        };
        const mockBranchType = { kind: 'feature', prefix: 'feature' };
        const mockIssue = {
            key: 'TEST-123',
            summary: 'Test Issue',
        };

        const view = buildBranchName({
            branchType: mockBranchType,
            issue: mockIssue,
            userEmail: mockRepo.userEmail,
        });

        expect(view.username).toBe('user.name');
        expect(view.UserName).toBe('user.name');
        expect(view.USERNAME).toBe('USER.NAME');
    });

    it('should use default username when userEmail is not available', () => {
        const mockBranchType = { kind: 'feature', prefix: 'feature' };
        const mockIssue = {
            key: 'TEST-123',
            summary: 'Test Issue',
        };

        const view = buildBranchName({
            branchType: mockBranchType,
            issue: mockIssue,
        });

        expect(view.username).toBe('username');
        expect(view.UserName).toBe('username');
        expect(view.USERNAME).toBe('USERNAME');
    });
});
