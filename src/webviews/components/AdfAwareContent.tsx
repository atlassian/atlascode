import { ProviderFactory } from '@atlaskit/editor-common/provider-factory';
import { ReactRenderer } from '@atlaskit/renderer';
import React, { memo } from 'react';
import { IntlProvider } from 'react-intl-next';

import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
interface AdfAwareContentProps {
    content: any; // ADF formatted content
    mentionProvider: AtlascodeMentionProvider;
}
export const AdfAwareContent: React.FC<AdfAwareContentProps> = memo(({ content, mentionProvider }) => {
    try {
        const providerFactory = React.useMemo(() => {
            return ProviderFactory.create({
                mediaProvider: Promise.resolve({
                    viewMediaClientConfig: {
                        authProvider: () =>
                            // TODO: Provide token and clientId from request to Jira token endpoint
                            // For testing purposes you can get a token and clientId on Jira Fronted by intercepting network requests
                            Promise.resolve({
                                token: '',
                                clientId: '',
                                baseUrl: 'https://api.media.atlassian.com',
                            }),
                    },
                }),
                mentionProvider: Promise.resolve(mentionProvider),
            });
        }, [mentionProvider]);

        return (
            <IntlProvider locale="en">
                <ReactRenderer data-test-id="adf-renderer" document={content} dataProviders={providerFactory} />
            </IntlProvider>
        );
    } catch (error) {
        console.error('Failed to render ADF content, falling back to text:', error);
        return <p>{content}</p>;
    }

    return (
        <IntlProvider locale="en">
            <ReactRenderer data-test-id="adf-renderer" document={document} />
        </IntlProvider>
    );
});
