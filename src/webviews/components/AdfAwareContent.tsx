import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { ADFEncoder, ReactRenderer } from '@atlaskit/renderer';
import React from 'react';

interface AdfAwareContentProps {
    content: string;
    fetchImage: (url: string) => Promise<string>;
}

/**
 * Smart component that detects and renders wiki markup
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = ({ content, fetchImage }) => {
    try {
        const adfEncoder = new ADFEncoder((schema) => new WikiMarkupTransformer(schema));
        const document = adfEncoder.encode(content);
        return <ReactRenderer data-test-id="adf-renderer" document={document} />;
    } catch (error) {
        console.error('Failed to parse WikiMarkup, falling back to text:', error);
        return <p>{content}</p>;
    }
};
