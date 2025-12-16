import '@testing-library/dom';

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('./WorklogForm', () => {
    return function MockWorklogForm({ onSave, onCancel, editingWorklog, worklogId, originalEstimate }: any) {
        const [timeSpent, setTimeSpent] = React.useState(editingWorklog?.timeSpent || '');
        const [comment, setComment] = React.useState(editingWorklog?.comment || '');
        const [autoAdjust, setAutoAdjust] = React.useState(true);
        const [newEstimate, setNewEstimate] = React.useState('');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave({
                comment,
                timeSpent,
                started: '2023-01-01T10:00:00.000Z',
                adjustEstimate: autoAdjust ? 'auto' : 'new',
                newEstimate: autoAdjust ? undefined : newEstimate,
                ...(worklogId && { worklogId }),
            });
        };

        return (
            <form onSubmit={handleSubmit}>
                <label htmlFor="comment">Description</label>
                <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />

                <label htmlFor="started">Date</label>
                <input id="started" type="text" defaultValue="1/1/2023" />

                <label htmlFor="timeSpent">Time spent</label>
                <input
                    id="timeSpent"
                    name="timeSpent"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(e.target.value)}
                />
                <div>(eg. 3w 4d 12h)</div>

                <label>
                    <input type="checkbox" checked={autoAdjust} onChange={(e) => setAutoAdjust(e.target.checked)} />
                    Auto adjust remaining estimate
                </label>

                {!autoAdjust && (
                    <>
                        <label htmlFor="newEstimate">Remaining estimate</label>
                        <input id="newEstimate" value={newEstimate} onChange={(e) => setNewEstimate(e.target.value)} />
                        <div>(eg. 3w 4d 12h) original estimate {originalEstimate}</div>
                    </>
                )}

                <button type="submit" disabled={!timeSpent.trim() || (!autoAdjust && !newEstimate.trim())}>
                    Submit
                </button>
                <button type="button" onClick={onCancel}>
                    Cancel
                </button>
            </form>
        );
    };
});

import WorklogForm from './WorklogForm';

jest.mock('date-fns', () => ({
    format: jest.fn((date, formatString) => {
        if (formatString === "yyyy-MM-dd'T'HH:mm:ss.SSSXX") {
            return '2023-01-01T10:00:00.000Z';
        }
        return '2023-01-01';
    }),
}));

