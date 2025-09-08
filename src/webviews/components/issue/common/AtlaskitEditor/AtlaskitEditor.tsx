// eslint-disable-next-line import/no-extraneous-dependencies
import { defaultSchema } from '@atlaskit/adf-schema/schema-default';
import { EditorContext, WithEditorActions } from '@atlaskit/editor-core';
import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { useUniversalPreset } from '@atlaskit/editor-core/preset-universal';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React, { useRef, useState } from 'react';

interface AtlaskitEditorProps extends Omit<Partial<EditorNextProps>, 'onChange' | 'onSave'> {
    onSave?: (content: string) => void;
    onCancel?: () => void;
    defaultValue?: string;
    onContentChange?: (content: string) => void;
}

// Note: We now send ADF JSON directly to backend for proper rendering

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const { appearance = 'comment', onCancel, onSave, defaultValue = '', onContentChange } = props;
    const [currentContent, setCurrentContent] = useState<string>(defaultValue);
    const markdownTransformerRef = useRef<MarkdownTransformer | null>(null);
    const editorActionsRef = useRef<any>(null);

    // Process defaultValue - convert ADF JSON to a format the editor can understand
    const getEditorDefaultValue = () => {
        if (!defaultValue) {
            return '';
        }

        const trimmed = defaultValue.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const parsed = JSON.parse(trimmed);
            if (parsed.version === 1 && parsed.type === 'doc') {
                // This is ADF JSON - return it as the parsed object for the editor
                return parsed;
            }
        }
        // Return plain text as-is
        return defaultValue;
    };

    // Initialize transformer
    React.useEffect(() => {
        markdownTransformerRef.current = new MarkdownTransformer(defaultSchema);
    }, []);

    const universalPreset = useUniversalPreset({
        props: {
            appearance,
            useStickyToolbar: true,
            allowUndoRedoButtons: true,
            allowTextColor: true,
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
    const { preset } = usePreset(() => universalPreset);

    // Handle editor content changes
    const handleEditorChange = (editorView: any) => {
        // Get ADF document and ensure proper ADF format with version
        const adfDoc = editorView.state.doc.toJSON();
        const properADF = {
            version: adfDoc.version || 1,
            type: adfDoc.type || 'doc',
            content: adfDoc.content || [],
        };

        const adfString = JSON.stringify(properADF);
        setCurrentContent(adfString);
        onContentChange?.(adfString);
    };

    // Handle save button click using EditorActions
    const handleSave = async () => {
        try {
            // Primary approach: Use EditorActions.getValue() to get current ADF
            if (editorActionsRef.current) {
                const adf = await editorActionsRef.current.getValue();

                // Send ADF JSON to backend (not plain text) for proper rendering
                const adfString = JSON.stringify(adf);
                onSave?.(adfString);
                return;
            }

            // Secondary approach: Use stored ADF content
            if (currentContent.startsWith('{')) {
                // Send ADF JSON to backend
                onSave?.(currentContent);
                return;
            }

            // Final fallback: Use current content
            onSave?.(currentContent);
        } catch (error) {
            onSave?.(currentContent);
            console.log(error);
        }
    };

    return (
        <div>
            <EditorContext>
                <WithEditorActions
                    render={(actions: any) => {
                        // Store EditorActions reference for use in handleSave
                        editorActionsRef.current = actions;

                        return (
                            <>
                                <ComposableEditor
                                    appearance={appearance}
                                    useStickyToolbar={true}
                                    assistiveLabel="Rich text editor for comments"
                                    allowUndoRedoButtons={true}
                                    preset={preset}
                                    defaultValue={getEditorDefaultValue()}
                                    contentTransformerProvider={(schema) => {
                                        // Always use MarkdownTransformer for the interface
                                        // We'll handle ADF JSON parsing in the defaultValue prop
                                        return markdownTransformerRef.current || new MarkdownTransformer(schema);
                                    }}
                                    onChange={handleEditorChange}
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
                                                <VSCodeButton
                                                    appearance="primary"
                                                    data-testid="comment-save-button"
                                                    onClick={handleSave}
                                                >
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
                            </>
                        );
                    }}
                />
            </EditorContext>
        </div>
    );
};
export default AtlaskitEditor;
