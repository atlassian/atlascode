import { ReactRenderer } from '@atlaskit/renderer';
import React, { memo, useMemo } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: string | any;
    mentionProvider: AtlascodeMentionProvider;
}

/**
 * * Smart component that renders ADF content with support for tasks, decisions, and mentions
 * * The ReactRenderer handles mentions automatically via the mentionProvider
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = memo(({ content, mentionProvider }) => {
    // Memoize the parsed document to avoid re-parsing on every render
    const document = useMemo(() => {
        try {
            // Parse content (handle both ADF object and string)
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            // Validate proper ADF structure - must be a doc node with version 1
            if (parsed && parsed.type === 'doc' && parsed.version === 1) {
                return parsed;
            }

            console.warn('Invalid ADF structure, cannot render. Expected doc type with version 1.', parsed);
            return null;
        } catch (error) {
            console.error('Failed to parse ADF content:', error);
            return null;
        }
    }, [content]);

    if (!document) {
        return <p>{content}</p>;
    }

    return (
        <IntlProvider locale="en">
            <ReactRenderer data-test-id="adf-renderer" document={document} />
        </IntlProvider>
    );
});
