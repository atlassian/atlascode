import { mention } from '@atlaskit/adf-utils/builders';
import { filter, traverse } from '@atlaskit/adf-utils/traverse';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { MentionNameDetails } from '@atlaskit/mention';
import { ADFEncoder, ReactRenderer } from '@atlaskit/renderer';
import React, { memo, useLayoutEffect } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: string;
    mentionProvider: AtlascodeMentionProvider;
}

const mentionsMap = new Map<string, MentionNameDetails>();
/**
 * Smart component that detects and renders wiki markup
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = memo(({ content, mentionProvider }) => {
    try {
        const adfEncoder = new ADFEncoder((schema) => {
            return new WikiMarkupTransformer(schema);
        });
        const document = adfEncoder.encode(content);

        useLayoutEffect(() => {
            const fetchMentions = async () => {
                const mentionsRequests = filter(document, (node) => node.type === 'mention' && node?.attrs?.id).map(
                    async (node) => await mentionProvider.resolveMentionName(node?.attrs?.id),
                );
                const fetchedMentions = await Promise.all(mentionsRequests);
                fetchedMentions.forEach((mention) => {
                    mentionsMap.set(mention.id, mention);
                });
            };

            fetchMentions();
        }, [document, mentionProvider]);

        const traversedDocument = traverse(document, {
            mention: (node) => {
                return mention({
                    id: node?.attrs?.id,
                    text: `@${mentionsMap.get(node?.attrs?.id)?.name}` || `@Unknown User`,
                });
            },
        });
        return (
            <IntlProvider locale="en">
                <ReactRenderer data-test-id="adf-renderer" document={traversedDocument || document} />
            </IntlProvider>
        );
    } catch (error) {
        console.error('Failed to parse WikiMarkup, falling back to text:', error);
        return <p>{content}</p>;
    }
});
