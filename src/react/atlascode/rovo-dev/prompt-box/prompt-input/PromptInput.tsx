import { LoadingButton } from '@atlaskit/button';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import StopIcon from '@atlaskit/icon/core/video-stop';
import Tooltip from '@atlaskit/tooltip';
import * as monaco from 'monaco-editor';
import React from 'react';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';

type NonDisabledState = Exclude<State, DisabledState>;

import { useAppDispatch, useAppSelector } from 'src/react/store/hooks';
import { actions } from 'src/react/store/states/rovo-dev';

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
    onSend: (text: string) => void;
    onCancel: () => void;
    onAddContext: () => void;
    onCopy: () => void;
    handleMemoryCommand: () => void;
}

const TextAreaMessages: Record<NonDisabledState['state'], string> = {
    ['Initializing']: 'Type in a question',
    ['WaitingForPrompt']: 'Type in a question',
    ['GeneratingResponse']: 'Generating response...',
    ['CancellingResponse']: 'Cancelling the response...',
    ['ExecutingPlan']: 'Executing the code plan...',
    ['ProcessTerminated']: 'Start a new session to chat',
};

const getTextAreaPlaceholder = (currentState: NonDisabledState) => {
    if (currentState.state === 'Initializing' && currentState.isPromptPending) {
        return TextAreaMessages['GeneratingResponse'];
    } else {
        return TextAreaMessages[currentState.state];
    }
};

export const PromptInputBox: React.FC<PromptInputBoxProps> = ({
    disabled,
    hideButtons,
    onSend,
    onCancel,
    onAddContext,
    onCopy,
    handleMemoryCommand,
}) => {
    const [editor, setEditor] = React.useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    const currentState = useAppSelector((state) => state.rovoDevStates.currentState);
    const isDeepPlanEnabled = useAppSelector((state) => state.promptContext.isDeepPlanToggled);

    const dispatch = useAppDispatch();

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
            setupCommands(editor, onSend, onCopy, handleMemoryCommand, () => {
                dispatch(actions.setIsFeedbackFormVisible(true));
            });

            return editor;
        });
    }, [dispatch, handleMemoryCommand, onCopy, onSend, setEditor]);

    React.useEffect(() => {
        // Remove Monaco's color stylesheet
        removeMonacoStyles();
    }, [editor]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        editor.updateOptions({
            readOnly: disabled,
            placeholder: currentState.state !== 'Disabled' ? getTextAreaPlaceholder(currentState) : '',
        });
    }, [currentState, editor, disabled]);

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
                                        currentState.state !== 'WaitingForPrompt',
                                    ),
                                }}
                                spacing="compact"
                                label="Enable deep plan"
                                iconBefore={<AiGenerativeTextSummaryIcon />}
                                iconAfter={isDeepPlanEnabled ? <CloseIconDeepPlan /> : undefined}
                                isDisabled={disabled || currentState.state !== 'WaitingForPrompt'}
                                onClick={() => dispatch(actions.setIsDeepPlanToggled(!isDeepPlanEnabled))}
                            >
                                {isDeepPlanEnabled ? 'Deep plan enabled' : ''}
                            </LoadingButton>
                            {currentState.state === 'WaitingForPrompt' && (
                                <LoadingButton
                                    style={{
                                        ...rovoDevPromptButtonStyles,
                                        color: 'var(--vscode-button-foreground) !important',
                                        backgroundColor: 'var(--vscode-button-background)',
                                    }}
                                    spacing="compact"
                                    label="Send prompt"
                                    iconBefore={<SendIcon label="Send prompt" />}
                                    isDisabled={disabled || currentState.state !== 'WaitingForPrompt'}
                                    onClick={() => handleSend()}
                                />
                            )}
                            {currentState.state !== 'WaitingForPrompt' && (
                                <LoadingButton
                                    style={rovoDevPromptButtonStyles}
                                    spacing="compact"
                                    label="Stop"
                                    iconBefore={<StopIcon label="Stop" />}
                                    isDisabled={disabled || currentState.state === 'CancellingResponse'}
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
