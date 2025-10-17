import { parseCustomCliTagsForMarkdown } from './rovoDevUtils';

describe('rovoDevUtils', () => {
    describe('cleanCustomCliTagsForMarkdown', () => {
        it('should return unchanged text when no tags are present', () => {
            const input = 'This is plain text without any tags';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('This is plain text without any tags');
        });

        it('should remove simple custom tags and keep only content', () => {
            const input = '[custom]Hello World[/custom]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Hello World');
        });

        it('should handle multiple tags in sequence', () => {
            const input = '[tag1]First[/tag1][tag2]Second[/tag2]';
            const result = parseCustomCliTagsForMarkdown(input);
            // Due to the function's implementation, it processes tags sequentially
            expect(result).toBe('FirstSecond');
        });

        it('should handle tags with content before and after', () => {
            const input = 'Before [tag]middle[/tag] after';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Before middle after');
        });

        it('should convert italic tags to markdown italic format', () => {
            const input = '[italic]italicized text[/italic]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('*italicized text*');
        });

        it('should convert bold tags to markdown bold format', () => {
            const input = '[bold]bold text[/bold]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('**bold text**');
        });

        it('should handle combined bold and italic tags', () => {
            const input = '[bold italic]bold and italic text[/bold italic]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('***bold and italic text***');
        });

        it('should handle italic and bold tags in different order', () => {
            const input = '[italic bold]text[/italic bold]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('***text***');
        });

        it('should handle unclosed tags by ignoring them', () => {
            const input = '[unclosed]This tag is not closed';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('[unclosed]This tag is not closed');
        });

        it('should handle unopened closing tags by ignoring them', () => {
            const input = 'Text with [/unopened] closing tag';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Text with [/unopened] closing tag');
        });

        it('should handle mismatched tags', () => {
            const input = '[bold]This is bold[/italic]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('[bold]This is bold[/italic]');
        });

        it('should handle empty tag content', () => {
            const input = '[bold][/bold]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('****');
        });

        it('should handle tags with spaces in content', () => {
            const input = '[bold]This has spaces[/bold]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('**This has spaces**');
        });

        it('should handle multiple separate tags', () => {
            const input = 'Start [bold]bold text[/bold] and [italic]italic text[/italic] end';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Start **bold text** and *italic text* end');
        });

        it('should handle tags with newlines in content', () => {
            const input = '[bold]Line one\nLine two[/bold]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('**Line one\nLine two**');
        });

        it('should handle custom tags that are not bold or italic', () => {
            const input = '[highlight]highlighted text[/highlight]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('highlighted text');
        });

        it('should handle complex mixed content', () => {
            const input =
                'Regular text [bold]bold[/bold] more text [italic]italic[/italic] and [custom]custom[/custom] end';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Regular text **bold** more text *italic* and custom end');
        });

        it('should handle brackets without valid tags', () => {
            const input = 'Text with [incomplete and [/mismatched] brackets';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Text with [incomplete and [/mismatched] brackets');
        });

        it('should handle empty string', () => {
            const input = '';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('');
        });

        it('should handle only opening bracket', () => {
            const input = 'Text with single [';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('Text with single [');
        });

        it('should handle multiple nested custom tags (with limitation)', () => {
            // Note: The function has a comment that it doesn't work well with nested tags of the same type
            const input = '[outer]content [inner]nested[/inner] more[/outer]';
            const result = parseCustomCliTagsForMarkdown(input);
            // The function will process the first matching pair it finds
            expect(result).toBe('content nested more');
        });

        it('should respect the guard limit for infinite loop protection', () => {
            // Create a string with many tags to test the guard (50 iterations limit)
            let input = 'start ';
            for (let i = 0; i < 60; i++) {
                input += `[tag${i}]content${i}[/tag${i}] `;
            }
            input += 'end';

            const result = parseCustomCliTagsForMarkdown(input);
            // Should process some tags but stop at the guard limit
            expect(result).toContain('content0');
            expect(result.length).toBeLessThan(input.length); // Some processing should have occurred
        });

        it('should handle tags with special characters in tag names', () => {
            const input = '[tag-with-dashes]content[/tag-with-dashes]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('content');
        });

        it('should handle tags with numbers in tag names', () => {
            const input = '[tag123]content[/tag123]';
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('content');
        });

        it('should handle case-sensitive tag matching', () => {
            const input = '[Bold]content[/bold]'; // Mismatched case
            const result = parseCustomCliTagsForMarkdown(input);
            expect(result).toBe('[Bold]content[/bold]'); // Should remain unchanged
        });
    });
});
