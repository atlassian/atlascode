import { LoadingButton } from '@atlaskit/button';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import StopIcon from '@atlaskit/icon/core/video-stop';
import React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { AiGenerativeTextSummaryIcon, CloseIconDeepPlan } from '../../rovoDevView';
import {
    rovoDevDeepPlanStylesSelector,
    rovoDevPromptButtonStyles,
    rovoDevTextareaStyles,
} from '../../rovoDevViewStyles';

interface PromptInputBoxProps {
    disabled?: boolean;
    state: State;
    promptText: string;
    onPromptTextChange: (text: string) => void;
    isDeepPlanEnabled: boolean;
    onDeepPlanToggled: () => void;
    onSend: (text: string) => void;
    onCancel: () => void;
    sendButtonDisabled?: boolean;
    onAddContext: () => void;
}

const TextAreaMessages: Record<State, string> = {
    [State.Disabled]: 'Rovo Dev is currently disabled. Please, refer to the error message in chat',
    [State.WaitingForPrompt]: 'Type in a question',
    [State.NoWorkspaceOpen]: 'Please, open a folder to start a chat session with Rovo Dev',
    [State.GeneratingResponse]: 'Generating response...',
    [State.CancellingResponse]: 'Cancelling the response...',
    [State.ExecutingPlan]: 'Executing the code plan...',
};

const getTextAreaPlaceholder = (state: State) => {
    return TextAreaMessages[state];
};

export const PromptInputBox: React.FC<PromptInputBoxProps> = ({
    disabled,
    state,
    promptText,
    onPromptTextChange,
    isDeepPlanEnabled,
    onDeepPlanToggled,
    onSend,
    onCancel,
    sendButtonDisabled = false,
    onAddContext,
}) => {
    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey && state === State.WaitingForPrompt) {
                event.preventDefault();
                onSend(promptText);
            }
        },
        [state, onSend, promptText],
    );

    return (
        <>
            <textarea
                style={{ ...{ fieldSizing: 'content' }, ...rovoDevTextareaStyles }}
                placeholder={getTextAreaPlaceholder(state)}
                onChange={(element) => onPromptTextChange(element.target.value)}
                onKeyDown={handleKeyDown}
                value={promptText}
                disabled={disabled}
            />
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
                {!disabled && (
                    <>
                        <LoadingButton
                            style={{
                                ...rovoDevPromptButtonStyles,
                            }}
                            spacing="compact"
                            label="Add context"
                            iconBefore={<i className="codicon codicon-add" />}
                            onClick={() => onAddContext()}
                        />
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
                                isDisabled={state !== State.WaitingForPrompt}
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
                                    isDisabled={sendButtonDisabled}
                                    onClick={() => onSend(promptText)}
                                />
                            )}
                            {state !== State.WaitingForPrompt && (
                                <LoadingButton
                                    style={rovoDevPromptButtonStyles}
                                    spacing="compact"
                                    label="Stop"
                                    iconBefore={<StopIcon label="Stop" />}
                                    isDisabled={state === State.CancellingResponse}
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
