import { RovoDevModelsResponse } from './client/responseParserInterfaces';
import { modelsJsonResponseToMarkdown, parseCustomCliTagsForMarkdown, removeCustomCliTags } from './rovoDevUtils';

describe('rovoDevUtils', () => {
    describe('modelsJsonResponseToMarkdown', () => {
        it('should return undefined when models array is empty', () => {
            const response: RovoDevModelsResponse = {
                event_kind: 'models',
                data: {
                    models: [],
                },
            };
            const result = modelsJsonResponseToMarkdown(response);
            expect(result).toBeUndefined();
        });

        it('should return undefined when models array is not present', () => {
            const response: RovoDevModelsResponse = {
                event_kind: 'models',
                data: {},
            };
            const result = modelsJsonResponseToMarkdown(response);
            expect(result).toBeUndefined();
        });

        it('should format model change message when message is present', () => {
            const response: RovoDevModelsResponse = {
                event_kind: 'models',
                data: {
                    model_name: 'GPT-4',
                    model_id: 'gpt-4',
                    message: 'Agent model changed to GPT-4',
                },
            };
            const result = modelsJsonResponseToMarkdown(response);
            expect(result).toEqual({
                title: 'Agent model changed',
                text: 'Agent model changed to GPT-4',
                agentModelChanged: true,
            });
        });

        it('should format available models list correctly', () => {
            const response: RovoDevModelsResponse = {
                event_kind: 'models',
                data: {
                    models: [
                        {
                            name: 'GPT-4',
                            model_id: 'gpt-4',
                            description: 'Most capable model',
                            credit_multiplier: '1.5',
                        },
                        {
                            name: 'GPT-3.5',
                            model_id: 'gpt-3.5-turbo',
                            description: 'Fast and efficient',
                            credit_multiplier: '1.0',
                        },
                    ],
                },
            };
            const result = modelsJsonResponseToMarkdown(response);
            expect(result).toEqual({
                title: 'Available models',
                text: '**gpt-4**\n- Most capable model\n- Credit multiplier: 1.5x\n\n**gpt-3.5-turbo**\n- Fast and efficient\n- Credit multiplier: 1.0x\n\n',
                agentModelChanged: false,
            });
        });

        it('should format single model correctly', () => {
            const response: RovoDevModelsResponse = {
                event_kind: 'models',
                data: {
                    models: [
                        {
                            name: 'Claude',
                            model_id: 'claude-3',
                            description: 'Anthropic model',
                            credit_multiplier: '2.0',
                        },
                    ],
                },
            };
            const result = modelsJsonResponseToMarkdown(response);
            expect(result).toEqual({
                title: 'Available models',
                text: '**claude-3**\n- Anthropic model\n- Credit multiplier: 2.0x\n\n',
                agentModelChanged: false,
            });
        });

        it('should prioritize message over models array', () => {
            const response: RovoDevModelsResponse = {
                event_kind: 'models',
                data: {
                    message: 'Model changed',
                    models: [
                        {
                            name: 'GPT-4',
                            model_id: 'gpt-4',
                            description: 'Test',
                            credit_multiplier: '1.0',
                        },
                    ],
                },
            };
            const result = modelsJsonResponseToMarkdown(response);
            expect(result).toEqual({
                title: 'Agent model changed',
                text: 'Model changed',
                agentModelChanged: true,
            });
        });
    });

    describe('removeCustomCliTags', () => {
        it('should remove all custom CLI tags', () => {
            const input = '[bold]Hello[/bold] [italic]World[/italic]';
            const result = removeCustomCliTags(input);
            expect(result).toBe('Hello World');
        });

        it('should remove tags with attributes', () => {
            const input = '[link=https://example.com]Click here[/link]';
            const result = removeCustomCliTags(input);
            expect(result).toBe('Click here');
        });

        it('should handle mixed content', () => {
            const input = 'Normal [bold]bold[/bold] more normal [custom]custom[/custom] text';
            const result = removeCustomCliTags(input);
            expect(result).toBe('Normal bold more normal custom text');
        });

        it('should handle empty string', () => {
            const input = '';
            const result = removeCustomCliTags(input);
            expect(result).toBe('');
        });

        it('should return unchanged text without tags', () => {
            const input = 'No tags here';
            const result = removeCustomCliTags(input);
            expect(result).toBe('No tags here');
        });

        it('should handle nested tags', () => {
            const input = '[outer][inner]text[/inner][/outer]';
            const result = removeCustomCliTags(input);
            expect(result).toBe('text');
        });

        it('should handle complex tag names', () => {
            const input = '[bold italic]text[/bold italic]';
            const result = removeCustomCliTags(input);
            expect(result).toBe('text');
        });
    });

    describe('cleanCustomCliTagsForMarkdown', () => {
        it('should return unchanged text when no tags are present', () => {
            const input = 'This is plain text without any tags';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('This is plain text without any tags');
        });

        it('should remove simple custom tags and keep only content', () => {
            const input = '[custom]Hello World[/custom]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Hello World');
        });

        it('should handle multiple tags in sequence', () => {
            const input = '[tag1]First[/tag1][tag2]Second[/tag2]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            // Due to the function's implementation, it processes tags sequentially
            expect(result).toBe('FirstSecond');
        });

        it('should handle tags with content before and after', () => {
            const input = 'Before [tag]middle[/tag] after';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Before middle after');
        });

        it('should convert italic tags to markdown italic format', () => {
            const input = '[italic]italicized text[/italic]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('*italicized text*');
        });

        it('should convert bold tags to markdown bold format', () => {
            const input = '[bold]bold text[/bold]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('**bold text**');
        });

        it('should handle combined bold and italic tags', () => {
            const input = '[bold italic]bold and italic text[/bold italic]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('***bold and italic text***');
        });

        it('should handle italic and bold tags in different order', () => {
            const input = '[italic bold]text[/italic bold]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('***text***');
        });

        it('should handle unclosed tags by ignoring them', () => {
            const input = '[unclosed]This tag is not closed';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('[unclosed]This tag is not closed');
        });

        it('should handle unopened closing tags by ignoring them', () => {
            const input = 'Text with [/unopened] closing tag';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Text with [/unopened] closing tag');
        });

        it('should handle mismatched tags', () => {
            const input = '[bold]This is bold[/italic]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('[bold]This is bold[/italic]');
        });

        it('should handle empty tag content', () => {
            const input = '[bold][/bold]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('****');
        });

        it('should handle tags with spaces in content', () => {
            const input = '[bold]This has spaces[/bold]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('**This has spaces**');
        });

        it('should handle multiple separate tags', () => {
            const input = 'Start [bold]bold text[/bold] and [italic]italic text[/italic] end';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Start **bold text** and *italic text* end');
        });

        it('should handle tags with newlines in content', () => {
            const input = '[bold]Line one\nLine two[/bold]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('**Line one\nLine two**');
        });

        it('should handle custom tags that are not bold or italic', () => {
            const input = '[highlight]highlighted text[/highlight]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('highlighted text');
        });

        it('should handle complex mixed content', () => {
            const input =
                'Regular text [bold]bold[/bold] more text [italic]italic[/italic] and [custom]custom[/custom] end';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Regular text **bold** more text *italic* and custom end');
        });

        it('should handle brackets without valid tags', () => {
            const input = 'Text with [incomplete and [/mismatched] brackets';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Text with [incomplete and [/mismatched] brackets');
        });

        it('should handle empty string', () => {
            const input = '';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('');
        });

        it('should handle only opening bracket', () => {
            const input = 'Text with single [';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('Text with single [');
        });

        it('should handle multiple nested custom tags (with limitation)', () => {
            // Note: The function has a comment that it doesn't work well with nested tags of the same type
            const input = '[outer]content [inner]nested[/inner] more[/outer]';
            const result = parseCustomCliTagsForMarkdown(input, []);
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

            const result = parseCustomCliTagsForMarkdown(input, []);
            // Should process some tags but stop at the guard limit
            expect(result).toContain('content0');
            expect(result.length).toBeLessThan(input.length); // Some processing should have occurred
        });

        it('should handle tags with special characters in tag names', () => {
            const input = '[tag-with-dashes]content[/tag-with-dashes]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('content');
        });

        it('should handle tags with numbers in tag names', () => {
            const input = '[tag123]content[/tag123]';
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('content');
        });

        it('should handle case-sensitive tag matching', () => {
            const input = '[Bold]content[/bold]'; // Mismatched case
            const result = parseCustomCliTagsForMarkdown(input, []);
            expect(result).toBe('[Bold]content[/bold]'); // Should remain unchanged
        });

        it('it should extract a single link', () => {
            const input = 'Please click here [blue][link=https://www.site1.aaa]Site one[/link][/blue]';
            const links: Parameters<typeof parseCustomCliTagsForMarkdown>[1] = [];
            const result = parseCustomCliTagsForMarkdown(input, links);
            expect(result).toBe('Please click here {link1}');
            expect(links).toHaveLength(1);
            expect(links[0].text).toEqual('Site one');
            expect(links[0].link).toEqual('https://www.site1.aaa');
        });

        it('it should extract multiple links', () => {
            const input =
                'Please click here [blue][link=https://www.site1.aaa]Site one[/link][/blue] and not here [link=https://www.site2.aaa]Site two[/link], all right?';
            const links: Parameters<typeof parseCustomCliTagsForMarkdown>[1] = [];
            const result = parseCustomCliTagsForMarkdown(input, links);
            expect(result).toBe('Please click here {link1} and not here {link2}, all right?');
            expect(links).toHaveLength(2);
            expect(links[0].text).toEqual('Site one');
            expect(links[0].link).toEqual('https://www.site1.aaa');
            expect(links[1].text).toEqual('Site two');
            expect(links[1].link).toEqual('https://www.site2.aaa');
        });
    });
});
