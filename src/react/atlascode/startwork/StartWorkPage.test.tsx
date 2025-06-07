import { buildBranchName } from './branchNameUtils';

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
});
