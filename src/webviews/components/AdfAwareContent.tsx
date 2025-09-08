import { ReactRenderer } from '@atlaskit/renderer';
import React from 'react';

import { RenderedContent } from './RenderedContent';

interface AdfAwareContentProps {
    content: string;
    fetchImage: (url: string) => Promise<string>;
}

/**
 * Smart component that detects and renders both ADF JSON and HTML content
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = ({ content, fetchImage }) => {
    // Check if content is ADF JSON
    const isAdfJson = (text: string): boolean => {
        try {
            const trimmed = text.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                const parsed = JSON.parse(trimmed);
                return parsed.version === 1 && parsed.type === 'doc';
            }
            return false;
        } catch {
            return false;
        }
    };

    // If content is ADF JSON, use Atlaskit Renderer
    if (isAdfJson(content)) {
        try {
            const adfDoc = JSON.parse(content);
            return (
                <div>
                    <ReactRenderer document={adfDoc} />
                </div>
            );
        } catch (error) {
            console.warn('Failed to parse ADF JSON, falling back to text:', error);
            return <p>{content}</p>;
        }
    }

    // If content looks like HTML (contains tags), use RenderedContent
    if (content.includes('<') && content.includes('>')) {
        return <RenderedContent html={content} fetchImage={fetchImage} />;
    }

    // Otherwise, render as plain text
    return <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>;
};
