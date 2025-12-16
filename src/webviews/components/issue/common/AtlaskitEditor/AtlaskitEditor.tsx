import './AtlaskitEditor.css';

import { Transformer } from '@atlaskit/editor-common/types';
import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { createDefaultPreset } from '@atlaskit/editor-core/preset-default';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import { JSONTransformer } from '@atlaskit/editor-json-transformer';
import { insertBlockPlugin } from '@atlaskit/editor-plugin-insert-block';
import { listPlugin } from '@atlaskit/editor-plugin-list';
import { mentionsPlugin } from '@atlaskit/editor-plugin-mentions';
import { tasksAndDecisionsPlugin } from '@atlaskit/editor-plugin-tasks-and-decisions';
import { textColorPlugin } from '@atlaskit/editor-plugin-text-color';
import { toolbarListsIndentationPlugin } from '@atlaskit/editor-plugin-toolbar-lists-indentation';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Schema } from '@atlaskit/editor-prosemirror/model';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';

// Custom transformer that wraps JSONTransformer and handles string conversion
class StringADFTransformer implements Transformer<string> {
    private jsonTransformer: JSONTransformer;

    constructor(schema: Schema) {
        this.jsonTransformer = new JSONTransformer(schema);
    }

    encode(node: any): string {
        const adfDoc = this.jsonTransformer.encode(node);
        return JSON.stringify(adfDoc);
    }

    parse(content: string): any {
        try {
            const adfDoc = JSON.parse(content);
            return this.jsonTransformer.parse(adfDoc);
        } catch (error) {
            console.error('Failed to parse ADF content:', error);
            // Return empty document if parsing fails
            return this.jsonTransformer.parse({
                version: 1,
                type: 'doc',
                content: [],
            });
        }
    }
}

interface AtlaskitEditorProps extends Omit<Partial<EditorNextProps>, 'onChange' | 'onSave'> {
    onSave?: (content: any) => void; // Can be string or ADF object for v3 API
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
                .add(tasksAndDecisionsPlugin)
        );
    }, []);
    // Helper function to get current document content
    const getCurrentContent = React.useCallback(async (): Promise<any | null> => {
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
                        // For v3 API: Return ADF object directly, not stringified
                        resolve(document);
                    },
                    {
                        transformer: editorApi.core.actions.createTransformer((scheme) => new JSONTransformer(scheme)),
                    },
                );
            });
        } catch (error) {
            console.error(error);
            return null;
        }
    }, [editorApi]);

    // Track previous content for change detection
    const previousContentRef = React.useRef<any>('');

    // Polling mechanism to detect content changes (for onChange support)
    React.useEffect(() => {
        if (!editorApi || (!onChange && !onContentChange)) {
            return;
        }

        const checkForChanges = async () => {
            const content = await getCurrentContent();
            const contentString = typeof content === 'object' ? JSON.stringify(content) : content;
            const previousString =
                typeof previousContentRef.current === 'object'
                    ? JSON.stringify(previousContentRef.current)
                    : previousContentRef.current;

            if (content !== null && contentString !== previousString) {
                previousContentRef.current = content;
                onChange?.(contentString);
                onContentChange?.(contentString);
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
                    // For v3 API: Send ADF object directly, not stringified
                    // The v3 API expects an object, not a JSON string
                    onSave?.(document);
                },
                {
                    transformer: editorApi.core.actions.createTransformer((scheme) => new JSONTransformer(scheme)),
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
                contentTransformerProvider={(schema) => {
                    // Transform between ADF JSON string and ProseMirror nodes
                    return new StringADFTransformer(schema);
                }}
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
