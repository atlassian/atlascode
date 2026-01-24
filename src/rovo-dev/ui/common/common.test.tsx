import { decodeUriComponentSafely, normalizeLinks } from './common';

describe('decodeUriComponentSafely', () => {
    it('should decode valid URI components', () => {
        expect(decodeUriComponentSafely('hello%20world')).toBe('hello world');
        expect(decodeUriComponentSafely('test%3Dvalue')).toBe('test=value');
    });

    it('should return original string for invalid URI components', () => {
        const invalid = 'invalid%';
        expect(decodeUriComponentSafely(invalid)).toBe(invalid);

        const malformed = 'test%GG';
        expect(decodeUriComponentSafely(malformed)).toBe(malformed);
    });
});

describe('normalizeLinks', () => {
    it('should encode JQL query with spaces and parentheses', () => {
        const input = 'https://softwareteams.atlassian.net/issues/?jql=assignee = currentUser()';
        const result = normalizeLinks(input);

        expect(result).toContain('jql=');
        expect(result).not.toContain('assignee = currentUser()');
        expect(result).toContain('assignee%20');
        expect(result).toContain('currentUser%28%29');
    });

    it('should handle complex JQL with already encoded parts', () => {
        const input =
            'https://softwareteams.atlassian.net/issues/?jql=assignee WAS currentUser() DURING (startOfDay(-30d)%2C now())%20ORDER%20BY%20updated%20DESC';
        const result = normalizeLinks(input);

        expect(result.startsWith('https://softwareteams.atlassian.net/issues/?jql=')).toBe(true);
        expect(result).toContain('assignee%20WAS');
        expect(result).toContain('currentUser%28%29');
        expect(result).not.toContain('assignee WAS');
        expect(result).not.toContain('currentUser()');
    });

    it('should handle mixed content with JQL and regular URLs', () => {
        const input = `Here is a JQL link: https://site.atlassian.net/issues/?jql=assignee = me()
And a regular link: https://example.com/page(test)
And some text`;
        const result = normalizeLinks(input);

        expect(result).not.toContain('assignee = me()');
        expect(result).toContain('jql=');
        expect(result).toContain('page%28test%29');
        expect(result).toContain('And some text');
    });

    it('should handle multiple JQL links in text', () => {
        const input = `Check these links:
https://site1.atlassian.net/issues/?jql=assignee = currentUser()
and also
https://site2.atlassian.net/issues/?jql=status = "In Progress"`;
        const result = normalizeLinks(input);
        const jqlLinks = result.match(/https:\/\/[^\n\r]+\/issues\/\?jql=[^\n\r]+/g);

        expect(jqlLinks).toHaveLength(2);
        expect(result).not.toContain('assignee = currentUser()');
        expect(result).not.toContain('status = "In Progress"');
    });

    it('should not encode text after URLs with spaces', () => {
        const input = 'Check this link: https://example.com and this text should not be encoded';
        const result = normalizeLinks(input);

        expect(result).toContain('https://example.com');
        expect(result).toContain('and this text should not be encoded');
        expect(result).not.toContain('%20this%20text');
    });

    it('should handle URLs with already encoded spaces correctly', () => {
        const input = 'Check this: https://example.com/path%20with%20spaces and some text after';
        const result = normalizeLinks(input);

        expect(result).toContain('https://example.com/path%20with%20spaces');
        expect(result).toContain('and some text after');
        expect(result).not.toContain('%20and%20some%20text');
    });

    it('should handle multiple URLs with text between them', () => {
        const input = 'First: https://example.com then some text, then https://another.com and more text';
        const result = normalizeLinks(input);

        expect(result).toContain('https://example.com');
        expect(result).toContain('https://another.com');
        expect(result).toContain('then some text, then');
        expect(result).toContain('and more text');
        expect(result).not.toContain('%20then%20some');
    });
});
