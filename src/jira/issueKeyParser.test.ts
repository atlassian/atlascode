import { IssueKeyRegEx, parseJiraIssueKeys } from './issueKeyParser';

describe('IssueKeyRegEx', () => {
    it('should match valid Jira issue keys', () => {
        const validKeys = ['ABC-123', 'PROJECT-1', 'TEST-999', 'XY-1', 'ABC123-456', 'abc-123'];

        for (const key of validKeys) {
            expect(key).toMatch(IssueKeyRegEx);
        }
    });

    it('should not match invalid Jira issue keys', () => {
        const invalidKeys = ['ABC', 'ABC-', '-123', 'ABC-ABC', 'ABC_123', 'PROJECT_1', 'A@C-123'];

        for (const key of invalidKeys) {
            expect(key).not.toMatch(new RegExp(`^${IssueKeyRegEx.source}$`));
        }
    });
});

describe('parseJiraIssueKeys', () => {
    it('should return empty array for undefined input', () => {
        const result = parseJiraIssueKeys(undefined);
        expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
        const result = parseJiraIssueKeys('');
        expect(result).toEqual([]);
    });

    it('should extract single issue key from text', () => {
        const text = 'Working on ABC-123 today';
        const result = parseJiraIssueKeys(text);
        expect(result).toEqual(['ABC-123']);
    });

    it('should extract multiple issue keys from text', () => {
        const text = 'Working on ABC-123 and XYZ-456 today';
        const result = parseJiraIssueKeys(text);
        expect(result).toEqual(['ABC-123', 'XYZ-456']);
    });

    it('should extract issue keys from a complex text', () => {
        const text = `
            Project update:
            - ABC-123: Implemented new feature
            - DEF-456: Fixed bug
            Also reviewed XYZ-789 and QWE-012.
            Won't work on INVALID- or -123 or PROJECT_1.
        `;
        const result = parseJiraIssueKeys(text);
        expect(result).toEqual(['ABC-123', 'DEF-456', 'XYZ-789', 'QWE-012']);
    });

    it('should return unique issue keys only', () => {
        const text = 'Duplicate keys: ABC-123, XYZ-456, ABC-123';
        const result = parseJiraIssueKeys(text);
        expect(result).toEqual(['ABC-123', 'XYZ-456']);
        expect(result.length).toBe(2); // Ensures no duplicates
    });

    it('should match issue keys within other text', () => {
        const text = 'Key:ABC-123,Next:XYZ-456.';
        const result = parseJiraIssueKeys(text);
        expect(result).toEqual(['ABC-123', 'XYZ-456']);
    });

    it('should handle issue keys with numeric project identifiers', () => {
        const text = 'Working on 123-456 and ABC-789';
        const result = parseJiraIssueKeys(text);
        expect(result).toEqual(['123-456', 'ABC-789']);
    });
});
