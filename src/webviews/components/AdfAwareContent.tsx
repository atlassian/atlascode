import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { ADFEncoder, ReactRenderer } from '@atlaskit/renderer';
import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { IntlProvider } from 'react-intl-next';

interface AdfAwareContentProps {
    content: any;
    fetchImage: (url: string) => Promise<string>;
    getMediaAuth?: () => Promise<{ token: string; clientId?: string; baseUrl?: string }>;
}

/**
 * Smart component that detects and renders wiki markup
 */
export const AdfAwareContent: React.FC<AdfAwareContentProps> = ({ content, fetchImage, getMediaAuth }) => {
    try {
        const buildMedia = () => {
            if (!getMediaAuth) {
                return undefined as any;
            }
            const provider = Promise.resolve({
                uploadMediaClientConfig: {
                    authProvider: async () => {
                        const auth = await getMediaAuth();
                        return {
                            token: auth.token,
                            clientId: auth.clientId,
                            baseUrl: auth.baseUrl ?? 'https://api.media.atlassian.com',
                        } as any;
                    },
                },
                viewMediaClientConfig: {
                    authProvider: async () => {
                        const auth = await getMediaAuth();
                        return {
                            token: auth.token,
                            clientId: auth.clientId,
                            baseUrl: auth.baseUrl ?? 'https://api.media.atlassian.com',
                        } as any;
                    },
                },
            });
            return { provider, featureFlags: { mediaInline: true }, allowMediaSingle: true } as any;
        };

        // If ADF object passed directly
        if (content && typeof content === 'object' && content.type === 'doc') {
            return (
                <IntlProvider locale="en">
                    <ReactRenderer data-test-id="adf-renderer" document={content} media={buildMedia()} />
                </IntlProvider>
            );
        }

        // If ADF JSON string
        if (typeof content === 'string') {
            const parsed = JSON.parse(content);
            if (parsed && parsed.type === 'doc') {
                return (
                    <IntlProvider locale="en">
                        <ReactRenderer data-test-id="adf-renderer" document={parsed} media={buildMedia()} />
                    </IntlProvider>
                );
            }
        }

        // Treat as wiki markup → ADF
        const adfEncoder = new ADFEncoder((schema) => new WikiMarkupTransformer(schema));
        const document = adfEncoder.encode(typeof content === 'string' ? content : '');
        return (
            <IntlProvider locale="en">
                <ReactRenderer data-test-id="adf-renderer" document={document} media={buildMedia()} />
            </IntlProvider>
        );
    } catch (error) {
        console.error('Failed to render content, falling back to text:', error);
        return <p>{typeof content === 'string' ? content : ''}</p>;
    }
};
