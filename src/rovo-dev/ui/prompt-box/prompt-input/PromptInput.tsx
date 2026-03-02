import AiGenerativeTextSummaryIcon from '@atlaskit/icon/core/ai-generative-text-summary';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import CrossIcon from '@atlaskit/icon/core/cross';
import LockUnlockedIcon from '@atlaskit/icon/core/lock-unlocked';
import VideoStopOverlayIcon from '@atlaskit/icon/core/video-stop-overlay';
import TelescopeIcon from '@atlaskit/icon-lab/core/telescope';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import * as monaco from 'monaco-editor';
import React from 'react';
import { RovodevStaticConfig } from 'src/rovo-dev/api/rovodevStaticConfig';
import { AgentMode, RovoDevModeInfo } from 'src/rovo-dev/client';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';
import { RovoDevAgentModel } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

import { rovoDevTextareaStyles } from '../../rovoDevViewStyles';
import { onKeyDownHandler, SavedPrompt } from '../../utils';
import { AgentModelSelector } from '../agent-model-selection/AgentModelSelector';
import PromptContextPopup from '../prompt-context-popup/PromptContextPopup';
import { getAgentModeIcon } from '../prompt-settings-popup/AgentModeSection';
import PromptSettingsPopup from '../prompt-settings-popup/PromptSettingsPopup';
import {
    createMonacoPromptEditor,
    createPromptCompletionProvider,
    createSlashCommandProvider,
    removeMonacoStyles,
    setupAutoResize,
    setupMonacoCommands,
    setupPromptKeyBindings,
    SLASH_COMMANDS,
} from './utils';

type NonDisabledState = Exclude<State, DisabledState>;

