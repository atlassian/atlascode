import { ReactRenderer } from '@atlaskit/renderer';
import React, { memo } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: string;
    mentionProvider: AtlascodeMentionProvider;
}

/**
 * Smart component that renders ADF content with support for tasks, decisions, and mentions
 * The ReactRenderer handles mentions automatically via the mentionProvider
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = memo(({ content, mentionProvider }) => {
    try {
        // Parse content as ADF JSON directly (no Wiki Markup transformation)
        const document = typeof content === 'string' ? JSON.parse(content) : content;

        return (
            <IntlProvider locale="en">
                <ReactRenderer data-test-id="adf-renderer" document={document} />
            </IntlProvider>
        );
    } catch (error) {
        console.error('Failed to parse ADF content, falling back to text:', error);
        return <p>{content}</p>;
    }
});
