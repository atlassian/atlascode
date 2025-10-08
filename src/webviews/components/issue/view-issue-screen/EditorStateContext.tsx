import React, { createContext, ReactNode, useContext, useState } from 'react';

export type EditorType = 'description' | 'add-comment' | `edit-comment-${string}`;

interface EditorStateContextType {
    activeEditor: EditorType | null;
    openEditor: (editorType: EditorType) => void;
    closeEditor: (editorType: EditorType) => void;
    closeAllEditors: () => void;
    isEditorActive: (editorType: EditorType) => boolean;
}

const EditorStateContext = createContext<EditorStateContextType | undefined>(undefined);

export const useEditorState = () => {
    const context = useContext(EditorStateContext);
    if (!context) {
        throw new Error('useEditorState must be used within an EditorStateProvider');
    }
    return context;
};

interface EditorStateProviderProps {
    children: ReactNode;
    isAtlaskitEditorEnabled?: boolean;
}

export const EditorStateProvider: React.FC<EditorStateProviderProps> = ({
    children,
    isAtlaskitEditorEnabled = true,
}) => {
    const [activeEditor, setActiveEditor] = useState<EditorType | null>(null);

    const openEditor = (editorType: EditorType) => {
        // Only use the new editor state management if the feature flag is enabled
        if (isAtlaskitEditorEnabled) {
            // If there's already an active editor, and it's different from the one being opened,
            // we need to close it first to trigger cleanup
            if (activeEditor && activeEditor !== editorType) {
                // Dispatch a custom event to notify components that an editor is being forcibly closed
                window.dispatchEvent(
                    new CustomEvent('editorForceClosed', {
                        detail: { editorType: activeEditor },
                    }),
                );
            }
        }
        setActiveEditor(editorType);
    };

    const closeEditor = (editorType: EditorType) => {
        if (activeEditor === editorType) {
            setActiveEditor(null);
        }
    };

    const closeAllEditors = () => {
        setActiveEditor(null);
    };

    const isEditorActive = (editorType: EditorType) => {
        return activeEditor === editorType;
    };

    return (
        <EditorStateContext.Provider
            value={{
                activeEditor,
                openEditor,
                closeEditor,
                closeAllEditors,
                isEditorActive,
            }}
        >
            {children}
        </EditorStateContext.Provider>
    );
};
