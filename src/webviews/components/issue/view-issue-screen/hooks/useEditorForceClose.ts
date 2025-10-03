import { useEffect } from 'react';

import { EditorType } from '../EditorStateContext';

/**
 * Custom hook to handle forced editor close events
 * @param editorType - The type of editor to listen for
 * @param onForceClose - Callback function to execute when this editor is forcibly closed
 * @param isAtlaskitEditorEnabled - Feature flag to enable/disable the new editor state management
 */
export const useEditorForceClose = (
    editorType: EditorType,
    onForceClose: () => void,
    isAtlaskitEditorEnabled: boolean = true,
) => {
    useEffect(() => {
        // Only set up the event listener if the feature flag is enabled
        if (!isAtlaskitEditorEnabled) {
            return;
        }

        const handleEditorForceClosed = (event: CustomEvent) => {
            if (event.detail.editorType === editorType) {
                onForceClose();
            }
        };

        window.addEventListener('editorForceClosed', handleEditorForceClosed as EventListener);

        return () => {
            window.removeEventListener('editorForceClosed', handleEditorForceClosed as EventListener);
        };
    }, [editorType, onForceClose, isAtlaskitEditorEnabled]);
};
