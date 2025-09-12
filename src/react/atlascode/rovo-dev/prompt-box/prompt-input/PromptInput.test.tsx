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
    },
    KeyMod: {
        Shift: 1024,
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
        onDeepPlanToggled: jest.fn(),
        onSend: jest.fn(),
        onCancel: jest.fn(),
        sendButtonDisabled: false,
        onAddContext: jest.fn(),
        onCopy: jest.fn(),
        handleMemoryCommand: jest.fn(),
        handleTriggerFeedbackCommand: jest.fn(),
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
        render(<PromptInputBox {...defaultProps} promptText="test prompt" />);
        jest.spyOn(editor, 'getValue').mockReturnValue('text prompt');
        fireEvent.click(screen.getByLabelText('Send prompt'));
        expect(defaultProps.onSend).toHaveBeenCalled();
    });

    it('calls onCancel when Stop button is clicked', () => {
        render(<PromptInputBox {...defaultProps} currentState={{ state: 'GeneratingResponse' }} />);
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('disables Send button when sendButtonDisabled is true', () => {
        render(<PromptInputBox {...defaultProps} sendButtonDisabled={true} />);
        fireEvent.click(screen.getByLabelText('Send prompt'));
        expect(defaultProps.onSend).toHaveBeenCalledTimes(0);
    });

    it('disables Stop button when state is CancellingResponse', () => {
        render(<PromptInputBox {...defaultProps} currentState={{ state: 'CancellingResponse' }} />);
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(0);
    });

    it('calls onDeepPlanToggled when deep plan button is clicked', () => {
        render(<PromptInputBox {...defaultProps} />);
        fireEvent.click(screen.getAllByRole('button', { name: '' })[1]);
        expect(defaultProps.onDeepPlanToggled).toHaveBeenCalled();
    });

    it('disables deep plan button when state is not WaitingForPrompt', () => {
        render(<PromptInputBox {...defaultProps} currentState={{ state: 'GeneratingResponse' }} />);
        fireEvent.click(screen.getAllByRole('button', { name: '' })[1]);
        expect(defaultProps.onDeepPlanToggled).toHaveBeenCalledTimes(0);
    });

    it('shows "Deep plan enabled" text when deep plan is enabled', () => {
        render(<PromptInputBox {...defaultProps} isDeepPlanEnabled={true} />);
        expect(screen.getByText('Deep plan enabled')).toBeTruthy();
    });

    it('calls onAddContext when Add Context button is clicked', () => {
        render(<PromptInputBox {...defaultProps} />);
        fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
        expect(defaultProps.onAddContext).toHaveBeenCalled();
    });
});
