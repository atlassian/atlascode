import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { useUniversalPreset } from '@atlaskit/editor-core/preset-universal';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import React from 'react';

const AtlaskitEditor: React.FC<Partial<EditorNextProps>> = (props: EditorNextProps) => {
    const { appearance = 'comment', onCancel } = props;
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
        <ComposableEditor
            appearance={appearance}
            useStickyToolbar={true}
            assistiveLabel="assistiveLabel for editor"
            allowUndoRedoButtons={true}
            preset={preset}
            onCancel={onCancel}
        />
    );
};
export default AtlaskitEditor;
