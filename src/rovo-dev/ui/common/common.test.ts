import { normalizeLinks } from './common';

describe('normalizeLinks', () => {
    it('should fix malformed markdown links with period before parenthesis', () => {
        const input = 'assign [Alex Marginson].(/people/712020:05ca66ee-d3b6-4a5e-923a-fddbf1663d1c).';
        const result = normalizeLinks(input);
        expect(result).toContain('[Alex Marginson](/people/712020:05ca66ee-d3b6-4a5e-923a-fddbf1663d1c)');
    });

    it('should fix nested markdown links from ADF conversion', () => {
        const input = '[https://example.com/path](https://example.com/path)';
        const result = normalizeLinks(input);
        expect(result).toBe('https://example.com/path');
    });

    it('should fix URLs broken across line breaks', () => {
        const input = 'Visit https://example.com/path-\n123 for info';
        const result = normalizeLinks(input);
        expect(result).toContain('https://example.com/path-123');
    });

    it('should handle the full user example correctly', () => {
        const input =
            'Start working on [SCRUM-175] ([https://bbplay.atlassian.net/browse/SCRUM-](https://bbplay.atlassian.net/browse/SCRUM-)\n175) and assign [Alex Marginson].(/people/712020:05ca66ee-d3b6-4a5e-923a-fddbf1663d1c).';
        const result = normalizeLinks(input);
        
        // Should fix the period before parenthesis
        expect(result).toContain('[Alex Marginson](/people/');
        
        // Should merge the broken URL
        expect(result).toContain('SCRUM-175');
        
        // Should remove nested markdown link
        expect(result).not.toContain('[https://');
    });

    it('should not modify already correct markdown links', () => {
        const input = 'Check [SCRUM-123](https://example.com/SCRUM-123) for details.';
        const result = normalizeLinks(input);
        expect(result).toBe(input);
    });

    it('should handle non-string input gracefully', () => {
        const result = normalizeLinks(null as any);
        expect(result).toBe('');
    });

    it('should fix URLs broken within markdown link syntax', () => {
        const input = '[text](https://example.com/path-\n123)';
        const result = normalizeLinks(input);
        expect(result).toBe('[text](https://example.com/path-123)');
    });
});
