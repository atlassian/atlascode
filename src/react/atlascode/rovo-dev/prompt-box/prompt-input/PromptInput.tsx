import { LoadingButton } from '@atlaskit/button';
import SendIcon from '@atlaskit/icon/core/arrow-up';
import StopIcon from '@atlaskit/icon/core/video-stop';
import React from 'react';

import { AiGenerativeTextSummaryIcon, CloseIconDeepPlan, State } from '../../rovoDevView';
import {
    rovoDevDeepPlanStylesSelector,
    rovoDevPromptButtonStyles,
    rovoDevTextareaStyles,
} from '../../rovoDevViewStyles';

interface PromptInputBoxProps {
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
export const PromptInputBox: React.FC<PromptInputBoxProps> = ({
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
    const TextAreaMessages: Record<State, string> = {
        [State.WaitingForPrompt]: 'Type in a question',
        [State.GeneratingResponse]: 'Generating response...',
        [State.CancellingResponse]: 'Cancelling the response...',
        [State.ExecutingPlan]: 'Executing the code plan...',
    };

    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey && state === State.WaitingForPrompt) {
                event.preventDefault();
                onSend(promptText);
            }
        },
        [state, onSend, promptText],
    );
    const getTextAreaPlaceholder = () => {
        return TextAreaMessages[state] || 'Type in a question';
    };

    return (
        <>
            <textarea
                style={{ ...{ fieldSizing: 'content' }, ...rovoDevTextareaStyles }}
                placeholder={getTextAreaPlaceholder()}
                onChange={(element) => onPromptTextChange(element.target.value)}
                onKeyDown={handleKeyDown}
                value={promptText}
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
                            ...rovoDevDeepPlanStylesSelector(isDeepPlanEnabled, state !== State.WaitingForPrompt),
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
            </div>
        </>
    );
};
