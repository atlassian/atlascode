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
}

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const { appearance = 'comment', onCancel, onSave, defaultValue = '' } = props;

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
    const { preset, editorApi } = usePreset(() => universalPreset);

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
                        return;
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
        <div>
            <ComposableEditor
                appearance={appearance}
                useStickyToolbar={true}
                assistiveLabel="Rich text editor for comments"
                allowUndoRedoButtons={true}
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
