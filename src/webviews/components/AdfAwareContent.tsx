import { mention } from '@atlaskit/adf-utils/builders';
import { filter, traverse } from '@atlaskit/adf-utils/traverse';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { MentionNameDetails } from '@atlaskit/mention';
import { ADFEncoder, ReactRenderer } from '@atlaskit/renderer';
import React, { memo, useLayoutEffect, useState } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: string;
    mentionProvider: AtlascodeMentionProvider;
}

/**
 * Smart component that detects and renders wiki markup
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = memo(({ content, mentionProvider }) => {
    const [traversedDocument, setTraversedDocument] = useState<any>(null);
    try {
        const adfEncoder = new ADFEncoder((schema) => {
            return new WikiMarkupTransformer(schema);
        });
        const document = adfEncoder.encode(content);

        useLayoutEffect(() => {
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
                            return mention({
                                id: node?.attrs?.id,
                                text: `@${mentionsMap.get(node?.attrs?.id)?.name}` || `@Unknown User`,
                            });
                        },
                    });
                    if (typeof traversedDocument !== 'boolean') {
                        setTraversedDocument(traversedDocument);
                    }
                }
            };

            fetchMentions();
        }, [document, mentionProvider, traversedDocument]);

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
        console.error('Failed to parse WikiMarkup, falling back to text:', error);
        return <p>{content}</p>;
    }
});
