import { LoadingButton } from '@atlaskit/button';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import StopIcon from '@atlaskit/icon/core/video-stop';
import Tooltip from '@atlaskit/tooltip';
import * as monaco from 'monaco-editor';
import React from 'react';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';

type NonDisabledState = Exclude<State, DisabledState>;

import { AiGenerativeTextSummaryIcon, CloseIconDeepPlan } from '../../rovoDevView';
import {
    rovoDevDeepPlanStylesSelector,
    rovoDevPromptButtonStyles,
    rovoDevTextareaStyles,
} from '../../rovoDevViewStyles';
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
    promptText: string;
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
    promptText,
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
        // Remove Monaco's color stylesheet
        removeMonacoStyles();
        editor?.setValue(promptText);
    }, [editor, promptText]);

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
                {/* Left-side Add Context Button */}
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
                            ...rovoDevDeepPlanStylesSelector(isDeepPlanEnabled, !isWaitingForPrompt),
                        }}
                        spacing="compact"
                        label="Enable deep plan"
                        iconBefore={<AiGenerativeTextSummaryIcon />}
                        iconAfter={isDeepPlanEnabled ? <CloseIconDeepPlan /> : undefined}
                        isDisabled={disabled || !isWaitingForPrompt}
                        onClick={() => onDeepPlanToggled()}
                    >
                        {isDeepPlanEnabled ? 'Deep plan enabled' : ''}
                    </LoadingButton>
                    {!showCancelButton && (
                        <LoadingButton
                            style={{
                                ...rovoDevPromptButtonStyles,
                                color: 'var(--vscode-button-foreground) !important',
                                backgroundColor: 'var(--vscode-button-background)',
                            }}
                            spacing="compact"
                            label="Send prompt"
                            iconBefore={<SendIcon label="Send prompt" />}
                            isDisabled={disabled || !isWaitingForPrompt}
                            onClick={() => handleSend()}
                        />
                    )}
                    {showCancelButton && (
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
            </div>
        </>
    );
};
