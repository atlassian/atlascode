/**
 * Converts HTML (e.g. Jira renderedFields.description) to ADF.
 * Used when links or other content added on Jira Web are present in the rendered
 * HTML but not in the raw description (Cloud and DC). Using rendered HTML for
 * the editor keeps edit mode in sync with render mode.
 */

interface AdfTextNode {
    type: 'text';
    text: string;
    marks?: Array<{ type: string; attrs?: Record<string, string> }>;
}

interface AdfBlockNode {
    type: string;
    content?: AdfNode[];
    attrs?: Record<string, unknown>;
}

type AdfNode = AdfTextNode | AdfBlockNode;

function textNode(text: string, marks?: AdfTextNode['marks']): AdfTextNode {
    const node: AdfTextNode = { type: 'text', text };
    if (marks && marks.length > 0) {
        node.marks = marks;
    }
    return node;
}

function linkMark(href: string): { type: string; attrs: Record<string, string> } {
    return { type: 'link', attrs: { href } };
}

function parseInlineNodes(element: Element): AdfNode[] {
    const nodes: AdfNode[] = [];
    const walk = (el: Node): void => {
        if (el.nodeType === Node.TEXT_NODE) {
            const t = el.textContent?.trim();
            if (t) {
                nodes.push(textNode(t));
            }
            return;
        }
        if (el.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        const e = el as Element;
        const tag = e.tagName.toLowerCase();
        if (tag === 'a') {
            const href = e.getAttribute('href') || '';
            const text = e.textContent?.trim() || href;
            nodes.push(textNode(text, [linkMark(href)]));
            return;
        }
        if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i') {
            e.childNodes.forEach(walk);
            return;
        }
        if (tag === 'br') {
            nodes.push(textNode('\n'));
            return;
        }
        e.childNodes.forEach(walk);
    };
    element.childNodes.forEach(walk);
    return nodes;
}

function flattenParagraphContent(nodes: AdfNode[]): AdfNode[] {
    const out: AdfNode[] = nodes.filter((n) => !(n.type === 'text' && 'text' in n && n.text === '\n'));
    return out.length ? out : [textNode('')];
}

/**
 * Converts an HTML string (e.g. from Jira renderedFields) to ADF document.
 * Supports paragraphs, links, headings, and basic structure. Safe in webview (uses DOMParser).
 */
export function convertHtmlToAdf(html: string): { version: 1; type: 'doc'; content: AdfBlockNode[] } {
    const content: AdfBlockNode[] = [];
    if (!html || typeof html !== 'string') {
        return { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [textNode('')] }] };
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;

        const getBlockType = (tag: string): 'paragraph' | 'heading' => (/^h[1-6]$/.test(tag) ? 'heading' : 'paragraph');
        const getHeadingLevel = (tag: string): number => {
            const m = /^h([1-6])$/i.exec(tag);
            return m ? parseInt(m[1], 10) : 1;
        };

        const visit = (el: Element): void => {
            const tag = el.tagName.toLowerCase();
            if (tag === 'ul' || tag === 'ol') {
                Array.from(el.children).forEach((li) => {
                    if (li.tagName.toLowerCase() === 'li') {
                        const inner = parseInlineNodes(li);
                        content.push({ type: 'paragraph', content: flattenParagraphContent(inner) });
                    }
                });
                return;
            }
            if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'br'].includes(tag)) {
                if (tag === 'br') {
                    content.push({ type: 'paragraph', content: [textNode('')] });
                    return;
                }
                const inner = parseInlineNodes(el);
                const blockType = getBlockType(tag);
                content.push(
                    blockType === 'heading'
                        ? {
                              type: 'heading',
                              attrs: { level: getHeadingLevel(tag) },
                              content: flattenParagraphContent(inner),
                          }
                        : { type: 'paragraph', content: flattenParagraphContent(inner) },
                );
                return;
            }
            const inner = parseInlineNodes(el);
            if (inner.length > 0) {
                content.push({ type: 'paragraph', content: flattenParagraphContent(inner) });
            }
        };

        const blocks: Element[] = [];
        for (const child of body.childNodes) {
            if (child.nodeType !== Node.ELEMENT_NODE) {
                const text = child.textContent?.trim();
                if (text) {
                    const wrap = doc.createElement('p');
                    wrap.textContent = text;
                    blocks.push(wrap);
                }
                continue;
            }
            blocks.push(child as Element);
        }
        blocks.forEach(visit);

        if (content.length === 0) {
            content.push({ type: 'paragraph', content: [textNode('')] });
        }

        return { version: 1, type: 'doc', content };
    } catch (err) {
        console.warn('htmlToAdf: parse failed', err);
        return {
            version: 1,
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [textNode(html.replace(/<[^>]+>/g, ' ').trim() || '')],
                },
            ],
        };
    }
}
