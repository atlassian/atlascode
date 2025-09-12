jest.mock('monaco-editor', () => ({
    languages: {
        registerCompletionItemProvider: jest.fn(() => ({
            dispose: jest.fn(),
        })),
    },
    editor: {
        create: jest.fn(() => ({
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
        })),
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

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { renderWithStore } from 'src/react/store/test-utils';
import { DisabledState, State } from 'src/rovo-dev/rovoDevTypes';

import { PromptInputBox } from './PromptInput';

const mockDispatch = jest.fn();
jest.mock('src/react/store/hooks', () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: jest.requireActual('src/react/store/hooks').useAppSelector,
}));

describe('PromptInputBox', () => {
    const defaultProps = {
        onSend: jest.fn(),
        onCancel: jest.fn(),
        onAddContext: jest.fn(),
        onCopy: jest.fn(),
        handleMemoryCommand: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Send button when state is WaitingForPrompt', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: { rovoDevStates: { currentState: { state: 'WaitingForPrompt' } as State | DisabledState } },
        });
        expect(screen.getByLabelText('Send prompt')).toBeTruthy();
    });

    it('renders Stop button when state is not WaitingForPrompt', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: {
                rovoDevStates: { currentState: { state: 'GeneratingResponse' } as State | DisabledState },
            },
        });
        expect(screen.getByLabelText('Stop')).toBeTruthy();
    });

    it('calls onSend when Send button is clicked', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: { rovoDevStates: { currentState: { state: 'WaitingForPrompt' } as State | DisabledState } },
        });
        fireEvent.click(screen.getByLabelText('Send prompt'));
        expect(defaultProps.onSend).toHaveBeenCalled();
    });

    it('calls onCancel when Stop button is clicked', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: {
                rovoDevStates: { currentState: { state: 'GeneratingResponse' } as State | DisabledState },
            },
        });
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('disables Stop button when state is CancellingResponse', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: {
                rovoDevStates: { currentState: { state: 'CancellingResponse' } as State | DisabledState },
            },
        });
        fireEvent.click(screen.getByLabelText('Stop'));
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(0);
    });

    it('calls onDeepPlanToggled when deep plan button is clicked', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: { rovoDevStates: { currentState: { state: 'WaitingForPrompt' } as State | DisabledState } },
        });
        fireEvent.click(screen.getAllByRole('button', { name: '' })[1]);
        expect(mockDispatch).toHaveBeenCalledWith({ payload: true, type: 'promptContext/setIsDeepPlanToggled' });
    });

    it('disables deep plan button when state is not WaitingForPrompt', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: {
                rovoDevStates: { currentState: { state: 'GeneratingResponse' } as State | DisabledState },
            },
        });
        fireEvent.click(screen.getAllByRole('button', { name: '' })[1]);
        expect(mockDispatch).toHaveBeenCalledTimes(0);
    });

    it('shows "Deep plan enabled" text when deep plan is enabled', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: {
                promptContext: { isDeepPlanToggled: true },
                rovoDevStates: { currentState: { state: 'WaitingForPrompt' } as State | DisabledState },
            },
        });
        expect(screen.getByText('Deep plan enabled')).toBeTruthy();
    });

    it('calls onAddContext when Add Context button is clicked', () => {
        renderWithStore(<PromptInputBox {...defaultProps} />, {
            preloadedState: { rovoDevStates: { currentState: { state: 'WaitingForPrompt' } as State | DisabledState } },
        });
        fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
        expect(defaultProps.onAddContext).toHaveBeenCalled();
    });
});
