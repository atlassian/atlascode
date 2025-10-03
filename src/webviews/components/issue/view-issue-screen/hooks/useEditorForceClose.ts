import { useEffect } from 'react';

import { EditorType } from '../EditorStateContext';

/**
 * Custom hook to handle forced editor close events
 * @param editorType - The type of editor to listen for
 * @param onForceClose - Callback function to execute when this editor is forcibly closed
 */
export const useEditorForceClose = (editorType: EditorType, onForceClose: () => void) => {
    useEffect(() => {
        const handleEditorForceClosed = (event: CustomEvent) => {
            if (event.detail.editorType === editorType) {
                onForceClose();
            }
        };

        window.addEventListener('editorForceClosed', handleEditorForceClosed as EventListener);

        return () => {
            window.removeEventListener('editorForceClosed', handleEditorForceClosed as EventListener);
        };
    }, [editorType, onForceClose]);
};
