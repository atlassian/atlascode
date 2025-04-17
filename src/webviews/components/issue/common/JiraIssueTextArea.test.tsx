import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { disableConsole } from 'testsutil';

import JiraIssueTextAreaEditor from './JiraIssueTextArea';

describe('JiraIssueTextAreaEditor', () => {
    const mockOnChange = jest.fn();
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();
    const mockFetchUsers = jest.fn().mockResolvedValue([
        { displayName: 'User One', mention: '@user1' },
        { displayName: 'User Two', mention: '@user2' },
    ]);

    const defaultProps = {
        value: '',
        onChange: mockOnChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
        fetchUsers: mockFetchUsers,
        saving: false,
    };

    beforeAll(() => {
        disableConsole('warn');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the text area with initial value', () => {
        const { getByDisplayValue } = render(<JiraIssueTextAreaEditor {...defaultProps} value="Initial value" />);
        expect(getByDisplayValue('Initial value')).toBeTruthy();
    });

    it('calls onChange when text is entered', () => {
        const { getByRole } = render(<JiraIssueTextAreaEditor {...defaultProps} />);
        const textArea = getByRole('textbox');
        fireEvent.change(textArea, { target: { value: 'New value' } });
        expect(mockOnChange).toHaveBeenCalledWith('New value');
    });

    it('calls onSave when the save button is clicked', () => {
        const { getByText } = render(<JiraIssueTextAreaEditor {...defaultProps} />);
        const saveButton = getByText('Save');
        fireEvent.click(saveButton);
        expect(mockOnSave).toHaveBeenCalled();
    });

    it('calls onCancel when the cancel button is clicked', () => {
        const { getByText } = render(<JiraIssueTextAreaEditor {...defaultProps} />);
        const cancelButton = getByText('Cancel');
        fireEvent.click(cancelButton);
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('renders "Reply" instead of "Save" for service desk projects', () => {
        const { getByText } = render(<JiraIssueTextAreaEditor {...defaultProps} isServiceDeskProject={true} />);
        expect(getByText('Reply')).toBeTruthy();
    });

    it('calls onInternalCommentSave when "Add internal note" is clicked in service desk projects', () => {
        const mockOnInternalCommentSave = jest.fn();
        const { getByText } = render(
            <JiraIssueTextAreaEditor
                {...defaultProps}
                isServiceDeskProject={true}
                onInternalCommentSave={mockOnInternalCommentSave}
            />,
        );
        const internalNoteButton = getByText('Add internal note');
        fireEvent.click(internalNoteButton);
        expect(mockOnInternalCommentSave).toHaveBeenCalled();
    });
});
