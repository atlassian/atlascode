import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { useUniversalPreset } from '@atlaskit/editor-core/preset-universal';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';

interface AtlaskitEditorProps extends Partial<EditorNextProps> {
    onSave?: () => void;
    onCancel?: () => void;
}

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const { appearance = 'comment', onCancel, onSave } = props;
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
    return (
        <div>
            <ComposableEditor
                appearance={appearance}
                useStickyToolbar={true}
                assistiveLabel="assistiveLabel for editor"
                allowUndoRedoButtons={true}
                preset={preset}
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
                            <VSCodeButton appearance="primary" data-testid="comment-save-button" onClick={onSave}>
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
