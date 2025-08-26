import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ChildIssuesComponent } from './ChildIssuesComponent';

describe('ChildIssuesComponent', () => {
    const mockOnSave = jest.fn();
    const mockSetEnableSubtasks = jest.fn();
    const mockSetEnableEpicChildren = jest.fn();
    const mockHandleOpenIssue = jest.fn();

    const defaultProps = {
        childTypes: [
            { id: '1', name: 'Task', iconUrl: 'task-icon.png' },
            { id: '2', name: 'Bug', iconUrl: 'bug-icon.png' },
        ] as IssueType[],
        label: 'Subtasks',
        onSave: mockOnSave,
        loading: false,
        enable: false,
        handleOpenIssue: mockHandleOpenIssue,
        issues: [],
        isEpic: false,
        setEnableEpicChildren: mockSetEnableEpicChildren,
        setEnableSubtasks: mockSetEnableSubtasks,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the component with the provided label', () => {
        render(<ChildIssuesComponent {...defaultProps} />);
        expect(screen.getByText('Subtasks')).toBeTruthy();
    });

    it('opens the editing mode when the add button is clicked', () => {
        render(<ChildIssuesComponent {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Add'));
        expect(screen.getByPlaceholderText('What needs to be done?')).toBeTruthy();
    });

    it('calls onSave with the correct data when the Create button is clicked', () => {
        render(<ChildIssuesComponent {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Add'));

        fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
            target: { value: 'New Subtask' },
        });

        fireEvent.click(screen.getByText('Create'));

        expect(mockOnSave).toHaveBeenCalledWith({
            summary: 'New Subtask',
            issuetype: { id: '1' },
        });
    });

    it('resets the input and closes editing mode when the Cancel button is clicked', () => {
        render(<ChildIssuesComponent {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Add'));

        fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
            target: { value: 'New Subtask' },
        });

        fireEvent.click(screen.getByText('Cancel'));

        expect(screen.queryByPlaceholderText('What needs to be done?')).not.toBeTruthy();
        expect(mockSetEnableSubtasks).toHaveBeenCalledWith(false);
    });

    it('renders the list of issues', () => {
        const issues = [
            { id: '1', key: 'ISSUE-1', issuetype: { name: 'Subtask' }, summary: 'Issue 1' },
            { id: '2', key: 'ISSUE-2', issuetype: { name: 'Subtask' }, summary: 'Issue 2' },
        ];
        render(<ChildIssuesComponent {...defaultProps} issues={issues} />);

        expect(screen.getByText('Issue 1')).toBeTruthy();
        expect(screen.getByText('Issue 2')).toBeTruthy();
    });

    it('calls handleOpenIssue when an issue is clicked', () => {
        const issues = [
            { id: '1', key: 'ISSUE-1', issuetype: { name: 'Subtask' }, summary: 'Issue 1', siteDetails: undefined },
            { id: '2', key: 'ISSUE-2', issuetype: { name: 'Subtask' }, summary: 'Issue 2', siteDetails: undefined },
        ];
        render(<ChildIssuesComponent {...defaultProps} issues={issues} />);

        fireEvent.click(screen.getByText('ISSUE-1'));
        expect(mockHandleOpenIssue).toHaveBeenCalled();
    });
});