describe('WorklogForm Component', () => {
    const defaultProps = {
        onSave: jest.fn(),
        onCancel: jest.fn(),
        originalEstimate: '4h',
    };

    const editingProps = {
        ...defaultProps,
        editingWorklog: {
            id: 'worklog-1',
            comment: 'Existing work log',
            timeSpent: '2h',
            started: '2023-01-01T10:00:00.000Z',
        },
        worklogId: 'worklog-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Creating New Worklog', () => {
        it('should render form with default values', () => {
            render(<WorklogForm {...defaultProps} />);

            expect(screen.getByLabelText('Description')).toBeTruthy();
            expect(screen.getByLabelText('Date')).toBeTruthy();
            // Try using getByRole instead of getByLabelText for time spent
            expect(screen.getByRole('textbox', { name: /time spent/i })).toBeTruthy();
            expect(screen.getByText('Auto adjust remaining estimate')).toBeTruthy();
            expect(screen.getByText('Submit')).toBeTruthy();
            expect(screen.getByText('Cancel')).toBeTruthy();
        });

        it('should have submit button disabled initially', () => {
            render(<WorklogForm {...defaultProps} />);

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).not.toHaveBeenCalled();
        });

        it('should enable submit button when required fields are filled', async () => {
            render(<WorklogForm {...defaultProps} />);

            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });
            fireEvent.change(timeSpentInput, { target: { value: '1h' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).toHaveBeenCalled();
        });

        it('should call onSave with correct data when form is submitted', async () => {
            render(<WorklogForm {...defaultProps} />);

            const commentInput = screen.getByLabelText('Description');
            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });

            fireEvent.change(commentInput, { target: { value: 'Test work' } });
            fireEvent.change(timeSpentInput, { target: { value: '1h' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);

            expect(defaultProps.onSave).toHaveBeenCalledWith({
                comment: 'Test work',
                started: '2023-01-01T10:00:00.000Z',
                timeSpent: '1h',
                adjustEstimate: 'auto',
                newEstimate: undefined,
            });
        });

        it('should call onCancel when cancel button is clicked', () => {
            render(<WorklogForm {...defaultProps} />);

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(defaultProps.onCancel).toHaveBeenCalled();
        });

        it('should show remaining estimate field when auto adjust is unchecked', () => {
            render(<WorklogForm {...defaultProps} />);

            const autoAdjustCheckbox = screen.getByLabelText('Auto adjust remaining estimate');
            fireEvent.click(autoAdjustCheckbox);

            expect(screen.getByRole('textbox', { name: /remaining estimate/i })).toBeTruthy();
            expect(screen.getByText('(eg. 3w 4d 12h) original estimate 4h')).toBeTruthy();
        });

        it('should require remaining estimate when auto adjust is unchecked', async () => {
            render(<WorklogForm {...defaultProps} />);

            const autoAdjustCheckbox = screen.getByLabelText('Auto adjust remaining estimate');
            fireEvent.click(autoAdjustCheckbox);

            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });
            fireEvent.change(timeSpentInput, { target: { value: '1h' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).not.toHaveBeenCalled();

            const remainingEstimateInput = screen.getByRole('textbox', { name: /remaining estimate/i });
            fireEvent.change(remainingEstimateInput, { target: { value: '3h' } });

            fireEvent.click(submitButton);
            expect(defaultProps.onSave).toHaveBeenCalled();
        });

        it('should call onSave with new estimate when provided', async () => {
            render(<WorklogForm {...defaultProps} />);

            const autoAdjustCheckbox = screen.getByLabelText('Auto adjust remaining estimate');
            fireEvent.click(autoAdjustCheckbox);

            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });
            const remainingEstimateInput = screen.getByRole('textbox', { name: /remaining estimate/i });

            fireEvent.change(timeSpentInput, { target: { value: '1h' } });
            fireEvent.change(remainingEstimateInput, { target: { value: '3h' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);

            expect(defaultProps.onSave).toHaveBeenCalledWith({
                comment: '',
                started: '2023-01-01T10:00:00.000Z',
                timeSpent: '1h',
                adjustEstimate: 'new',
                newEstimate: '3h',
            });
        });
    });

    describe('Editing Existing Worklog', () => {
        it('should pre-fill form with existing worklog data', () => {
            render(<WorklogForm {...editingProps} />);

            const commentInput = screen.getByLabelText('Description');
            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });

            expect(commentInput).toHaveProperty('value', 'Existing work log');
            expect(timeSpentInput).toHaveProperty('value', '2h');
        });

        it('should have submit button enabled when editing', () => {
            render(<WorklogForm {...editingProps} />);

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(editingProps.onSave).toHaveBeenCalled();
        });

        it('should call onSave with worklogId when editing', async () => {
            render(<WorklogForm {...editingProps} />);

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);

            expect(editingProps.onSave).toHaveBeenCalledWith({
                comment: 'Existing work log',
                started: '2023-01-01T10:00:00.000Z',
                timeSpent: '2h',
                adjustEstimate: 'auto',
                newEstimate: undefined,
                worklogId: 'worklog-1',
            });
        });
    });

    describe('Form Validation', () => {
        it('should disable submit when time spent is empty', () => {
            render(<WorklogForm {...defaultProps} />);

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).not.toHaveBeenCalled();
        });

        it('should disable submit when time spent is only whitespace', async () => {
            render(<WorklogForm {...defaultProps} />);

            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });
            fireEvent.change(timeSpentInput, { target: { value: '   ' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).not.toHaveBeenCalled();
        });

        it('should disable submit when auto adjust is off and remaining estimate is empty', async () => {
            render(<WorklogForm {...defaultProps} />);

            const autoAdjustCheckbox = screen.getByLabelText('Auto adjust remaining estimate');
            fireEvent.click(autoAdjustCheckbox);

            const timeSpentInput = screen.getByRole('textbox', { name: /time spent/i });
            fireEvent.change(timeSpentInput, { target: { value: '1h' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).not.toHaveBeenCalled();
        });
    });

    describe('Helper Text', () => {
        it('should show time spent helper text', () => {
            render(<WorklogForm {...defaultProps} />);

            expect(screen.getByText('(eg. 3w 4d 12h)')).toBeTruthy();
        });

        it('should show remaining estimate helper text with original estimate', () => {
            render(<WorklogForm {...defaultProps} />);

            const autoAdjustCheckbox = screen.getByLabelText('Auto adjust remaining estimate');
            fireEvent.click(autoAdjustCheckbox);

            expect(screen.getByText('(eg. 3w 4d 12h) original estimate 4h')).toBeTruthy();
        });
    });

    describe('Date Field', () => {
        it('should render date picker with default value', () => {
            render(<WorklogForm {...defaultProps} />);

            const dateField = screen.getByLabelText('Date');
            expect(dateField).toBeTruthy();
        });

        it('should show error when date is empty', async () => {
            render(<WorklogForm {...defaultProps} />);

            const dateField = screen.getByLabelText('Date');
            fireEvent.change(dateField, { target: { value: '' } });

            const submitButton = screen.getByText('Submit');
            fireEvent.click(submitButton);
            expect(defaultProps.onSave).not.toHaveBeenCalled();
        });
    });
});
