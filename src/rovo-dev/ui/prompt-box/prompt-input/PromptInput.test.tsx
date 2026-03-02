const editor = {
    addCommand: jest.fn(),
    dispose: jest.fn(),
    setValue: jest.fn(),
    getValue: jest.fn(),
    onDidChangeModelContent: jest.fn(),
    onDidContentSizeChange: jest.fn(),
    getContentHeight: jest.fn(() => 100),
    getContainerDomNode: jest.fn(() => ({ style: { height: '' } })),
    getModel: jest.fn(),
    focus: jest.fn(),
    layout: jest.fn(),
    updateOptions: jest.fn(),
    trigger: jest.fn(),
};

jest.mock('monaco-editor', () => ({
    languages: {
        registerCompletionItemProvider: jest.fn(() => ({
            dispose: jest.fn(),
        })),
    },
    editor: {
        create: jest.fn(() => editor),
        registerCommand: jest.fn(),
        defineTheme: jest.fn(),
    },
    KeyCode: {
        Enter: 3,
        Tab: 2,
    },
    KeyMod: {
        Shift: 1024,
    },
}));

jest.mock('@atlaskit/css', () => ({
    cssMap: (styles: any) => {
        const result: any = {};
        for (const key in styles) {
            result[key] = styles[key];
        }
        return result;
    },
}));

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';

import { PromptInputBox } from './PromptInput';

describe('PromptInputBox', () => {
    const defaultProps = {
        currentState: { state: 'WaitingForPrompt' } as Exclude<State, DisabledState>,
        promptText: '',
        onPromptTextChange: jest.fn(),
        isDeepPlanEnabled: false,
        isYoloModeEnabled: false,
        isFullContextEnabled: false,
        availableAgentModes: [],
        currentAgentMode: null,
        availableAgentModels: [],
        currentAgentModel: {
            modelName: 'cool_model',
            modelId: 'Cool Model',
            creditMultiplier: '2',
        },
        onAgentModeChange: jest.fn(),
        onAgentModelChange: jest.fn(),
        onDeepPlanToggled: jest.fn(),
        onYoloModeToggled: jest.fn(),
        onFullContextToggled: jest.fn(),
        onSend: jest.fn(),
        onCancel: jest.fn(),
        sendButtonDisabled: false,
        onAddContext: jest.fn(),
        onCopy: jest.fn(),
        handleMemoryCommand: jest.fn(),
        handleTriggerFeedbackCommand: jest.fn(),
        handleSessionCommand: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Send button when state is WaitingForPrompt', () => {
        render(<PromptInputBox {...defaultProps} />);
        expect(screen.getByLabelText('Send prompt')).toBeTruthy();
    });

    it('renders Stop button when state is not WaitingForPrompt', () => {
        render(<PromptInputBox {...defaultProps} currentState={{ state: 'GeneratingResponse' }} />);
        expect(screen.getByLabelText('Stop')).toBeTruthy();
    });

    it('calls onSend when Send button is clicked', () => {
        jest.spyOn(editor, 'getValue').mockReturnValue('text prompt');
        jest.spyOn(editor, 'onDidChangeModelContent').mockImplementation((cb) => cb());
        render(<PromptInputBox {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Send prompt'));
        expect(defaultProps.onSend).toHaveBeenCalledWith('text prompt');
    });

    it('calls onCancel when Stop button is clicked', () => {
        render(<PromptInputBox {...defaultProps} currentState={{ state: 'GeneratingResponse' }} />);
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('disables Stop button when state is CancellingResponse', () => {
        render(<PromptInputBox {...defaultProps} currentState={{ state: 'CancellingResponse' }} />);
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(0);
    });
});
