import AddIcon from '@atlaskit/icon/core/add';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import CrossIcon from '@atlaskit/icon/core/cross';
import StopIcon from '@atlaskit/icon/core/video-stop';
import Tooltip from '@atlaskit/tooltip';
import * as monaco from 'monaco-editor';
import React from 'react';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';

type NonDisabledState = Exclude<State, DisabledState>;

import { AiGenerativeTextSummaryIcon } from '../../rovoDevView';
import { rovoDevTextareaStyles } from '../../rovoDevViewStyles';
import PromptSettingsPopup from '../prompt-settings-popup/PromptSettingsPopup';
import {
    createMonacoPromptEditor,
    createSlashCommandProvider,
    removeMonacoStyles,
    setupAutoResize,
    setupMonacoCommands,
    setupPromptKeyBindings,
} from './utils';

interface PromptInputBoxProps {
    disabled?: boolean;
    hideButtons?: boolean;
    currentState: NonDisabledState;
    isDeepPlanEnabled: boolean;
    onDeepPlanToggled: () => void;
    onSend: (text: string) => boolean;
    onCancel: () => void;
    onAddContext: () => void;
    onCopy: () => void;
    handleMemoryCommand: () => void;
    handleTriggerFeedbackCommand: () => void;
}

const TextAreaMessages: Record<NonDisabledState['state'], string> = {
    ['Initializing']: 'Type in a question',
    ['WaitingForPrompt']: 'Type in a question',
    ['GeneratingResponse']: 'Generating response...',
    ['CancellingResponse']: 'Cancelling the response...',
    ['ExecutingPlan']: 'Executing the code plan...',
    ['ProcessTerminated']: 'Start a new session to chat',
};

const getTextAreaPlaceholder = (isGeneratingResponse: boolean, currentState: NonDisabledState) => {
    if (isGeneratingResponse) {
        return TextAreaMessages['GeneratingResponse'];
    } else {
        return TextAreaMessages[currentState.state];
    }
};

function createEditor() {
    const container = document.getElementById('prompt-editor-container');
    if (!container) {
        return undefined;
    }

    monaco.languages.registerCompletionItemProvider('plaintext', createSlashCommandProvider());

    const editor = createMonacoPromptEditor(container);
    setupAutoResize(editor);
    return editor;
}

export const PromptInputBox: React.FC<PromptInputBoxProps> = ({
    disabled,
    currentState,
    isDeepPlanEnabled,
    onDeepPlanToggled,
    onSend,
    onCancel,
    onAddContext,
    onCopy,
    handleMemoryCommand,
    handleTriggerFeedbackCommand,
}) => {
    const [editor, setEditor] = React.useState<ReturnType<typeof createEditor>>(undefined);

    // create the editor only once - use onSend hook to retry
    React.useEffect(() => setEditor((prev) => prev ?? createEditor()), [onSend]);

    React.useEffect(() => {
        // Remove Monaco's color stylesheet
        removeMonacoStyles();
    }, [editor]);

    const handleSend = React.useCallback(() => {
        const value = editor && editor.getValue();
        if (value && onSend(value)) {
            editor.setValue('');
        }
    }, [editor, onSend]);

    React.useEffect(() => {
        if (editor) {
            setupPromptKeyBindings(editor, handleSend);
        }
    }, [editor, handleSend]);

    React.useEffect(() => {
        if (editor) {
            setupMonacoCommands(editor, onSend, onCopy, handleMemoryCommand, handleTriggerFeedbackCommand);
        }
    }, [editor, onSend, onCopy, handleMemoryCommand, handleTriggerFeedbackCommand]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        const isGeneratingResponse =
            currentState.state === 'GeneratingResponse' ||
            (currentState.state === 'Initializing' && currentState.isPromptPending);

        editor.updateOptions({
            readOnly: disabled,
            placeholder: getTextAreaPlaceholder(isGeneratingResponse, currentState),
        });
    }, [currentState, editor, disabled]);

    const isWaitingForPrompt = React.useMemo(
        () =>
            currentState.state === 'WaitingForPrompt' ||
            (currentState.state === 'Initializing' && !currentState.isPromptPending),
        [currentState],
    );

    const showCancelButton = React.useMemo(
        () =>
            currentState.state === 'GeneratingResponse' ||
            currentState.state === 'CancellingResponse' ||
            (currentState.state === 'Initializing' && currentState.isPromptPending),
        [currentState],
    );

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
                <div style={{ display: 'flex', gap: 4 }}>
                    <Tooltip content="Add context">
                        <button
                            className="prompt-button-secondary"
                            onClick={() => onAddContext()}
                            aria-label="Add context"
                            disabled={disabled}
                        >
                            <AddIcon label="Add context" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Prompt customizations">
                        <PromptSettingsPopup
                            onToggleDeepPlan={onDeepPlanToggled}
                            isDeepPlanEnabled={isDeepPlanEnabled}
                            onClose={() => {}}
                        />
                    </Tooltip>
                    {isDeepPlanEnabled && (
                        <Tooltip content="Disable deep plan">
                            <div
                                className="deep-plan-indicator"
                                title="Deep plan is enabled"
                                onClick={() => onDeepPlanToggled()}
                            >
                                <AiGenerativeTextSummaryIcon />
                                <CrossIcon size="small" label="disable deep plan" />
                            </div>
                        </Tooltip>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {!showCancelButton && (
                        <button
                            className="prompt-button-primary"
                            aria-label="send"
                            onClick={() => handleSend()}
                            disabled={disabled || !isWaitingForPrompt}
                        >
                            <SendIcon label="Send prompt" />
                        </button>
                    )}
                    {showCancelButton && (
                        <button
                            className="prompt-button-secondary"
                            aria-label="stop"
                            onClick={() => onCancel()}
                            disabled={disabled || currentState.state === 'CancellingResponse'}
                        >
                            <StopIcon label="Stop" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};