interface PromptInputBoxProps {
    disableSendButton?: boolean;
    readOnly?: boolean;
    hideButtons?: boolean;
    currentState: NonDisabledState;
    isDeepPlanEnabled: boolean;
    isYoloModeEnabled: boolean;
    isFullContextEnabled: boolean;
    availableAgentModes: RovoDevModeInfo[];
    currentAgentMode: AgentMode | null;
    availableAgentModels: RovoDevAgentModel[];
    currentAgentModel: RovoDevAgentModel | undefined;
    onAgentModeChange: (mode: AgentMode) => void;
    onAgentModelChange: (model: RovoDevAgentModel) => void;
    onDeepPlanToggled?: () => void;
    onYoloModeToggled?: () => void;
    onFullContextToggled?: () => void;
    onSend: (text: string) => boolean;
    onCancel: () => void;
    onAddContext: () => void;
    onCopy: () => void;
    handleMemoryCommand: () => void;
    handleTriggerFeedbackCommand: () => void;
    handleSessionCommand?: () => void;
    promptText?: string;
    onPromptTextSet?: () => void;
    handleFetchSavedPrompts?: () => Promise<SavedPrompt[]>;
    canFetchSavedPrompts?: boolean;
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

let monacoInitialized = false;

function initMonaco(isBBY: boolean) {
    if (!monacoInitialized) {
        let commands = SLASH_COMMANDS;
        if (isBBY) {
            commands = commands.filter((command) => command.label !== '/yolo' && command.label !== '/sessions');
        }

        monaco.languages.registerCompletionItemProvider('plaintext', createSlashCommandProvider(commands));

        monacoInitialized = true;
    }
}

function createEditor(setIsEmpty: (isEmpty: boolean) => void) {
    const container = document.getElementById('prompt-editor-container');
    if (!container) {
        return undefined;
    }

    initMonaco(RovodevStaticConfig.isBBY);

    const editor = createMonacoPromptEditor(container);

    editor.onDidChangeModelContent(() => {
        if (editor.getValue().trim().length === 0) {
            setIsEmpty(true);
        } else {
            setIsEmpty(false);
        }
    });

    setupAutoResize(editor);
    return editor;
}

export const PromptInputBox: React.FC<PromptInputBoxProps> = ({
    disableSendButton,
    readOnly,
    currentState,
    isDeepPlanEnabled,
    isYoloModeEnabled,
    isFullContextEnabled,
    availableAgentModes,
    currentAgentMode,
    availableAgentModels,
    currentAgentModel,
    onAgentModeChange,
    onAgentModelChange,
    onDeepPlanToggled,
    onYoloModeToggled,
    onFullContextToggled,
    onSend,
    onCancel,
    onAddContext,
    onCopy,
    handleMemoryCommand,
    handleTriggerFeedbackCommand,
    handleSessionCommand,
    promptText,
    onPromptTextSet,
    handleFetchSavedPrompts,
    canFetchSavedPrompts = false,
}) => {
    const [editor, setEditor] = React.useState<ReturnType<typeof createEditor>>(undefined);
    const [isEmpty, setIsEmpty] = React.useState(true);
    const promptCompletionProviderRef = React.useRef<monaco.IDisposable | null>(null);
    // create the editor only once - use onAddContext hook to retry
    React.useEffect(() => setEditor((prev) => prev ?? createEditor(setIsEmpty)), [onAddContext]);

    React.useEffect(() => {
        if (editor && handleFetchSavedPrompts) {
            if (promptCompletionProviderRef.current) {
                promptCompletionProviderRef.current.dispose();
            }
            promptCompletionProviderRef.current = monaco.languages.registerCompletionItemProvider(
                'plaintext',
                createPromptCompletionProvider(handleFetchSavedPrompts, canFetchSavedPrompts),
            );
        }

        return () => {
            if (promptCompletionProviderRef.current) {
                promptCompletionProviderRef.current.dispose();
                promptCompletionProviderRef.current = null;
            }
        };
    }, [canFetchSavedPrompts, editor, handleFetchSavedPrompts]);

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
            setupMonacoCommands(
                editor,
                onSend,
                onCopy,
                handleMemoryCommand,
                handleTriggerFeedbackCommand,
                handleSessionCommand,
                onYoloModeToggled,
            );
        }
    }, [
        editor,
        onSend,
        onCopy,
        handleMemoryCommand,
        handleTriggerFeedbackCommand,
        onYoloModeToggled,
        handleSessionCommand,
    ]);

    // Handle setting prompt text from external source
    React.useEffect(() => {
        if (editor && promptText !== undefined) {
            editor.setValue(promptText);
            setIsEmpty(false); // Update isEmpty state since we set text
            onPromptTextSet?.(); // Notify parent that text has been set
        }
    }, [editor, promptText, onPromptTextSet]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        const isGeneratingResponse =
            currentState.state === 'GeneratingResponse' ||
            (currentState.state === 'Initializing' && currentState.isPromptPending);

        editor.updateOptions({
            readOnly: readOnly,
            placeholder: getTextAreaPlaceholder(isGeneratingResponse, currentState),
        });
    }, [currentState, editor, readOnly]);

    // Focus the editor when it becomes visible in the viewport - helps with opening Rovo Dev panel already focused
    React.useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (
                    entry.isIntersecting &&
                    !!editor &&
                    entry.target === document.getElementById('prompt-editor-container')
                ) {
                    const lineNumber = editor.getModel()!.getLineCount();
                    const column = editor.getModel()!.getLineLength(lineNumber) + 1;
                    editor.focus();
                    editor.setPosition({ lineNumber, column }); // move cursor to end
                }
            });
        });

        io.observe(document.getElementById('prompt-editor-container')!);

        return () => io.disconnect();
    }, [editor]);

    const handleSelectSavedPrompt = React.useCallback(
        (prompt: SavedPrompt) => {
            if (editor) {
                const text = `!${prompt.name} `;
                const position = editor.getPosition();
                editor.executeEdits('', [
                    {
                        range: new monaco.Range(
                            position!.lineNumber,
                            position!.column,
                            position!.lineNumber,
                            position!.column,
                        ),
                        text: text,
                        forceMoveMarkers: true,
                    },
                ]);
                editor.focus();
            }
        },
        [editor],
    );

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
            currentState.state === 'ExecutingPlan' ||
            (currentState.state === 'Initializing' && currentState.isPromptPending),
        [currentState],
    );

    const disableAgentModelSelector = React.useMemo(() => currentState.state !== 'WaitingForPrompt', [currentState]);

    return (
        <>
            <div id="prompt-editor-container" style={{ ...{ fieldSizing: 'content' }, ...rovoDevTextareaStyles }} />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 4,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', alignContent: 'center', gap: 4 }}>
                    <PromptContextPopup
                        fetchSavedPrompts={handleFetchSavedPrompts}
                        canFetchSavedPrompts={canFetchSavedPrompts}
                        onSelectedSavedPrompt={handleSelectSavedPrompt}
                        onAddRepositoryFile={onAddContext}
                    />
                    <Tooltip content="Preferences">
                        <PromptSettingsPopup
                            onDeepPlanToggled={onDeepPlanToggled}
                            onYoloModeToggled={onYoloModeToggled}
                            onFullContextToggled={onFullContextToggled}
                            isDeepPlanEnabled={isDeepPlanEnabled}
                            isYoloModeEnabled={isYoloModeEnabled}
                            isFullContextEnabled={isFullContextEnabled}
                            availableAgentModes={availableAgentModes}
                            currentAgentMode={currentAgentMode}
                            onAgentModeChange={onAgentModeChange}
                            onClose={() => {}}
                        />
                    </Tooltip>
                    {isDeepPlanEnabled && onDeepPlanToggled && (
                        <Tooltip content="Disable deep plan">
                            <div
                                className="mode-indicator"
                                onClick={() => onDeepPlanToggled()}
                                onKeyDown={onKeyDownHandler(onDeepPlanToggled)}
                                tabIndex={0}
                                role="button"
                                aria-label="Disable deep plan"
                            >
                                <AiGenerativeTextSummaryIcon label="deep plan icon" />
                                <CrossIcon size="small" label="disable deep plan" />
                            </div>
                        </Tooltip>
                    )}
                    {isFullContextEnabled && onFullContextToggled && (
                        <Tooltip content="Disable Full-Context mode">
                            <div
                                className="mode-indicator"
                                onClick={() => onFullContextToggled()}
                                onKeyDown={onKeyDownHandler(onFullContextToggled)}
                                tabIndex={0}
                                role="button"
                                aria-label="Disable Full-Context mode"
                            >
                                <TelescopeIcon label="full-context mode icon" />
                                <CrossIcon size="small" label="disable full-context mode" />
                            </div>
                        </Tooltip>
                    )}{' '}
                    {isYoloModeEnabled && onYoloModeToggled && (
                        <Tooltip content="Disable YOLO mode">
                            <div
                                className="mode-indicator"
                                onClick={() => onYoloModeToggled()}
                                onKeyDown={onKeyDownHandler(onYoloModeToggled)}
                                tabIndex={0}
                                role="button"
                                aria-label="Disable YOLO mode"
                            >
                                <LockUnlockedIcon label="yolo mode icon" />
                                <CrossIcon size="small" label="disable yolo mode" />
                            </div>
                        </Tooltip>
                    )}{' '}
                    {currentAgentMode && currentAgentMode !== 'default' && (
                        <Tooltip content={`${currentAgentMode} mode`}>
                            <div
                                className="mode-indicator"
                                onClick={() => onAgentModeChange('default')}
                                onKeyDown={onKeyDownHandler(() => onAgentModeChange('default'))}
                                tabIndex={0}
                                role="button"
                                aria-label={`${currentAgentMode} mode`}
                            >
                                {getAgentModeIcon(currentAgentMode)}
                                <CrossIcon size="small" label={`${currentAgentMode} mode`} />
                            </div>
                        </Tooltip>
                    )}
                </div>
                <div>
                    <AgentModelSelector
                        availableModels={availableAgentModels}
                        currentModel={currentAgentModel}
                        onModelChange={onAgentModelChange}
                        isDisabled={disableAgentModelSelector}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                    {showCancelButton ? (
                        <Tooltip content="Stop generating" position="top">
                            <button
                                className="prompt-button-secondary"
                                id="bordered-button"
                                aria-label="stop"
                                onClick={() => onCancel()}
                                disabled={disableSendButton || currentState.state === 'CancellingResponse'}
                            >
                                <VideoStopOverlayIcon color={token('color.icon.danger')} label="Stop" />
                            </button>
                        </Tooltip>
                    ) : (
                        <button
                            className="prompt-button-primary"
                            aria-label="send"
                            onClick={() => handleSend()}
                            disabled={disableSendButton || !isWaitingForPrompt || isEmpty}
                        >
                            <SendIcon label="Send prompt" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};
