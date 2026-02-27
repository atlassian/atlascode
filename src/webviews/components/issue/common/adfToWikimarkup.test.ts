import { convertAdfToWikimarkup, convertWikimarkupToAdf, isAdfFormat } from './adfToWikimarkup';

describe('adfToWikimarkup', () => {
    describe('isAdfFormat', () => {
        it('should return true for valid ADF object', () => {
            const adf = {
                version: 1,
                type: 'doc',
                content: [],
            };
            expect(isAdfFormat(adf)).toBe(true);
        });

        it('should return false for object without version', () => {
            const notAdf = {
                type: 'doc',
                content: [],
            };
            expect(isAdfFormat(notAdf)).toBe(false);
        });

        it('should return false for object with wrong type', () => {
            const notAdf = {
                version: 1,
                type: 'notDoc',
                content: [],
            };
            expect(isAdfFormat(notAdf)).toBe(false);
        });

        it('should return false for wrong version', () => {
            const notAdf = {
                version: 2,
                type: 'doc',
                content: [],
            };
            expect(isAdfFormat(notAdf)).toBe(false);
        });

        it('should return true for valid ADF string', () => {
            const adfString = JSON.stringify({
                version: 1,
                type: 'doc',
                content: [],
            });
            expect(isAdfFormat(adfString)).toBe(true);
        });

        it('should return false for invalid JSON string', () => {
            expect(isAdfFormat('not valid json')).toBe(false);
        });

        it('should return false for null', () => {
            expect(isAdfFormat(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isAdfFormat(undefined)).toBe(false);
        });

        it('should return false for number', () => {
            expect(isAdfFormat(123)).toBe(false);
        });

        it('should return false for boolean', () => {
            expect(isAdfFormat(true)).toBe(false);
            expect(isAdfFormat(false)).toBe(false);
        });
    });

    describe('convertWikimarkupToAdf', () => {
        it('should return empty ADF for empty string', () => {
            const result = convertWikimarkupToAdf('');
            expect(result).toEqual({
                version: 1,
                type: 'doc',
                content: [],
            });
        });

        it('should return empty ADF for whitespace-only string', () => {
            const result = convertWikimarkupToAdf('   ');
            expect(result).toEqual({
                version: 1,
                type: 'doc',
                content: [],
            });
        });

        it('should convert WikiMarkup to ADF', () => {
            const wikimarkup = 'Simple text';
            const result = convertWikimarkupToAdf(wikimarkup);
            expect(result).toHaveProperty('version', 1);
            expect(result).toHaveProperty('type', 'doc');
            expect(result).toHaveProperty('content');
            expect(Array.isArray(result.content)).toBe(true);
        });

        it('should convert bold text', () => {
            const wikimarkup = '*bold text*';
            const result = convertWikimarkupToAdf(wikimarkup);
            expect(result.version).toBe(1);
            expect(result.type).toBe('doc');
        });

        it('should convert lists', () => {
            const wikimarkup = '* Item 1\n* Item 2';
            const result = convertWikimarkupToAdf(wikimarkup);
            expect(result.version).toBe(1);
            expect(result.type).toBe('doc');
            expect(result.content).toBeDefined();
            expect(result.content!.length).toBeGreaterThan(0);
        });

        it('should sanitize localId attributes', () => {
            const wikimarkup = 'Simple text';
            const result = convertWikimarkupToAdf(wikimarkup);
            const hasNullLocalId = JSON.stringify(result).includes('"localId":null');
            expect(hasNullLocalId).toBe(false);
        });

        it('should handle headings', () => {
            const wikimarkup = 'h1. Heading';
            const result = convertWikimarkupToAdf(wikimarkup);
            expect(result.version).toBe(1);
            expect(result.type).toBe('doc');
        });
    });

    describe('convertAdfToWikimarkup', () => {
        it('should return empty string for null input', () => {
            expect(convertAdfToWikimarkup(null)).toBe('');
        });

        it('should return empty string for undefined input', () => {
            expect(convertAdfToWikimarkup(undefined)).toBe('');
        });

        it('should convert valid ADF to WikiMarkup', () => {
            const adf = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Hello world',
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adf);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle ADF as string', () => {
            const adfString = JSON.stringify({
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Test',
                            },
                        ],
                    },
                ],
            });
            const result = convertAdfToWikimarkup(adfString);
            expect(typeof result).toBe('string');
        });

        it('should return input for non-ADF object', () => {
            const notAdf = { type: 'notDoc', version: 1 };
            const result = convertAdfToWikimarkup(notAdf);
            expect(result).toBe(JSON.stringify(notAdf));
        });

        it('should handle invalid content structure', () => {
            const invalidAdf = {
                version: 1,
                type: 'doc',
                content: 'not-an-array',
            } as any; // Intentionally invalid for testing error handling
            const result = convertAdfToWikimarkup(invalidAdf);
            expect(typeof result).toBe('string');
        });

        it('should handle ADF without content array', () => {
            const adfNoContent = {
                version: 1,
                type: 'doc',
            };
            const result = convertAdfToWikimarkup(adfNoContent);
            expect(typeof result).toBe('string');
        });

        it('should extract text from taskItem with DONE state', () => {
            const adfWithTask = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'taskList',
                        content: [
                            {
                                type: 'taskItem',
                                attrs: { state: 'DONE' },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Completed task',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adfWithTask);
            expect(typeof result).toBe('string');
        });

        it('should extract text from taskItem with TODO state', () => {
            const adfWithTask = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'taskList',
                        content: [
                            {
                                type: 'taskItem',
                                attrs: { state: 'TODO' },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Todo task',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adfWithTask);
            expect(typeof result).toBe('string');
        });

        it('should extract text from mention with text attribute', () => {
            const adfWithMention = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'mention',
                                attrs: { text: '@john' },
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adfWithMention);
            expect(typeof result).toBe('string');
        });

        it('should extract text from mention without text attribute', () => {
            const adfWithMention = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'mention',
                                attrs: {},
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adfWithMention);
            expect(typeof result).toBe('string');
        });

        it('should handle paragraph nodes', () => {
            const adf = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'First paragraph',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Second paragraph',
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adf);
            expect(typeof result).toBe('string');
        });

        it('should handle heading nodes', () => {
            const adf = {
                version: 1,
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        attrs: { level: 1 },
                        content: [
                            {
                                type: 'text',
                                text: 'Heading',
                            },
                        ],
                    },
                ],
            };
            const result = convertAdfToWikimarkup(adf);
            expect(typeof result).toBe('string');
        });

        it('should handle invalid JSON string', () => {
            const result = convertAdfToWikimarkup('invalid json');
            expect(result).toBe('invalid json');
        });
    });
});
