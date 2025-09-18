import AddIcon from '@atlaskit/icon/core/add';
import AiGenerativeTextSummaryIcon from '@atlaskit/icon/core/ai-generative-text-summary';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import CrossIcon from '@atlaskit/icon/core/cross';
import VideoStopOverlayIcon from '@atlaskit/icon/core/video-stop-overlay';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import * as monaco from 'monaco-editor';
import React from 'react';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';
type NonDisabledState = Exclude<State, DisabledState>;

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
    ['Initializing']: 'Write a prompt or use / for actions',
    ['WaitingForPrompt']: 'Write a prompt or use / for actions',
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

function createEditor(setIsEmpty?: (isEmpty: boolean) => void) {
    const container = document.getElementById('prompt-editor-container');
    if (!container) {
        return undefined;
    }

    monaco.languages.registerCompletionItemProvider('plaintext', createSlashCommandProvider());

    const editor = createMonacoPromptEditor(container);
    editor.onDidChangeModelContent(() => {
        if (editor.getValue().trim().length === 0) {
            setIsEmpty?.(true);
        } else {
            setIsEmpty?.(false);
        }
    });
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
    const [isEmpty, setIsEmpty] = React.useState(true);

    // create the editor only once - use onSend hook to retry
    React.useEffect(() => setEditor((prev) => prev ?? createEditor(setIsEmpty)), [onSend]);

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
                <div style={{ display: 'flex', flexDirection: 'row', alignContent: 'center', gap: 4 }}>
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
                    <Tooltip content="Preferences">
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
                                <AiGenerativeTextSummaryIcon label="deep plan icon" />
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
                            disabled={disabled || !isWaitingForPrompt || isEmpty}
                        >
                            <SendIcon label="Send prompt" />
                        </button>
                    )}
                    {showCancelButton && (
                        <Tooltip content="Stop generating" position="top">
                            <button
                                className="prompt-button-secondary"
                                id="bordered-button"
                                aria-label="stop"
                                onClick={() => onCancel()}
                                disabled={disabled || currentState.state === 'CancellingResponse'}
                            >
                                <VideoStopOverlayIcon color={token('color.icon.danger')} label="Stop" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>
        </>
    );
};
