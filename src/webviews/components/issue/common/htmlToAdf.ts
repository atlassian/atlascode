/**
 * Converts Jira rendered description HTML → ADF for the issue description editor.
 * Used only in IssueMainPanel when we have description.rendered (e.g. Cloud, or fallback)
 * so that content added on Jira Web (links, etc.) appears in edit mode.
 * Pipeline: TurndownService (HTML → Markdown) + MarkdownTransformer (Markdown → ADF).
 */

import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer';
import TurndownService from 'turndown';

const turndown = new TurndownService();
const markdownTransformer = new MarkdownTransformer();

const emptyDoc = (): { version: 1; type: 'doc'; content: any[] } => ({
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
});

export function convertHtmlToAdf(html: string): { version: 1; type: 'doc'; content: any[] } {
    if (!html || typeof html !== 'string') {
        return emptyDoc();
    }
    try {
        const md = turndown.turndown(html);
        const node = markdownTransformer.parse(md);
        const doc = node.toJSON() as { content?: any[] };
        return {
            version: 1,
            type: 'doc',
            content: Array.isArray(doc?.content) ? doc.content : [],
        };
    } catch (err) {
        console.warn('htmlToAdf: parse failed', err);
        return {
            ...emptyDoc(),
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: html.replace(/<[^>]+>/g, ' ').trim() || '' }],
                },
            ],
        };
    }
}
