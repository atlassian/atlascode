import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { RovoDevAskUserQuestionsToolArgs } from 'src/rovo-dev/client';

import { AskUserQuestionsComponent } from './AskUserQuestionsComponent';

// Mock the QuestionCircleIcon
jest.mock('@atlaskit/icon/core/question-circle', () => {
    return function DummyIcon() {
        return <span data-testid="question-circle-icon">Icon</span>;
    };
});

describe('AskUserQuestionsComponent', () => {
    const mockOnSubmit = jest.fn();

    const mockArgs: RovoDevAskUserQuestionsToolArgs = {
        questions: [
            {
                header: 'Architecture Decision',
                question: 'What is your preferred design pattern?',
                options: [
                    { label: 'MVC', description: 'Model-View-Controller pattern' },
                    { label: 'MVVM', description: 'Model-View-ViewModel pattern' },
                    { label: 'Hexagonal', description: 'Hexagonal/Ports and Adapters architecture' },
                ],
            },
            {
                header: 'Testing Strategy',
                question: 'What testing framework would you like to use?',
                options: [
                    { label: 'Jest', description: 'Fast, zero-config testing platform' },
                    { label: 'Mocha', description: 'Feature-rich JavaScript test framework' },
                    { label: 'Vitest', description: 'Unit testing framework powered by Vite' },
                ],
            },
        ],
    };

    const defaultProps = {
        toolCallId: 'test-tool-call-123',
        args: mockArgs,
        onSubmit: mockOnSubmit,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the component with correct header', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        expect(screen.getByText('Additional information required')).toBeTruthy();
        expect(screen.getByTestId('question-circle-icon')).toBeTruthy();
    });

    it('renders all questions', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        expect(screen.getByText('What is your preferred design pattern?')).toBeTruthy();
        expect(screen.getByText('What testing framework would you like to use?')).toBeTruthy();
    });

    it('renders all question headers', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        expect(screen.getByText('Architecture Decision')).toBeTruthy();
        expect(screen.getByText('Testing Strategy')).toBeTruthy();
    });

    it('renders all options for each question', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        // First question options
        expect(screen.getByText('MVC - Model-View-Controller pattern')).toBeTruthy();
        expect(screen.getByText('MVVM - Model-View-ViewModel pattern')).toBeTruthy();
        expect(screen.getByText('Hexagonal - Hexagonal/Ports and Adapters architecture')).toBeTruthy();

        // Second question options
        expect(screen.getByText('Jest - Fast, zero-config testing platform')).toBeTruthy();
        expect(screen.getByText('Mocha - Feature-rich JavaScript test framework')).toBeTruthy();
        expect(screen.getByText('Vitest - Unit testing framework powered by Vite')).toBeTruthy();
    });

    it('renders select elements for each question', () => {
        const { container } = render(<AskUserQuestionsComponent {...defaultProps} />);

        const selects = container.querySelectorAll('.form-select');
        expect(selects).toHaveLength(2);
    });

    it('renders submit button', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        expect(submitButton).toBeTruthy();
    });

    it('updates state when a select option is changed', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'MVC' } });

        expect((selects[0] as HTMLSelectElement).value).toBe('MVC');
    });

    it('allows selecting different options for each question independently', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        const selects = screen.getAllByRole('combobox');

        fireEvent.change(selects[0], { target: { value: 'MVVM' } });
        fireEvent.change(selects[1], { target: { value: 'Vitest' } });

        expect((selects[0] as HTMLSelectElement).value).toBe('MVVM');
        expect((selects[1] as HTMLSelectElement).value).toBe('Vitest');
    });

    it('calls onSubmit with correct payload when submit button is clicked', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'MVC' } });
        fireEvent.change(selects[1], { target: { value: 'Jest' } });

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                toolCallId: 'test-tool-call-123',
                result: [
                    {
                        question: 'What is your preferred design pattern?',
                        answer: 'MVC',
                    },
                    {
                        question: 'What testing framework would you like to use?',
                        answer: 'Jest',
                    },
                ],
            }),
        );
    });

    it('submits with empty string answers if no selections are made', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                toolCallId: 'test-tool-call-123',
                result: [
                    {
                        question: 'What is your preferred design pattern?',
                        answer: '',
                    },
                    {
                        question: 'What testing framework would you like to use?',
                        answer: '',
                    },
                ],
            }),
        );
    });

    it('preserves the toolCallId in submission', () => {
        const customToolCallId = 'custom-id-456';
        render(<AskUserQuestionsComponent {...defaultProps} toolCallId={customToolCallId} />);

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'Hexagonal' } });

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                toolCallId: customToolCallId,
            }),
        );
    });

    it('allows changing answer after initial selection', () => {
        render(<AskUserQuestionsComponent {...defaultProps} />);

        const selects = screen.getAllByRole('combobox');

        // First selection
        fireEvent.change(selects[0], { target: { value: 'MVC' } });
        expect((selects[0] as HTMLSelectElement).value).toBe('MVC');

        // Change selection
        fireEvent.change(selects[0], { target: { value: 'MVVM' } });
        expect((selects[0] as HTMLSelectElement).value).toBe('MVVM');

        // Submit with changed value
        const submitButton = screen.getByRole('button', { name: /Submit/i });
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                result: expect.arrayContaining([
                    expect.objectContaining({
                        question: 'What is your preferred design pattern?',
                        answer: 'MVVM',
                    }),
                ]),
            }),
        );
    });
});
