import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { FeedbackForm, FeedbackFormProps } from './FeedbackForm';

describe('FeedbackForm', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    const defaultProps: FeedbackFormProps = {
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with default general feedback type', () => {
        render(<FeedbackForm {...defaultProps} />);

        expect(screen.getByText('Share your thoughts')).toBeTruthy();
        expect(screen.getByLabelText('Type of feedback')).toBeTruthy();
        expect(screen.getByLabelText('Feedback')).toBeTruthy();
        expect(screen.getByText('Include last 10 messages in the feedback')).toBeTruthy();
    });

    it('renders with like type and hides feedback type selector', () => {
        render(<FeedbackForm {...defaultProps} type="like" />);

        expect(screen.getByText('Share your thoughts')).toBeTruthy();
        expect(screen.queryByLabelText('Type of feedback')).not.toBeTruthy();
    });

    it('renders with dislike type and shows appropriate title and options', () => {
        render(<FeedbackForm {...defaultProps} type="dislike" />);

        expect(screen.getByText('Please, share your feedback')).toBeTruthy();
        expect(screen.getByLabelText('Type of feedback')).toBeTruthy();
    });

    it('updates title when feedback type changes', async () => {
        const user = userEvent.setup();
        render(<FeedbackForm {...defaultProps} />);

        const select = screen.getByLabelText('Type of feedback');

        await user.selectOptions(select, 'reportContent');
        expect(screen.getAllByText('Report inappropriate content')).toBeTruthy();

        await user.selectOptions(select, 'bug');
        expect(screen.getByText('Please, share your feedback')).toBeTruthy();

        await user.selectOptions(select, 'general');
        expect(screen.getByText('Share your thoughts')).toBeTruthy();
    });

    it('submits form with correct data', async () => {
        const user = userEvent.setup();
        render(<FeedbackForm {...defaultProps} />);

        const select = screen.getByLabelText('Type of feedback');
        const textarea = screen.getByLabelText('Feedback');
        const checkbox = screen.getAllByRole('checkbox');
        const submitButton = screen.getByText('Send feedback');

        await user.selectOptions(select, 'general');
        await user.type(textarea, 'Great feature!');
        await user.click(checkbox[0]); // Uncheck
        await user.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith('general', 'Great feature!', true, false);
    });

    it('submits form with like type preset', async () => {
        const user = userEvent.setup();
        render(<FeedbackForm {...defaultProps} type="like" />);

        const textarea = screen.getByLabelText('Feedback');
        const submitButton = screen.getByText('Send feedback');

        await user.type(textarea, 'Love this!');
        await user.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith('general', 'Love this!', true, true);
    });

    it('calls onCancel when cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(<FeedbackForm {...defaultProps} />);

        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('requires feedback type selection and message', async () => {
        const user = userEvent.setup();
        render(<FeedbackForm {...defaultProps} />);

        const submitButton = screen.getByText('Send feedback');
        await user.click(submitButton);

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows correct options for dislike type', () => {
        render(<FeedbackForm {...defaultProps} type="dislike" />);

        const select = screen.getByLabelText('Type of feedback');
        expect(select).toBeTruthy();

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3); // Including disabled placeholder
        expect(screen.getByText('Report bug')).toBeTruthy();
        expect(screen.getByText('Report harmful or inappropriate content')).toBeTruthy();
    });

    it('shows all options for general feedback', () => {
        render(<FeedbackForm {...defaultProps} />);

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(4); // Including disabled placeholder
        expect(screen.getByText('General feedback')).toBeTruthy();
        expect(screen.getByText('Report bug')).toBeTruthy();
        expect(screen.getByText('Report harmful or inappropriate content')).toBeTruthy();
    });
});
