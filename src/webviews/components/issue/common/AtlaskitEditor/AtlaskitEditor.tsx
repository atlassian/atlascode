import './AtlaskitEditor.css';

import type { EditorProps } from '@atlaskit/editor-core';
import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { useUniversalPreset } from '@atlaskit/editor-core/preset-universal';
import { usePreset } from '@atlaskit/editor-core/use-preset';
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
}

const defaultEditorConfiguration: Omit<EditorProps, 'onChange' | 'onSave'> = {
    useStickyToolbar: true,
    allowUndoRedoButtons: true,
    allowTextColor: true,
};

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const { appearance = 'comment', onCancel, onSave, defaultValue = '', onChange, onBlur, onContentChange } = props;

    const universalPreset = useUniversalPreset({
        props: {
            ...defaultEditorConfiguration,
            appearance,
        },
        initialPluginConfiguration: {
            tasksAndDecisionsPlugin: {
                quickInsertActionDescription: 'quickInsertActionDescription',
                taskPlaceholder: 'taskPlaceholder',
            },
            toolbarPlugin: {
                disableSelectionToolbar: false,
            },
            insertBlockPlugin: {
                toolbarShowPlusInsertOnly: true,
            },
        },
    });
    const { preset, editorApi } = usePreset(() => universalPreset);

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
                appearance={appearance}
                useStickyToolbar={defaultEditorConfiguration.useStickyToolbar}
                assistiveLabel="Rich text editor for comments"
                allowUndoRedoButtons={defaultEditorConfiguration.allowUndoRedoButtons}
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
