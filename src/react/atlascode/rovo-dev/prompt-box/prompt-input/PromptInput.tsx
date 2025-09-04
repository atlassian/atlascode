import { LoadingButton } from '@atlaskit/button';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import StopIcon from '@atlaskit/icon/core/video-stop';
import Tooltip from '@atlaskit/tooltip';
import * as monaco from 'monaco-editor';
import React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { AiGenerativeTextSummaryIcon, CloseIconDeepPlan } from '../../rovoDevView';
import {
    rovoDevDeepPlanStylesSelector,
    rovoDevPromptButtonStyles,
    rovoDevTextareaStyles,
} from '../../rovoDevViewStyles';
import { createMonacoPromptEditor, createSlashCommandProvider, removeMonacoStyles } from './utils';

interface PromptInputBoxProps {
    disabled?: boolean;
    hideButtons?: boolean;
    state: State;
    promptText: string;
    isDeepPlanEnabled: boolean;
    onDeepPlanToggled: () => void;
    onSend: (text: string) => void;
    onCancel: () => void;
    sendButtonDisabled?: boolean;
    onAddContext: () => void;
    onCopy: () => void;
    handleMemoryCommand: () => void;
    handleTriggerFeedbackCommand: () => void;
}

const TextAreaMessages: Record<State, string> = {
    [State.Disabled]: 'Rovo Dev is currently disabled. Please, refer to the error message in chat',
    [State.WaitingForPrompt]: 'Type in a question',
    [State.NoWorkspaceOpen]: 'Please, open a folder to start a chat session with Rovo Dev',
    [State.GeneratingResponse]: 'Generating response...',
    [State.CancellingResponse]: 'Cancelling the response...',
    [State.ExecutingPlan]: 'Executing the code plan...',
    [State.ProcessTerminated]: 'Start a new session to chat',
};

const getTextAreaPlaceholder = (state: State) => {
    return TextAreaMessages[state];
};

export const PromptInputBox: React.FC<PromptInputBoxProps> = ({
    disabled,
    hideButtons,
    state,
    promptText,
    isDeepPlanEnabled,
    onDeepPlanToggled,
    onSend,
    onCancel,
    sendButtonDisabled = false,
    onAddContext,
    onCopy,
    handleMemoryCommand,
    handleTriggerFeedbackCommand,
}) => {
    const [editor, setEditor] = React.useState<monaco.editor.IStandaloneCodeEditor | null>(null);

    const setupCommands = (
        editor: monaco.editor.IStandaloneCodeEditor,
        onSend: (text: string) => void,
        onCopy: () => void,
        handleMemoryCommand: () => void,
        handleTriggerFeedbackCommand: () => void,
    ) => {
        monaco.editor.registerCommand('rovo-dev.clearChat', () => {
            editor.setValue('');

            onSend('/clear');
        });

        monaco.editor.registerCommand('rovo-dev.pruneChat', () => {
            editor.setValue('');

            onSend(`/prune`);
        });

        monaco.editor.registerCommand('rovo-dev.copyResponse', () => {
            editor.setValue('');
            onCopy();
        });

        monaco.editor.registerCommand('rovo-dev.agentMemory', () => {
            handleMemoryCommand();

            editor.setValue('');
        });

        monaco.editor.registerCommand('rovo-dev.triggerFeedback', () => {
            handleTriggerFeedbackCommand();

            editor.setValue('');
        });
    };

    const setupPromptKeyBindings = (editor: monaco.editor.IStandaloneCodeEditor, onSend: (text: string) => void) => {
        editor.addCommand(
            monaco.KeyCode.Enter,
            () => {
                const value = editor.getValue();
                if (value.trim()) {
                    onSend(value);
                    editor.setValue('');
                }
            },
            '!suggestWidgetVisible',
        ); // Only trigger if suggestions are not visible

        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
            editor.trigger('keyboard', 'type', { text: '\n' });
        });
    };

    // Auto-resize functionality
    const setupAutoResize = (editor: monaco.editor.IStandaloneCodeEditor, maxHeight = 200) => {
        const updateHeight = () => {
            const contentHeight = Math.min(maxHeight, editor.getContentHeight());
            const container = editor.getContainerDomNode();
            container.style.height = `${contentHeight}px`;
            editor.layout();
        };

        editor.onDidContentSizeChange(updateHeight);
        updateHeight();
    };

    React.useEffect(() => {
        setEditor((prev) => {
            if (prev) {
                return prev;
            }

            const container = document.getElementById('prompt-editor-container');
            if (!container) {
                return null;
            }

            monaco.languages.registerCompletionItemProvider('plaintext', createSlashCommandProvider());

            const editor = createMonacoPromptEditor(container);
            setupPromptKeyBindings(editor, onSend);
            setupAutoResize(editor);
            setupCommands(editor, onSend, onCopy, handleMemoryCommand, handleTriggerFeedbackCommand);

            return editor;
        });
    }, [handleMemoryCommand, handleTriggerFeedbackCommand, onCopy, onSend, setEditor]);

    React.useEffect(() => {
        // Remove Monaco's color stylesheet
        removeMonacoStyles();
        editor?.setValue(promptText);
    }, [editor, promptText]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        editor.updateOptions({
            readOnly: disabled,
            placeholder: getTextAreaPlaceholder(state),
        });
    }, [state, editor, disabled]);

    const handleSend = () => {
        if (editor) {
            const text = editor.getValue();
            onSend(text);
            editor.setValue(''); // Clear the editor after sending
        }
    };

    return (
        <>
            <div id="prompt-editor-container" style={{ ...{ fieldSizing: 'content' }, ...rovoDevTextareaStyles }} />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                }}
            >
                {/* Left-side Add Context Button */}
                {!hideButtons && (
                    <>
                        <Tooltip content="Add context">
                            <LoadingButton
                                style={{
                                    ...rovoDevPromptButtonStyles,
                                }}
                                spacing="compact"
                                label="Add context"
                                iconBefore={<i className="codicon codicon-add" />}
                                isDisabled={disabled}
                                onClick={() => onAddContext()}
                            />
                        </Tooltip>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <LoadingButton
                                style={{
                                    ...rovoDevDeepPlanStylesSelector(
                                        isDeepPlanEnabled,
                                        state !== State.WaitingForPrompt,
                                    ),
                                }}
                                spacing="compact"
                                label="Enable deep plan"
                                iconBefore={<AiGenerativeTextSummaryIcon />}
                                iconAfter={isDeepPlanEnabled ? <CloseIconDeepPlan /> : undefined}
                                isDisabled={disabled || state !== State.WaitingForPrompt}
                                onClick={() => onDeepPlanToggled()}
                            >
                                {isDeepPlanEnabled ? 'Deep plan enabled' : ''}
                            </LoadingButton>
                            {state === State.WaitingForPrompt && (
                                <LoadingButton
                                    style={{
                                        ...rovoDevPromptButtonStyles,
                                        color: 'var(--vscode-button-foreground) !important',
                                        backgroundColor: 'var(--vscode-button-background)',
                                    }}
                                    spacing="compact"
                                    label="Send prompt"
                                    iconBefore={<SendIcon label="Send prompt" />}
                                    isDisabled={disabled || sendButtonDisabled}
                                    onClick={() => handleSend()}
                                />
                            )}
                            {state !== State.WaitingForPrompt && (
                                <LoadingButton
                                    style={rovoDevPromptButtonStyles}
                                    spacing="compact"
                                    label="Stop"
                                    iconBefore={<StopIcon label="Stop" />}
                                    isDisabled={disabled || state === State.CancellingResponse}
                                    onClick={() => onCancel()}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};
