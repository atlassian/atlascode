import { mention } from '@atlaskit/adf-utils/builders';
import { filter, traverse } from '@atlaskit/adf-utils/traverse';
import { MentionNameDetails } from '@atlaskit/mention';
import { ReactRenderer } from '@atlaskit/renderer';
import React, { memo, useLayoutEffect, useState } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: string;
    mentionProvider: AtlascodeMentionProvider;
}

/**
 * Smart component that renders ADF content with support for tasks, decisions, and mentions.
 * Manually resolves mention names because ReactRenderer doesn't support mentionProvider prop.
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = memo(({ content, mentionProvider }) => {
    const [traversedDocument, setTraversedDocument] = useState<any>(null);
    const [lastContent, setLastContent] = useState<string>(content);

    try {
        // Parse content as ADF JSON directly (no Wiki Markup transformation)
        const document = typeof content === 'string' ? JSON.parse(content) : content;

        useLayoutEffect(() => {
            // Reset when content changes
            if (content !== lastContent) {
                setTraversedDocument(null);
                setLastContent(content);
            }

            const fetchMentions = async () => {
                if (!traversedDocument) {
                    const mentionsMap = new Map<string, MentionNameDetails>();
                    const mentionNodes = filter(document, (node) => node.type === 'mention' && node?.attrs?.id);
                    for (const mentionNode of mentionNodes) {
                        // redundant check - for TS
                        if (!mentionNode?.attrs?.id) {
                            continue;
                        }
                        const resolvedMention = await mentionProvider.resolveMentionName(mentionNode.attrs.id);
                        mentionsMap.set(mentionNode.attrs.id, resolvedMention);
                    }
                    const traversedDocument = traverse(document, {
                        mention: (node) => {
                            const mentionName = mentionsMap.get(node?.attrs?.id)?.name || 'Unknown User';
                            return mention({
                                id: node?.attrs?.id,
                                text: `@${mentionName}`,
                            });
                        },
                    });
                    if (typeof traversedDocument !== 'boolean') {
                        setTraversedDocument(traversedDocument);
                    }
                }
            };

            fetchMentions();
        }, [content, document, mentionProvider, traversedDocument, lastContent]);

        return (
            <IntlProvider locale="en">
                {!traversedDocument ? (
                    <p>Loading...</p>
                ) : (
                    <ReactRenderer data-test-id="adf-renderer" document={traversedDocument || document} />
                )}
            </IntlProvider>
        );
    } catch (error) {
        console.error('Failed to parse ADF content, falling back to text:', error);
        return <p>{content}</p>;
    }
});
