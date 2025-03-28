import { makeStyles, Theme } from '@material-ui/core';
import React from 'react';

export type RenderedContent = {
    html: string;
    markup: 'markdown' | 'creole';
    raw: string;
    type: 'rendered';
};

export const useStyles = makeStyles((theme: Theme) => ({
    titleText: {
        img: {
            maxHeight: '1em',
            verticalAlign: 'text-bottom',
            '&.emoji': {
                height: '1em',
            },
        },
    },
}));

const newlineOrTabRegex = /[\n\r\t]+/g;
// Note: We tried using `getComputedStyle(node).display === 'inline'` instead of a hardcoded list, but that doesn't work
// on some browsers if the element is not in the DOM.
const inlines = new Set(['#text', 'CODE', 'EM', 'STRONG', 'A', 'IMG', 'DEL', 'ABBR']);
const newlineBlocks = new Set(['P', 'BR', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);

// To make it easier to understand what's going on, let's look at an example input:
//
//     <p>Title with <em>emphasis</em></p><p>Second line</p>
//
// 1. We start at the first P node, and recurse.
// 2. We preserve the text node and the emphasis; we're done with the child nodes
// 3. Because the P is not an inline node, we want to unwrap it. That means taking all its child nodes and inserting
//    them into a SPAN instead, then remove the P and insert a " ". Now the document looks like this:
//        <span>Title with <em>emphasis</em></span> <p>Second line</p>
//    (Note the second P is now the third node, before it was the second; that's why we can't iterate with indexes)
// 4. Go to the original sibling of the first P node -> the second P node
// 5. Unwrap it too
const unwrapBlockNodes = (parentNode: Node) => {
    let node: Node | null = parentNode.firstChild;
    while (node) {
        // Get next node early, because one of the code paths below removes `node` from the tree.
        const nextNode = node.nextSibling;

        // Recurse into child nodes; need to do this for inlines as well to remove e.g. `<br>` from `<em>foo<br></em>`
        unwrapBlockNodes(node);

        if (!inlines.has(node.nodeName)) {
            if (newlineBlocks.has(node.nodeName)) {
                // For <p> and some other blocks, wrap in a span and add a space to separate the content of multiple lines
                const span = document.createElement('SPAN');
                parentNode.insertBefore(span, node);
                parentNode.insertBefore(document.createTextNode(' '), node);

                while (node.firstChild) {
                    span.appendChild(node.firstChild);
                }
            } else {
                // Other block nodes we just want to remove. Move children to parent so we can later delete the node itself.
                while (node.firstChild) {
                    parentNode.insertBefore(node.firstChild, node);
                }
            }

            // Now remove block node itself
            parentNode.removeChild(node);
        }

        node = nextNode;
    }
};

export type RenderedTitleProps = {
    renderedContent: RenderedContent;
};

export default function RenderedTitle({ renderedContent }: RenderedTitleProps) {
    const classes = useStyles();

    if (!renderedContent.html) {
        // Default to just using the raw title, in case the rendered HTML version
        // isn't usable.
        const raw = renderedContent.raw.replace(newlineOrTabRegex, ' ');
        return <div className={classes.titleText}>{raw}</div>;
    }

    // Rendered UGC from the API always comes wrapped in a <p> or other block tags.
    // "Parse" the HTML in order to unwrap it and use just the HTML *inside* the <p> tag.
    const element = document.createElement('SPAN');
    element.innerHTML = renderedContent.html;
    unwrapBlockNodes(element);
    const { lastChild } = element;
    if (lastChild && lastChild.nodeName === '#text' && lastChild.textContent === ' ') {
        // Remove trailing " " text node that we use for joining lines
        element.removeChild(lastChild);
    }

    return <div className={classes.titleText} dangerouslySetInnerHTML={{ __html: element.innerHTML }} />;
}
