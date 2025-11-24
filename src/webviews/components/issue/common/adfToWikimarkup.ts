import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';

/**
 * Extracts plain text from ADF as a fallback when WikiMarkup conversion fails
 */
function extractPlainTextFromAdf(adf: any): string {
    try {
        const extractText = (node: any): string => {
            if (!node) {
                return '';
            }

            // Base case: text node
            if (node.type === 'text') {
                return node.text || '';
            }

            // Handle task items
            if (node.type === 'taskItem') {
                const state = node.attrs?.state === 'DONE' ? '[x] ' : '[ ] ';
                const text = node.content ? node.content.map(extractText).join('') : '';
                return state + text + '\n';
            }

            // Handle paragraphs and other containers
            if (node.content && Array.isArray(node.content)) {
                const text = node.content.map(extractText).join('');
                // Add line breaks for block-level elements
                if (['paragraph', 'heading', 'taskList'].includes(node.type)) {
                    return text + '\n';
                }
                return text;
            }

            // Handle mentions
            if (node.type === 'mention') {
                return node.attrs?.text || '@unknown';
            }

            return '';
        };

        return extractText(adf).trim();
    } catch (error) {
        console.error('Failed to extract text from ADF:', error);
        return '';
    }
}

/**
 * Converts ADF (Atlassian Document Format) to WikiMarkup
 * Used for backward compatibility with the legacy editor
 */
export function convertAdfToWikimarkup(adf: any): string {
    // Early return for null/undefined
    if (adf === null || adf === undefined) {
        return '';
    }

    try {
        // If it's a string, try to parse it
        const adfDoc = typeof adf === 'string' ? JSON.parse(adf) : adf;

        // Check if it's valid ADF
        if (adfDoc && adfDoc.type === 'doc' && adfDoc.version === 1) {
            try {
                // Validate ADF structure before transformation
                if (!adfDoc.content || !Array.isArray(adfDoc.content)) {
                    console.warn('Invalid ADF structure: missing or invalid content array');
                    return extractPlainTextFromAdf(adfDoc);
                }

                // WikiMarkupTransformer provides its own schema
                const transformer = new WikiMarkupTransformer();
                // Convert ADF to WikiMarkup
                const wikimarkup = transformer.encode(adfDoc);
                return wikimarkup;
            } catch (transformError) {
                console.warn('WikiMarkup transformer failed, falling back to plain text extraction:', transformError);
                // Fallback to plain text extraction
                return extractPlainTextFromAdf(adfDoc);
            }
        }

        // If not valid ADF, return as-is
        return typeof adf === 'string' ? adf : JSON.stringify(adf);
    } catch (error) {
        console.error('Failed to convert ADF to WikiMarkup:', error);
        // Fallback: return the original content
        return typeof adf === 'string' ? adf : JSON.stringify(adf);
    }
}

/**
 * Converts WikiMarkup to ADF
 * Used when saving content from the legacy editor
 */
export function convertWikimarkupToAdf(wikimarkup: string): any {
    try {
        const transformer = new WikiMarkupTransformer();
        const adfNode = transformer.parse(wikimarkup);
        return adfNode;
    } catch (error) {
        console.error('Failed to convert WikiMarkup to ADF:', error);
        // Return as plain text in ADF format
        return {
            version: 1,
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: wikimarkup,
                        },
                    ],
                },
            ],
        };
    }
}

/**
 * Checks if content is in ADF format
 */
export function isAdfFormat(content: any): boolean {
    if (typeof content === 'object' && content !== null) {
        return content.type === 'doc' && content.version === 1;
    }

    if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            return parsed.type === 'doc' && parsed.version === 1;
        } catch {
            return false;
        }
    }

    return false;
}
