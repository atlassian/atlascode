import { User } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import CloneForm from './CloneForm';

jest.mock('./UserPickerField', () => {
    return function MockUserPickerField({ value, onChange, label, placeholder, required }: any) {
        return (
            <div data-testid={`user-picker-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
                <label>{label}</label>
                <input
                    data-testid={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
                    value={value?.displayName || ''}
                    onChange={(e) => onChange({ displayName: e.target.value, accountId: 'test-id' })}
                    placeholder={placeholder}
                    required={required}
                />
            </div>
        );
    };
});

describe('CloneForm', () => {
    const mockCurrentUser: User = {
        accountId: 'current-user-id',
        displayName: 'Current User',
        active: true,
        emailAddress: 'current.user@example.com',
        key: 'current-user-key',
        self: 'https://example.atlassian.net/rest/api/3/user?accountId=current-user-id',
        timeZone: 'UTC',
        avatarUrls: {
            '48x48': 'avatar-url',
            '24x24': 'avatar-url-24',
            '16x16': 'avatar-url-16',
            '32x32': 'avatar-url-32',
        },
    };

    const mockOriginalAssignee: User = {
        accountId: 'assignee-id',
        displayName: 'Original Assignee',
        active: true,
        emailAddress: 'assignee@example.com',
        key: 'assignee-key',
        self: 'https://example.atlassian.net/rest/api/3/user?accountId=assignee-id',
        timeZone: 'UTC',
        avatarUrls: {
            '48x48': 'assignee-avatar-url',
            '24x24': 'assignee-avatar-url-24',
            '16x16': 'assignee-avatar-url-16',
            '32x32': 'assignee-avatar-url-32',
        },
    };

    const mockFetchUsers = jest.fn().mockResolvedValue([]);

    const defaultProps = {
        onClone: jest.fn(),
        onCancel: jest.fn(),
        currentUser: mockCurrentUser,
        originalSummary: 'Original Issue Summary',
        originalAssignee: mockOriginalAssignee,
        fetchUsers: mockFetchUsers,
        hasAttachments: true,
        hasLinkedIssues: true,
        hasChildIssues: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<CloneForm {...defaultProps} />);
        expect(screen.getByText('Clone Issue')).toBeTruthy();
    });

    it('displays the correct title and instructions', () => {
        render(<CloneForm {...defaultProps} />);
        expect(screen.getByText('Clone Issue')).toBeTruthy();
        expect(screen.getByText('Required fields are marked with an asterisk *')).toBeTruthy();
    });

    it('pre-fills summary with CLONE prefix', () => {
        render(<CloneForm {...defaultProps} />);
        const summaryInput = screen.getByDisplayValue('CLONE - Original Issue Summary');
        expect(summaryInput).toBeTruthy();
    });

    it('renders all required form fields', () => {
        render(<CloneForm {...defaultProps} />);

        expect(screen.getByDisplayValue('CLONE - Original Issue Summary')).toBeTruthy();
        expect(screen.getByTestId('input-assignee-')).toBeTruthy();
        expect(screen.getByTestId('input-reporter')).toBeTruthy();
    });

    it('pre-fills assignee with original assignee', () => {
        render(<CloneForm {...defaultProps} />);
        const assigneeInput = screen.getByTestId('input-assignee-') as HTMLInputElement;
        expect(assigneeInput.value).toBe('Original Assignee');
    });

    it('pre-fills reporter with current user', () => {
        render(<CloneForm {...defaultProps} />);
        const reporterInput = screen.getByTestId('input-reporter') as HTMLInputElement;
        expect(reporterInput.value).toBe('Current User');
    });

    it('renders include section when options are available', () => {
        render(<CloneForm {...defaultProps} />);
        expect(screen.getByText('Include')).toBeTruthy();
        expect(screen.getByText('Attachments')).toBeTruthy();
        expect(screen.getByText('Linked issues')).toBeTruthy();
    });

    it('does not render include section when no options are available', () => {
        const propsWithoutOptions = {
            ...defaultProps,
            hasAttachments: false,
            hasLinkedIssues: false,
            hasChildIssues: false,
        };
        render(<CloneForm {...propsWithoutOptions} />);
        expect(screen.queryByText('Include')).toBeFalsy();
    });

    it('renders only available include options', () => {
        const propsWithLimitedOptions = {
            ...defaultProps,
            hasAttachments: true,
            hasLinkedIssues: false,
            hasChildIssues: true,
        };
        render(<CloneForm {...propsWithLimitedOptions} />);

        expect(screen.getByText('Attachments')).toBeTruthy();
        expect(screen.queryByText('Linked issues')).toBeFalsy();
        expect(screen.getByText('Child issues')).toBeTruthy();
    });

    it('renders action buttons', () => {
        render(<CloneForm {...defaultProps} />);
        expect(screen.getByText('Cancel')).toBeTruthy();
        expect(screen.getByText('Clone')).toBeTruthy();
    });

    it('calls onCancel when Cancel button is clicked', () => {
        render(<CloneForm {...defaultProps} />);
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onClone with correct data when form is submitted', async () => {
        render(<CloneForm {...defaultProps} />);

        const summaryInput = screen.getByDisplayValue('CLONE - Original Issue Summary');
        fireEvent.change(summaryInput, { target: { value: 'Updated Summary' } });

        const assigneeInput = screen.getByTestId('input-assignee-');
        fireEvent.change(assigneeInput, { target: { value: 'New Assignee' } });

        const reporterInput = screen.getByTestId('input-reporter');
        fireEvent.change(reporterInput, { target: { value: 'New Reporter' } });

        const attachmentsCheckbox = screen.getByLabelText('Attachments');
        fireEvent.click(attachmentsCheckbox);

        const cloneButton = screen.getByText('Clone');
        fireEvent.click(cloneButton);

        await waitFor(() => {
            expect(defaultProps.onClone).toHaveBeenCalledWith({
                summary: 'Updated Summary',
                assignee: { displayName: 'New Assignee', accountId: 'test-id' },
                reporter: { displayName: 'New Reporter', accountId: 'test-id' },
                cloneOptions: {
                    includeAttachments: true,
                    includeLinkedIssues: false,
                    includeChildIssues: false,
                },
            });
        });
    });

    it('handles checkbox state changes correctly', () => {
        render(<CloneForm {...defaultProps} />);

        const attachmentsCheckbox = screen.getByLabelText('Attachments') as HTMLInputElement;
        const linkedIssuesCheckbox = screen.getByLabelText('Linked issues') as HTMLInputElement;

        expect(attachmentsCheckbox.checked).toBeFalsy();
        expect(linkedIssuesCheckbox.checked).toBeFalsy();

        fireEvent.click(attachmentsCheckbox);
        expect(attachmentsCheckbox.checked).toBeTruthy();

        fireEvent.click(linkedIssuesCheckbox);
        expect(linkedIssuesCheckbox.checked).toBeTruthy();
    });

    it('handles empty original assignee correctly', () => {
        const propsWithoutAssignee = {
            ...defaultProps,
            originalAssignee: null,
        };
        render(<CloneForm {...propsWithoutAssignee} />);

        const assigneeInput = screen.getByTestId('input-assignee-') as HTMLInputElement;
        expect(assigneeInput.value).toBe('');
    });

    it('passes fetchUsers prop to UserPickerField components', () => {
        render(<CloneForm {...defaultProps} />);

        expect(screen.getByTestId('user-picker-assignee-')).toBeTruthy();
        expect(screen.getByTestId('user-picker-reporter')).toBeTruthy();
    });

    it('handles form submission with default values', async () => {
        render(<CloneForm {...defaultProps} />);

        const cloneButton = screen.getByText('Clone');
        fireEvent.click(cloneButton);

        await waitFor(() => {
            expect(defaultProps.onClone).toHaveBeenCalledWith({
                summary: 'CLONE - Original Issue Summary',
                assignee: mockOriginalAssignee,
                reporter: mockCurrentUser,
                cloneOptions: {
                    includeAttachments: false,
                    includeLinkedIssues: false,
                    includeChildIssues: false,
                },
            });
        });
    });

    it('updates state when form fields change', () => {
        render(<CloneForm {...defaultProps} />);

        const summaryInput = screen.getByDisplayValue('CLONE - Original Issue Summary') as HTMLInputElement;
        fireEvent.change(summaryInput, { target: { value: 'New Summary' } });
        expect(summaryInput.value).toBe('New Summary');
    });

    it('renders with correct styling classes', () => {
        const { container } = render(<CloneForm {...defaultProps} />);

        const paperElement = container.querySelector('.MuiPaper-root');
        expect(paperElement).toBeTruthy();
    });
});
