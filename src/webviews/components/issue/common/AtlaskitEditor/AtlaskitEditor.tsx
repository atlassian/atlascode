import './AtlaskitEditor.css';

import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { createDefaultPreset } from '@atlaskit/editor-core/preset-default';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import { contentInsertionPlugin } from '@atlaskit/editor-plugin-content-insertion';
import { gridPlugin } from '@atlaskit/editor-plugin-grid';
import { insertBlockPlugin } from '@atlaskit/editor-plugin-insert-block';
import { listPlugin } from '@atlaskit/editor-plugin-list';
import { mediaPlugin } from '@atlaskit/editor-plugin-media';
import { mentionsPlugin } from '@atlaskit/editor-plugin-mentions';
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
    onFocus: () => void;
    onBlur: () => void;
    isSaveOnBlur?: boolean;
}

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const {
        appearance = 'comment',
        onCancel,
        onSave,
        defaultValue = '',
        onChange,
        onFocus,
        onBlur,
        onContentChange,
        mentionProvider,
        isSaveOnBlur,
    } = props;

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
                // You can extend this with other plugins if you need them
                .add(listPlugin)
                .add([
                    toolbarListsIndentationPlugin,
                    { showIndentationButtons: false, allowHeadingAndParagraphIndentation: false },
                ])
                .add(textColorPlugin)
                .add([
                    insertBlockPlugin,
                    { toolbarShowPlusInsertOnly: true, appearance: appearance, allowExpand: true },
                ])
                .add(mentionsPlugin)
                .add(contentInsertionPlugin)
                .add(gridPlugin)
                .add([
                    mediaPlugin,
                    {
                        provider: Promise.resolve({
                            viewMediaClientConfig: {
                                authProvider: () =>
                                    Promise.resolve({
                                        token: '',
                                        clientId: '',
                                        baseUrl: 'https://api.media.atlassian.com',
                                    }),
                            },
                        }),
                        allowMediaSingle: true,
                    },
                ])
        );
    }, []);
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
                        resolve(JSON.stringify(document));
                    },
                    // {
                    //     transformer: editorApi.core.actions.createTransformer(
                    //         (scheme) => new WikiMarkupTransformer(scheme),
                    //     ),
                    // },
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

    // Handle save button click using EditorActions
    const handleSave = React.useCallback(async () => {
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
    }, [editorApi, onSave]);

    React.useEffect(() => {
        return editorApi?.focus.sharedState.onChange(({ nextSharedState }) => {
            if (nextSharedState.hasFocus && onFocus) {
                onFocus();
            } else if (!nextSharedState.hasFocus && onBlur) {
                onBlur();
                if (isSaveOnBlur) {
                    handleSave();
                }
            }
        });
    }, [editorApi?.focus.sharedState, onFocus, onBlur, isSaveOnBlur, handleSave]);

    return (
        <div ref={editorContainerRef}>
            <ComposableEditor
                useStickyToolbar={true}
                assistiveLabel="Rich text editor for comments"
                preset={preset}
                defaultValue={defaultValue}
                // contentTransformerProvider={(schema) => {
                //     // here we transforms ADF <-> wiki markup
                //     return new WikiMarkupTransformer(schema);
                // }}
                mentionProvider={mentionProvider}
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
                        {!isSaveOnBlur && onSave && (
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
