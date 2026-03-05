import { ReactRenderer } from '@atlaskit/renderer';
import React, { memo, useMemo } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: string;
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
            // Parse content as ADF JSON directly (no Wiki Markup transformation)
            return typeof content === 'string' ? JSON.parse(content) : content;
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
