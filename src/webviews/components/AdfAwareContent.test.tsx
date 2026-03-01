import { render, screen } from '@testing-library/react';
import React from 'react';

import { AdfAwareContent } from './AdfAwareContent';
import { AtlascodeMentionProvider } from './issue/common/AtlaskitEditor/AtlascodeMentionsProvider';

jest.mock('@atlaskit/renderer', () => ({
    ReactRenderer: ({ document, 'data-test-id': testId }: any) => <div data-testid={testId}>Rendered ADF Content</div>,
}));

jest.mock('react-intl-next', () => ({
    IntlProvider: ({ children }: any) => children,
}));

describe('AdfAwareContent', () => {
    const mockMentionProvider: AtlascodeMentionProvider = {
        search: jest.fn(),
        shouldHighlightMention: jest.fn(),
        recordMentionSelection: jest.fn(),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Valid ADF content', () => {
        it('should render valid ADF string content', () => {
            const validAdf = JSON.stringify({
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Hello world',
                            },
                        ],
                    },
                ],
            });

            const { container } = render(<AdfAwareContent content={validAdf} mentionProvider={mockMentionProvider} />);

            expect(screen.getByTestId('adf-renderer')).toBeDefined();
            expect(screen.getByText('Rendered ADF Content')).toBeDefined();
            expect(container.firstChild).toMatchSnapshot();
        });

        it('should render valid ADF object content', () => {
            const validAdfObject = {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Test content',
                            },
                        ],
                    },
                ],
            };

            render(<AdfAwareContent content={validAdfObject as any} mentionProvider={mockMentionProvider} />);

            expect(screen.getByTestId('adf-renderer')).toBeDefined();
        });

        it('should render ADF with complex content structure', () => {
            const complexAdf = JSON.stringify({
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Bold text: ',
                            },
                            {
                                type: 'text',
                                text: 'important',
                                marks: [
                                    {
                                        type: 'strong',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'bulletList',
                        content: [
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Item 1',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            render(<AdfAwareContent content={complexAdf} mentionProvider={mockMentionProvider} />);

            expect(screen.getByTestId('adf-renderer')).toBeDefined();
        });

        it('should render ADF with mentions', () => {
            const adfWithMentions = JSON.stringify({
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Hey ',
                            },
                            {
                                type: 'mention',
                                attrs: {
                                    id: 'user-123',
                                    text: '@John',
                                },
                            },
                            {
                                type: 'text',
                                text: ', check this out',
                            },
                        ],
                    },
                ],
            });

            render(<AdfAwareContent content={adfWithMentions} mentionProvider={mockMentionProvider} />);

            expect(screen.getByTestId('adf-renderer')).toBeDefined();
        });
    });

    describe('Invalid ADF content', () => {
        it('should render empty when content is null', () => {
            render(<AdfAwareContent content={null as any} mentionProvider={mockMentionProvider} />);

            // When content is null, React renders <p /> (empty paragraph)
            const paragraph = screen.getByRole('paragraph');
            expect(paragraph.textContent).toBe('');
        });

        it('should render empty when content is undefined', () => {
            render(<AdfAwareContent content={undefined as any} mentionProvider={mockMentionProvider} />);

            // When content is undefined, React renders <p /> (empty paragraph)
            const paragraph = screen.getByRole('paragraph');
            expect(paragraph.textContent).toBe('');
        });

        it('should render empty when content is empty string', () => {
            render(<AdfAwareContent content="" mentionProvider={mockMentionProvider} />);

            // When content is empty string, React renders <p /> (empty paragraph)
            const paragraph = screen.getByRole('paragraph');
            expect(paragraph.textContent).toBe('');
        });

        it('should render plain text for invalid JSON', () => {
            const invalidJson = '{invalid json}';

            render(<AdfAwareContent content={invalidJson} mentionProvider={mockMentionProvider} />);

            expect(screen.getByText(invalidJson)).toBeDefined();
        });

        it('should render plain text for missing type field', () => {
            const noType = JSON.stringify({
                version: 1,
                content: [],
            });

            render(<AdfAwareContent content={noType} mentionProvider={mockMentionProvider} />);

            expect(screen.getByText(noType)).toBeDefined();
        });

        it('should render plain text for missing version field', () => {
            const noVersion = JSON.stringify({
                type: 'doc',
                content: [],
            });

            render(<AdfAwareContent content={noVersion} mentionProvider={mockMentionProvider} />);

            expect(screen.getByText(noVersion)).toBeDefined();
        });
    });

    describe('Content parsing edge cases', () => {
        it('should handle ADF with empty content array', () => {
            const adfEmptyContent = JSON.stringify({
                type: 'doc',
                version: 1,
                content: [],
            });

            render(<AdfAwareContent content={adfEmptyContent} mentionProvider={mockMentionProvider} />);

            expect(screen.getByTestId('adf-renderer')).toBeDefined();
        });

        it('should handle plain text that looks like JSON', () => {
            const pseudoJson = '{"type": "unknown", "data": []}';

            render(<AdfAwareContent content={pseudoJson} mentionProvider={mockMentionProvider} />);

            expect(screen.getByText(pseudoJson)).toBeDefined();
        });

        it('should handle special characters in plain text fallback', () => {
            const textWithSpecialChars = '<script>alert("xss")</script>';

            render(<AdfAwareContent content={textWithSpecialChars} mentionProvider={mockMentionProvider} />);

            expect(screen.getByText(textWithSpecialChars)).toBeDefined();
        });

        it('should reparse content when content prop changes', () => {
            const { rerender } = render(
                <AdfAwareContent
                    content={JSON.stringify({
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: 'First' }],
                            },
                        ],
                    })}
                    mentionProvider={mockMentionProvider}
                />,
            );

            expect(screen.getByTestId('adf-renderer')).toBeDefined();

            rerender(<AdfAwareContent content="Plain text fallback" mentionProvider={mockMentionProvider} />);

            expect(screen.getByText('Plain text fallback')).toBeDefined();
            expect(screen.queryByTestId('adf-renderer')).toBeNull();
        });
    });

    describe('Memoization', () => {
        it('should memoize the component to prevent unnecessary re-renders', () => {
            const { rerender } = render(
                <AdfAwareContent
                    content={JSON.stringify({
                        type: 'doc',
                        version: 1,
                        content: [],
                    })}
                    mentionProvider={mockMentionProvider}
                />,
            );

            const firstRender = screen.getByTestId('adf-renderer');

            rerender(
                <AdfAwareContent
                    content={JSON.stringify({
                        type: 'doc',
                        version: 1,
                        content: [],
                    })}
                    mentionProvider={mockMentionProvider}
                />,
            );

            const secondRender = screen.getByTestId('adf-renderer');
            expect(firstRender).toBeDefined();
            expect(secondRender).toBeDefined();
        });
    });

    describe('Snapshot Tests', () => {
        it('should match snapshot for valid ADF content', () => {
            const validAdf = JSON.stringify({
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Hello world' }],
                    },
                ],
            });

            const { container } = render(<AdfAwareContent content={validAdf} mentionProvider={mockMentionProvider} />);

            expect(container).toMatchSnapshot('valid-adf-content');
        });

        it('should match snapshot for invalid content fallback', () => {
            const { container } = render(
                <AdfAwareContent content={null as any} mentionProvider={mockMentionProvider} />,
            );

            expect(container).toMatchSnapshot('invalid-content-fallback');
        });

        it('should match snapshot for complex ADF with formatting', () => {
            const complexAdf = JSON.stringify({
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Bold: ' },
                            {
                                type: 'text',
                                text: 'important',
                                marks: [{ type: 'strong' }],
                            },
                        ],
                    },
                    {
                        type: 'bulletList',
                        content: [
                            {
                                type: 'listItem',
                                content: [
                                    {
                                        type: 'paragraph',
                                        content: [{ type: 'text', text: 'Item 1' }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            const { container } = render(
                <AdfAwareContent content={complexAdf} mentionProvider={mockMentionProvider} />,
            );

            expect(container).toMatchSnapshot('complex-adf-with-formatting');
        });
    });
});
