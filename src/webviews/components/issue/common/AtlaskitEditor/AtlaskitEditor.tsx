import './AtlaskitEditor.css';

import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { createDefaultPreset } from '@atlaskit/editor-core/preset-default';
import { usePreset } from '@atlaskit/editor-core/use-preset';
// eslint-disable-next-line import/no-extraneous-dependencies
import { gridPlugin } from '@atlaskit/editor-plugin-grid';
import { insertBlockPlugin } from '@atlaskit/editor-plugin-insert-block';
import { listPlugin } from '@atlaskit/editor-plugin-list';
import { mediaPlugin } from '@atlaskit/editor-plugin-media';
import { textColorPlugin } from '@atlaskit/editor-plugin-text-color';
import { toolbarListsIndentationPlugin } from '@atlaskit/editor-plugin-toolbar-lists-indentation';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';

interface AtlaskitEditorProps extends Omit<Partial<EditorNextProps>, 'onChange' | 'onSave'> {
    onSave?: (content: string) => void;
    onCancel?: () => void;
    defaultValue?: string;
    onContentChange?: (content: string) => void;
    onChange?: (content: string) => void;
    onBlur?: (content: string) => void;
    getMediaAuth?: () => Promise<{ token: string; clientId: string; baseUrl?: string }>;
    issueKey?: string;
}

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const {
        appearance = 'comment',
        onCancel,
        onSave,
        defaultValue = '',
        onChange,
        onBlur,
        onContentChange,
        getMediaAuth,
        issueKey,
    } = props;

    // Media plugin options with provider that calls getMediaAuth (when supplied)
    const mediaOptions = React.useMemo(() => {
        const base: any = {
            allowMediaSingle: true,
            allowMediaGroup: true,
            allowResizing: true,
            allowAnnotation: true,
            allowLinking: true,
            allowResizingInTables: true,
            allowMediaInline: true,
            allowCaptions: true,
            allowAltTextOnImages: true,
            featureFlags: { mediaInline: true },
        };

        // Use provided media auth or return base config without provider
        if (!getMediaAuth) {
            return base;
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
            uploadParams: {
                collection: (issueKey as any) ?? 'atlascode',
            },
        });
        return { ...base, provider };
    }, [getMediaAuth, issueKey]);
    const { preset, editorApi } = usePreset(() => {
        return (
            createDefaultPreset({
                allowUndoRedoButtons: true,
                appearance: appearance,
                codeBlock: {},
                hyperlinkOptions: {
                    lpLinkPicker: true,
                    editorAppearance: appearance,
                    linkPicker: {},
                    platform: 'web',
                },
            })
                // Add additional plugins (floatingToolbar is already in default preset, but grid is needed for media)
                .add(gridPlugin)
                .add(listPlugin)
                .add([
                    toolbarListsIndentationPlugin,
                    { showIndentationButtons: false, allowHeadingAndParagraphIndentation: false },
                ])
                .add(textColorPlugin)
                .add([mediaPlugin, mediaOptions])
                .add([
                    insertBlockPlugin,
                    { toolbarShowPlusInsertOnly: false, appearance: appearance, allowExpand: true }, // Set to false to show media button
                ])
        );
    }, [mediaOptions]);
    // Helper function to get current document content
    const getCurrentContent = React.useCallback(async (): Promise<string | null> => {
        try {
            if (!editorApi) {
                return null;
            }

            return new Promise((resolve) => {
                editorApi.core.actions.requestDocument(
                    (document) => {
                        if (!document) {
                            resolve(null);
                            return;
                        }
                        // document is in wiki markup format because of transformer passed below
                        resolve(document);
                    },
                    {
                        transformer: editorApi.core.actions.createTransformer(
                            (scheme) => new WikiMarkupTransformer(scheme),
                        ),
                    },
                );
            });
        } catch (error) {
            console.error(error);
            return null;
        }
    }, [editorApi]);

    // Track previous content for change detection
    const previousContentRef = React.useRef<string>('');

    // Polling mechanism to detect content changes (for onChange support)
    React.useEffect(() => {
        if (!editorApi || (!onChange && !onContentChange)) {
            return;
        }

        const checkForChanges = async () => {
            const content = await getCurrentContent();
            if (content !== null && content !== previousContentRef.current) {
                previousContentRef.current = content;
                onChange?.(content);
                onContentChange?.(content);
            }
        };

        // Poll for changes every 500ms
        const interval = setInterval(checkForChanges, 500);

        return () => {
            clearInterval(interval);
        };
    }, [editorApi, onChange, onContentChange, getCurrentContent]);

    // Handle blur events using DOM events with a ref to the editor container
    const editorContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!onBlur || !editorContainerRef.current) {
            return;
        }

        const handleDOMBlur = async (event: FocusEvent) => {
            // Check if focus is moving outside the editor container
            if (!editorContainerRef.current?.contains(event.relatedTarget as Node)) {
                const content = await getCurrentContent();
                if (content !== null) {
                    onBlur(content);
                }
            }
        };

        const container = editorContainerRef.current;
        container.addEventListener('focusout', handleDOMBlur);

        return () => {
            container.removeEventListener('focusout', handleDOMBlur);
        };
    }, [onBlur, getCurrentContent]);

    // Handle save button click using EditorActions
    const handleSave = async () => {
        try {
            if (!editorApi) {
                throw new Error('editorApi is not available');
            }

            editorApi.core.actions.requestDocument(
                (document) => {
                    if (!document) {
                        throw new Error('document is not available');
                    }
                    // document is in  wiki markup format because of transformer passed below
                    onSave?.(document);
                },
                {
                    transformer: editorApi.core.actions.createTransformer(
                        (scheme) => new WikiMarkupTransformer(scheme),
                    ),
                },
            );
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div ref={editorContainerRef}>
            <ComposableEditor
                useStickyToolbar={true}
                assistiveLabel="Rich text editor for comments"
                preset={preset}
                defaultValue={defaultValue}
                contentTransformerProvider={(schema) => {
                    // here we transforms ADF <-> wiki markup
                    return new WikiMarkupTransformer(schema);
                }}
            />
            {(onSave || onCancel) && (
                <div
                    data-testid="ak-editor-secondary-toolbar"
                    style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '8px 0px',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onSave && (
                            <VSCodeButton appearance="primary" data-testid="comment-save-button" onClick={handleSave}>
                                Save
                            </VSCodeButton>
                        )}
                        {onCancel && (
                            <VSCodeButton appearance="secondary" onClick={onCancel}>
                                Cancel
                            </VSCodeButton>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default AtlaskitEditor;
