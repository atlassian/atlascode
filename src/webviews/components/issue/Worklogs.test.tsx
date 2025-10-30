import '@testing-library/dom';

import { Worklog, WorklogContainer } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import Worklogs from './Worklogs';

jest.mock('./WorklogForm', () => {
    return function MockWorklogForm({ onSave, onCancel, editingWorklog }: any) {
        return (
            <div data-testid="worklog-form">
                <div>Editing: {editingWorklog?.comment}</div>
                <button onClick={() => onSave({ timeSpent: '2h', comment: 'Updated work' })}>Save</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        );
    };
});

describe('Worklogs Component', () => {
    const mockWorklog: Worklog = {
        id: 'worklog-1',
        timeSpent: '1h',
        timeSpentSeconds: 3600,
        comment: 'Test work log',
        created: '2023-01-01T10:00:00.000Z',
        updated: '2023-01-01T10:00:00.000Z',
        started: '2023-01-01T10:00:00.000Z',
        issueId: 'TEST-123',
        updateAuthor: {
            accountId: 'user-1',
            displayName: 'Test User',
            active: true,
            emailAddress: 'test@example.com',
            key: 'test-user',
            self: 'https://example.com/user/test-user',
            timeZone: 'UTC',
            avatarUrls: {
                '16x16': 'https://example.com/avatar.png',
                '24x24': 'https://example.com/avatar.png',
                '32x32': 'https://example.com/avatar.png',
                '48x48': 'https://example.com/avatar.png',
            },
        },
        author: {
            accountId: 'user-1',
            displayName: 'Test User',
            active: true,
            emailAddress: 'test@example.com',
            key: 'test-user',
            self: 'https://example.com/user/test-user',
            timeZone: 'UTC',
            avatarUrls: {
                '16x16': 'https://example.com/avatar.png',
                '24x24': 'https://example.com/avatar.png',
                '32x32': 'https://example.com/avatar.png',
                '48x48': 'https://example.com/avatar.png',
            },
        },
    };

    const mockWorklogContainer: WorklogContainer = {
        worklogs: [mockWorklog],
        total: 1,
    };

    const defaultProps = {
        worklogs: mockWorklogContainer,
        originalEstimate: '4h',
        onEditWorklog: jest.fn(),
        onConfirmDelete: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render worklog entries', () => {
            render(<Worklogs {...defaultProps} />);

            expect(screen.getByText('Test User')).toBeTruthy();
            expect(screen.getByText('Test work log')).toBeTruthy();
            expect(screen.getByText('1h')).toBeTruthy();
        });

        it('should render edit and delete buttons', () => {
            render(<Worklogs {...defaultProps} />);

            const editButton = screen.getByLabelText('Edit');
            const deleteButton = screen.getByLabelText('Delete');

            expect(editButton).toBeTruthy();
            expect(deleteButton).toBeTruthy();
        });
    });

    describe('Edit Functionality', () => {
        it('should open edit dialog when edit button is clicked', () => {
            render(<Worklogs {...defaultProps} />);

            const editButton = screen.getByLabelText('Edit');
            fireEvent.click(editButton);

            expect(screen.getByTestId('worklog-form')).toBeTruthy();
            expect(screen.getByText('Editing: Test work log')).toBeTruthy();
        });

        it('should call onEditWorklog with correct data when save is clicked', () => {
            render(<Worklogs {...defaultProps} />);

            const editButton = screen.getByLabelText('Edit');
            fireEvent.click(editButton);

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            expect(defaultProps.onEditWorklog).toHaveBeenCalledWith({
                action: 'updateWorklog',
                worklogId: 'worklog-1',
                worklogData: { timeSpent: '2h', comment: 'Updated work' },
            });
        });

        it('should close edit dialog when cancel is clicked', () => {
            render(<Worklogs {...defaultProps} />);

            const editButton = screen.getByLabelText('Edit');
            fireEvent.click(editButton);

            expect(screen.getByTestId('worklog-form')).toBeTruthy();

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(screen.queryByTestId('worklog-form')).not.toBeTruthy();
        });

        it('should close edit dialog when save is clicked', () => {
            render(<Worklogs {...defaultProps} />);

            const editButton = screen.getByLabelText('Edit');
            fireEvent.click(editButton);

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            expect(screen.queryByTestId('worklog-form')).not.toBeTruthy();
        });
    });

    describe('Delete Functionality', () => {
        it('should open delete confirmation when delete button is clicked', () => {
            render(<Worklogs {...defaultProps} />);

            const deleteButton = screen.getByLabelText('Delete');
            fireEvent.click(deleteButton);

            expect(
                screen.getByText('Are you sure you want to delete this work log? This action cannot be undone.'),
            ).toBeTruthy();
            expect(screen.getByText('Cancel')).toBeTruthy();
            expect(screen.getByText('Delete')).toBeTruthy();
        });

        it('should call onConfirmDelete when delete is confirmed', () => {
            render(<Worklogs {...defaultProps} />);

            const deleteButton = screen.getByLabelText('Delete');
            fireEvent.click(deleteButton);

            const confirmDeleteButton = screen.getByText('Delete');
            fireEvent.click(confirmDeleteButton);

            expect(defaultProps.onConfirmDelete).toHaveBeenCalledWith(mockWorklog);
        });

        it('should close delete dialog when cancel is clicked', () => {
            render(<Worklogs {...defaultProps} />);

            const deleteButton = screen.getByLabelText('Delete');
            fireEvent.click(deleteButton);

            expect(
                screen.getByText('Are you sure you want to delete this work log? This action cannot be undone.'),
            ).toBeTruthy();

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(
                screen.queryByText('Are you sure you want to delete this work log? This action cannot be undone.'),
            ).not.toBeTruthy();
        });

        it('should close delete dialog when delete is confirmed', () => {
            render(<Worklogs {...defaultProps} />);

            const deleteButton = screen.getByLabelText('Delete');
            fireEvent.click(deleteButton);

            const confirmDeleteButton = screen.getByText('Delete');
            fireEvent.click(confirmDeleteButton);

            expect(
                screen.queryByText('Are you sure you want to delete this work log? This action cannot be undone.'),
            ).not.toBeTruthy();
        });
    });

    describe('Multiple Worklogs', () => {
        const multipleWorklogs: WorklogContainer = {
            worklogs: [
                mockWorklog,
                {
                    id: 'worklog-2',
                    timeSpent: '2h',
                    timeSpentSeconds: 7200,
                    comment: 'Second work log',
                    created: '2023-01-02T10:00:00.000Z',
                    updated: '2023-01-02T10:00:00.000Z',
                    started: '2023-01-02T10:00:00.000Z',
                    issueId: 'TEST-123',
                    updateAuthor: {
                        accountId: 'user-2',
                        displayName: 'Second User',
                        active: true,
                        emailAddress: 'second@example.com',
                        key: 'second-user',
                        self: 'https://example.com/user/second-user',
                        timeZone: 'UTC',
                        avatarUrls: {
                            '16x16': 'https://example.com/avatar2.png',
                            '24x24': 'https://example.com/avatar2.png',
                            '32x32': 'https://example.com/avatar2.png',
                            '48x48': 'https://example.com/avatar2.png',
                        },
                    },
                    author: {
                        accountId: 'user-2',
                        displayName: 'Second User',
                        active: true,
                        emailAddress: 'second@example.com',
                        key: 'second-user',
                        self: 'https://example.com/user/second-user',
                        timeZone: 'UTC',
                        avatarUrls: {
                            '16x16': 'https://example.com/avatar2.png',
                            '24x24': 'https://example.com/avatar2.png',
                            '32x32': 'https://example.com/avatar2.png',
                            '48x48': 'https://example.com/avatar2.png',
                        },
                    },
                },
            ],
            total: 2,
        };

        it('should render multiple worklog entries', () => {
            render(<Worklogs {...defaultProps} worklogs={multipleWorklogs} />);

            expect(screen.getByText('Test User')).toBeTruthy();
            expect(screen.getByText('Second User')).toBeTruthy();
            expect(screen.getByText('Test work log')).toBeTruthy();
            expect(screen.getByText('Second work log')).toBeTruthy();
        });

        it('should allow editing different worklogs independently', () => {
            render(<Worklogs {...defaultProps} worklogs={multipleWorklogs} />);

            const editButtons = screen.getAllByLabelText('Edit');
            expect(editButtons).toHaveLength(2);

            fireEvent.click(editButtons[0]);
            expect(screen.getByText('Editing: Test work log')).toBeTruthy();

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            fireEvent.click(editButtons[1]);
            expect(screen.getByText('Editing: Second work log')).toBeTruthy();
        });

        it('should allow deleting different worklogs independently', () => {
            render(<Worklogs {...defaultProps} worklogs={multipleWorklogs} />);

            const deleteButtons = screen.getAllByLabelText('Delete');
            expect(deleteButtons).toHaveLength(2);

            fireEvent.click(deleteButtons[0]);
            expect(
                screen.getByText('Are you sure you want to delete this work log? This action cannot be undone.'),
            ).toBeTruthy();

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            fireEvent.click(deleteButtons[1]);
            expect(
                screen.getByText('Are you sure you want to delete this work log? This action cannot be undone.'),
            ).toBeTruthy();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty worklogs array', () => {
            const emptyWorklogs: WorklogContainer = { worklogs: [], total: 0 };
            render(<Worklogs {...defaultProps} worklogs={emptyWorklogs} />);

            expect(screen.queryByLabelText('Edit')).not.toBeTruthy();
            expect(screen.queryByLabelText('Delete')).not.toBeTruthy();
        });

        it('should handle missing optional props', () => {
            const propsWithoutCallbacks = {
                worklogs: mockWorklogContainer,
                originalEstimate: '4h',
            };

            render(<Worklogs {...propsWithoutCallbacks} />);

            const editButton = screen.getByLabelText('Edit');
            const deleteButton = screen.getByLabelText('Delete');

            fireEvent.click(editButton);
            fireEvent.click(deleteButton);
        });

        it('should handle worklog without comment', () => {
            const worklogWithoutComment: Worklog = {
                ...mockWorklog,
                comment: '',
            };

            const worklogsWithoutComment: WorklogContainer = {
                worklogs: [worklogWithoutComment],
                total: 1,
            };

            render(<Worklogs {...defaultProps} worklogs={worklogsWithoutComment} />);

            expect(screen.getByText('Test User')).toBeTruthy();
            expect(screen.getByText('1h')).toBeTruthy();
        });
    });
});
