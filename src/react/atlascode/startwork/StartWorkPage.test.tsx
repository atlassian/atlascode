// buildBranchName logic for testing
function buildBranchName(branchType: { prefix: string }, state: { issue: { key: string; summary: string } }) {
    return {
        prefix: branchType.prefix.replace(/ /g, '-').toLowerCase(),
        Prefix: branchType.prefix.replace(/ /g, '-'),
        PREFIX: branchType.prefix.replace(/ /g, '-').toUpperCase(),
        issueKey: state.issue.key,
        issuekey: state.issue.key.toLowerCase(),
        summary: state.issue.summary
            .substring(0, 50)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\W+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
        Summary: state.issue.summary
            .substring(0, 50)
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\W+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
        SUMMARY: state.issue.summary
            .substring(0, 50)
            .trim()
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\W+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
    };
}

describe('buildBranchName', () => {
    it('should format branch name parts correctly', () => {
        const branchType = { prefix: 'feature branch' };
        const state = {
            issue: {
                key: 'ABC-123',
                summary: 'Fix: naïve façade—remove bugs! (v2.0)   ',
            },
        };
        const view = buildBranchName(branchType, state);
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
        const branchType = { prefix: 'hot fix' };
        const state = {
            issue: {
                key: 'ABC-124',
                summary: 'Crème brûlée: déjà vu!',
            },
        };
        const view = buildBranchName(branchType, state);
        expect(view.summary).toBe('creme-brulee-deja-vu');
    });

    it('should trim and collapse dashes', () => {
        const branchType = { prefix: 'bug' };
        const state = {
            issue: {
                key: 'ABC-125',
                summary: '--- [More dashes are here]   ---Multiple---dashes--- ',
            },
        };
        const view = buildBranchName(branchType, state);
        expect(view.summary).toBe('more-dashes-are-here-multiple-dashes');
    });
});
