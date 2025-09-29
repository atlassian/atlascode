import { ReactRenderer } from '@atlaskit/renderer';
import React from 'react';

interface AdfAwareContentProps {
    content: string;
    className?: string;
    style?: React.CSSProperties;
}

const AdfAwareContent: React.FC<AdfAwareContentProps> = ({ content, className, style }) => {
    // Memoized ADF detection and parsing
    const { isAdf, adfDocument } = React.useMemo(() => {
        if (!content || typeof content !== 'string') {
            return { isAdf: false, adfDocument: null };
        }

        try {
            const parsed = JSON.parse(content);
            const isValidAdf = parsed && typeof parsed === 'object' && parsed.type === 'doc' && parsed.version === 1;

            return {
                isAdf: isValidAdf,
                adfDocument: isValidAdf ? parsed : null,
            };
        } catch {
            // Not valid JSON, treat as plain text/HTML
            return { isAdf: false, adfDocument: null };
        }
    }, [content]);

    // Render ADF using official Atlaskit renderer
    if (isAdf && adfDocument) {
        return (
            <div className={className} style={style}>
                <ReactRenderer document={adfDocument} appearance="full-page" />
            </div>
        );
    }

    // Fallback: render as HTML for plain text/HTML content
    // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: content || '' }} />;
};

export default AdfAwareContent;
