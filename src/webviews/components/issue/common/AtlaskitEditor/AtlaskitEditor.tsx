import './AtlaskitEditor.css';

import type { EditorProps } from '@atlaskit/editor-core';
import { ComposableEditor, EditorNextProps } from '@atlaskit/editor-core/composable-editor';
import { useUniversalPreset } from '@atlaskit/editor-core/preset-universal';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import { mediaPlugin } from '@atlaskit/editor-plugin-media';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { ADFEncoder } from '@atlaskit/renderer';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

interface AtlaskitEditorProps extends Omit<Partial<EditorNextProps>, 'onChange' | 'onSave'> {
    onSave?: (content: any) => void;
    onCancel?: () => void;
    defaultValue?: any;
    onContentChange?: (content: any) => void;
    onChange?: (content: any) => void;
    onBlur?: (content: any) => void;
    // Controls what format onSave returns
    outputFormat?: 'adf' | 'wiki';
    // Media plugin props
    siteDetails?: DetailedSiteInfo;
    issueKey?: string;
    onAttachmentUpload?: (files: File[]) => Promise<any[]>;
    // Function to obtain Media Services auth (token/baseUrl/clientId)
    getMediaAuth?: () => Promise<{ token: string; clientId?: string; baseUrl?: string; collection?: string }>;
}

const defaultEditorConfiguration: Omit<EditorProps, 'onChange' | 'onSave'> = {
    useStickyToolbar: true,
    allowUndoRedoButtons: true,
    allowTextColor: true,
};

const AtlaskitEditor: React.FC<AtlaskitEditorProps> = (props: AtlaskitEditorProps) => {
    const {
        appearance = 'comment',
        onCancel,
        onSave,
        defaultValue = '',
        onChange,
        onBlur,
        onContentChange,
        outputFormat = 'adf',
        getMediaAuth,
    } = props;

    // Prepare initial ADF document from incoming value (ADF object, ADF JSON, or Wiki Markup string)
    const initialAdfDoc = React.useMemo(() => {
        try {
            if (defaultValue && typeof defaultValue === 'object' && defaultValue.type === 'doc') {
                return defaultValue;
            }
            if (typeof defaultValue === 'string') {
                const parsed = JSON.parse(defaultValue);
                if (parsed && parsed.type === 'doc') {
                    return parsed;
                }
            }
            const wiki = typeof defaultValue === 'string' ? defaultValue : '';
            const encoder = new ADFEncoder((schema) => new WikiMarkupTransformer(schema));
            return encoder.encode(wiki);
        } catch (e) {
            console.error('Failed to prepare initial ADF doc; using empty doc', e);
            return { version: 1, type: 'doc', content: [] } as any;
        }
    }, [defaultValue]);

    // Media plugin options with provider that calls getMediaAuth (when supplied)
    const mediaOptions = React.useMemo(() => {
        const base: any = {
            allowMediaSingle: true,
            allowMediaGroup: true,
            allowResizing: true,
            allowAnnotation: true,
            allowLinking: true,
            allowResizingInTables: true,
            allowMediaInline: true,
            allowCaptions: true,
            allowAltTextOnImages: true,
            featureFlags: { mediaInline: true },
        };
        if (!getMediaAuth) {
            return base;
        }
        const provider = Promise.resolve({
            uploadMediaClientConfig: {
                authProvider: async () => {
                    const auth = await getMediaAuth();
                    return {
                        token: auth.token,
                        clientId: auth.clientId,
                        baseUrl: auth.baseUrl ?? 'https://media-cdn.atlassian.com',
                    } as any;
                },
            },
            viewMediaClientConfig: {
                authProvider: async () => {
                    const auth = await getMediaAuth();
                    return {
                        token: auth.token,
                        clientId: auth.clientId,
                        baseUrl: auth.baseUrl ?? 'https://media-cdn.atlassian.com',
                    } as any;
                },
            },
            uploadParams: { collection: (props.issueKey as any) ?? 'atlascode' },
        });
        return { ...base, provider };
    }, [getMediaAuth, props.issueKey]);

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

    const { preset, editorApi } = usePreset(() => universalPreset.add([mediaPlugin, mediaOptions]));

    // Helper to get current ADF document content
    const getCurrentContent = React.useCallback(async (): Promise<any | null> => {
        try {
            if (!editorApi) {
                return null;
            }

            return new Promise((resolve) => {
                editorApi.core.actions.requestDocument((document) => {
                    if (!document) {
                        resolve(null);
                        return;
                    }
                    resolve(document);
                });
            });
        } catch (error) {
            console.error('Error getting document content:', error);
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
            const serialized = content === null ? '' : JSON.stringify(content);
            if (content !== null && serialized !== previousContentRef.current) {
                previousContentRef.current = serialized;
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

    // Handle save button click using EditorActions (return ADF by default, or wiki when requested)
    const handleSave = async () => {
        try {
            if (!editorApi) {
                throw new Error('editorApi is not available');
            }

            if (outputFormat === 'wiki') {
                editorApi.core.actions.requestDocument(
                    (document) => {
                        if (!document) {
                            throw new Error('document is not available');
                        }
                        onSave?.(document);
                    },
                    {
                        transformer: editorApi.core.actions.createTransformer(
                            (scheme) => new WikiMarkupTransformer(scheme),
                        ),
                    },
                );
            } else {
                editorApi.core.actions.requestDocument((document) => {
                    if (!document) {
                        throw new Error('document is not available');
                    }
                    onSave?.(document);
                });
            }
        } catch (error) {
            console.error('Error saving document:', error);
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
                defaultValue={initialAdfDoc}
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
