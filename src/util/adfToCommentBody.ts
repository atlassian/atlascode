/**
 * Converts comment body to a string for Jira DC API (DC expects string, not ADF object).
 * Cloud accepts ADF; use this only when sending to DC.
 */

interface AdfLikeNode {
    type?: string;
    text?: string;
    content?: AdfLikeNode[];
    attrs?: Record<string, unknown>;
}

function extractTextFromAdfLike(node: AdfLikeNode): string {
    if (!node || typeof node !== 'object') {
        return '';
    }
    const type = node.type;
    if (type === 'text') {
        return typeof node.text === 'string' ? node.text : '';
    }
    if (type === 'taskItem') {
        const state = node.attrs && (node.attrs as { state?: string }).state === 'DONE' ? '[x] ' : '[ ] ';
        const content = Array.isArray(node.content) ? node.content.map(extractTextFromAdfLike).join('') : '';
        return state + content + '\n';
    }
    if (Array.isArray(node.content)) {
        const text = node.content.map(extractTextFromAdfLike).join('');
        if (type && ['paragraph', 'heading', 'taskList'].includes(type)) {
            return text + '\n';
        }
        return text;
    }
    if (type === 'mention') {
        const attrs = node.attrs as { id?: string; text?: string } | undefined;
        if (attrs?.text) {
            return attrs.text;
        }
        // Jira DC resolves [~accountId] or [~id] to the username; avoid @unknown
        if (attrs?.id) {
            return `[~${attrs.id}]`;
        }
        return '@unknown';
    }
    return '';
}

/**
 * Returns a string suitable for Jira DC comment body. If input is already a string,
 * returns it; if it is an ADF-like object, extracts plain text. Use only for DC.
 */
export function commentBodyToString(comment: string | Record<string, unknown>): string {
    if (typeof comment === 'string') {
        return comment;
    }
    if (comment === null || typeof comment !== 'object') {
        return '';
    }
    const doc = comment as AdfLikeNode;
    try {
        if (doc.type === 'doc' && Array.isArray(doc.content)) {
            return doc.content.map(extractTextFromAdfLike).join('').trim();
        }
        return extractTextFromAdfLike(doc).trim() || JSON.stringify(comment);
    } catch {
        return JSON.stringify(comment);
    }
}
