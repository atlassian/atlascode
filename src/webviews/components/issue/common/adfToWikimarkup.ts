import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';

// ADF (Atlassian Document Format) node structure
interface AdfNode {
    type: string;
    text?: string;
    content?: AdfNode[];
    marks?: AdfMark[];
    attrs?: Record<string, any>;
    version?: number;
}

interface AdfMark {
    type: string;
    attrs?: Record<string, any>;
}

/**
 * Extracts plain text from ADF as a fallback when WikiMarkup conversion fails
 */
function extractPlainTextFromAdf(adf: AdfNode): string {
    try {
        const extractText = (node: AdfNode): string => {
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

            // Handle mentions: prefer display text; else Jira DC wiki format [~id] so server resolves to username
            if (node.type === 'mention') {
                if (node.attrs?.text) {
                    return node.attrs.text;
                }
                if (node.attrs?.id) {
                    return `[~${node.attrs.id}]`;
                }
                return '@unknown';
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
export function convertAdfToWikimarkup(adf: AdfNode | string | null | undefined): string {
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
 * Sanitizes ADF by removing invalid attributes that Jira API doesn't accept
 * Removes null/undefined values from attrs - Jira API v3 doesn't accept them
 * Also fixes mention id format - removes 'accountid:' prefix that WikiMarkupTransformer adds
 */
function sanitizeAdf(node: AdfNode): AdfNode {
    if (!node || typeof node !== 'object') {
        return node;
    }

    const sanitized: AdfNode = { ...node };

    // Remove null/undefined attributes - Jira API doesn't accept them
    if (sanitized.attrs) {
        const cleanedAttrs = Object.entries(sanitized.attrs).reduce(
            (acc, [key, value]) => {
                if (value !== null && value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            },
            {} as Record<string, any>,
        );

        // Strip 'accountid:' prefix from mention id (WikiMarkupTransformer adds it, but API expects plain id)
        if (sanitized.type === 'mention' && cleanedAttrs.id && typeof cleanedAttrs.id === 'string') {
            cleanedAttrs.id = cleanedAttrs.id.replace(/^accountid:/, '');
        }
        // If attrs is now empty, remove it entirely
        if (Object.keys(cleanedAttrs).length === 0) {
            delete sanitized.attrs;
        } else {
            sanitized.attrs = cleanedAttrs;
        }
    }

    // Recursively sanitize content array
    if (sanitized.content && Array.isArray(sanitized.content)) {
        sanitized.content = sanitized.content.map(sanitizeAdf);
    }

    // Recursively sanitize marks array
    if (sanitized.marks && Array.isArray(sanitized.marks)) {
        sanitized.marks = sanitized.marks.map((mark) => sanitizeAdf(mark as AdfNode)) as AdfMark[];
    }

    return sanitized;
}

/**
 * Converts WikiMarkup to ADF
 * Used when saving content from the legacy editor
 */
export function convertWikimarkupToAdf(wikimarkup: string): AdfNode {
    try {
        // Handle empty or whitespace-only input
        if (!wikimarkup || wikimarkup.trim() === '') {
            return {
                version: 1,
                type: 'doc',
                content: [],
            };
        }

        const transformer = new WikiMarkupTransformer();
        const pmNode = transformer.parse(wikimarkup);
        // Convert ProseMirror Node to plain ADF JSON object
        const adfJson = pmNode.toJSON();
        // Ensure version field is present
        if (!adfJson.version) {
            adfJson.version = 1;
        }
        // Sanitize the ADF to remove ProseMirror-specific attributes
        const sanitized = sanitizeAdf(adfJson);
        return sanitized;
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
export function isAdfFormat(content: unknown): content is AdfNode {
    if (typeof content === 'object' && content !== null) {
        const obj = content as Record<string, any>;
        return obj.type === 'doc' && obj.version === 1;
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
