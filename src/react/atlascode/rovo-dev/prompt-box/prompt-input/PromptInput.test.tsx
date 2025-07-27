import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { State } from '../../rovoDevView';
import { PromptInputBox } from './PromptInput';

describe('PromptInputBox', () => {
    const defaultProps = {
        state: State.WaitingForPrompt,
        promptText: '',
        onPromptTextChange: jest.fn(),
        isDeepPlanEnabled: false,
        onDeepPlanToggled: jest.fn(),
        onSend: jest.fn(),
        onCancel: jest.fn(),
        sendButtonDisabled: false,
        onAddContext: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders textarea with correct placeholder for WaitingForPrompt state', () => {
        render(<PromptInputBox {...defaultProps} />);
        expect(screen.getByPlaceholderText('Type in a question')).toBeTruthy();
    });

    it('renders textarea with correct placeholder for GeneratingResponse state', () => {
        render(<PromptInputBox {...defaultProps} state={State.GeneratingResponse} />);
        expect(screen.getByPlaceholderText('Generating response...')).toBeTruthy();
    });

    it('calls onPromptTextChange when textarea value changes', () => {
        render(<PromptInputBox {...defaultProps} />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'test input' } });
        expect(defaultProps.onPromptTextChange).toHaveBeenCalledWith('test input');
    });

    it('calls onSend when Enter key is pressed in WaitingForPrompt state', () => {
        render(<PromptInputBox {...defaultProps} promptText="test prompt" />);
        const textarea = screen.getByRole('textbox');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
        expect(defaultProps.onSend).toHaveBeenCalledWith('test prompt');
    });

    it('does not call onSend when Enter key is pressed with Shift', () => {
        render(<PromptInputBox {...defaultProps} promptText="test prompt" />);
        const textarea = screen.getByRole('textbox');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
        expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('does not call onSend when Enter key is pressed in non-WaitingForPrompt state', () => {
        render(<PromptInputBox {...defaultProps} state={State.GeneratingResponse} promptText="test prompt" />);
        const textarea = screen.getByRole('textbox');
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
        expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('renders Send button when state is WaitingForPrompt', () => {
        render(<PromptInputBox {...defaultProps} />);
        expect(screen.getByLabelText('Send prompt')).toBeTruthy();
    });

    it('renders Stop button when state is not WaitingForPrompt', () => {
        render(<PromptInputBox {...defaultProps} state={State.GeneratingResponse} />);
        expect(screen.getByLabelText('Stop')).toBeTruthy();
    });

    it('calls onSend when Send button is clicked', () => {
        render(<PromptInputBox {...defaultProps} promptText="test prompt" />);
        fireEvent.click(screen.getByLabelText('Send prompt'));
        expect(defaultProps.onSend).toHaveBeenCalledWith('test prompt');
    });

    it('calls onCancel when Stop button is clicked', () => {
        render(<PromptInputBox {...defaultProps} state={State.GeneratingResponse} />);
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('disables Send button when sendButtonDisabled is true', () => {
        render(<PromptInputBox {...defaultProps} sendButtonDisabled={true} />);
        fireEvent.click(screen.getByLabelText('Send prompt'));
        expect(defaultProps.onSend).toHaveBeenCalledTimes(0);
    });

    it('disables Stop button when state is CancellingResponse', () => {
        render(<PromptInputBox {...defaultProps} state={State.CancellingResponse} />);
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(0);
    });

    it('calls onDeepPlanToggled when deep plan button is clicked', () => {
        render(<PromptInputBox {...defaultProps} />);
        fireEvent.click(screen.getAllByRole('button', { name: '' })[1]);
        expect(defaultProps.onDeepPlanToggled).toHaveBeenCalled();
    });

    it('disables deep plan button when state is not WaitingForPrompt', () => {
        render(<PromptInputBox {...defaultProps} state={State.GeneratingResponse} />);
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

    it('displays correct textarea value', () => {
        render(<PromptInputBox {...defaultProps} promptText="existing text" />);
        expect(screen.getByDisplayValue('existing text')).toBeTruthy();
    });
});
