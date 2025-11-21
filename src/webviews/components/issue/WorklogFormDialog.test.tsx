import { Worklog } from '@atlassianlabs/jira-pi-common-models';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('@atlaskit/modal-dialog', () => ({
    __esModule: true,
    default: ({ children, onClose, width, height, shouldReturnFocus, testId }: any) => (
        <div
            data-testid={testId}
            data-width={width}
            data-height={height}
            data-on-close={onClose ? 'defined' : 'undefined'}
            data-should-return-focus={shouldReturnFocus ? 'true' : 'false'}
        >
            {children}
        </div>
    ),
    ModalBody: ({ children }: any) => <div data-testid="modal-body">{children}</div>,
    ModalTransition: ({ children }: any) => <div data-testid="modal-transition">{children}</div>,
}));

jest.mock('./WorklogForm', () => {
    return function MockWorklogForm({ onSave, onCancel, editingWorklog, worklogId, originalEstimate }: any) {
        return (
            <div data-testid="worklog-form">
                <div data-testid="worklog-form-props">
                    <div data-testid="on-save">{onSave ? 'defined' : 'undefined'}</div>
                    <div data-testid="on-cancel">{onCancel ? 'defined' : 'undefined'}</div>
                    <div data-testid="original-estimate">{originalEstimate}</div>
                    <div data-testid="worklog-id">{worklogId || 'undefined'}</div>
                    <div data-testid="editing-worklog">{editingWorklog ? 'defined' : 'undefined'}</div>
                </div>
            </div>
        );
    };
});

import { WorklogFormDialog } from './WorklogFormDialog';

describe('WorklogFormDialog Component', () => {
    const mockOnClose = jest.fn();
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();

    const defaultProps = {
        onClose: mockOnClose,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
        originalEstimate: '4h',
    };

    const mockEditingWorklog: Worklog = {
        id: 'worklog-1',
        comment: 'Existing work log',
        timeSpent: '2h',
        timeSpentSeconds: 7200,
        issueId: 'issue-1',
        created: '2023-01-01T10:00:00.000Z',
        started: '2023-01-01T10:00:00.000Z',
        author: {
            accountId: 'user-1',
            active: true,
            avatarUrls: {
                '48x48': 'https://example.com/avatar.png',
                '24x24': 'https://example.com/avatar.png',
                '16x16': 'https://example.com/avatar.png',
                '32x32': 'https://example.com/avatar.png',
            },
            displayName: 'Test User',
            emailAddress: 'test@example.com',
            key: 'testuser',
            self: 'https://example.com/user/user-1',
            timeZone: 'UTC',
        },
        updateAuthor: {
            accountId: 'user-1',
            active: true,
            avatarUrls: {
                '48x48': 'https://example.com/avatar.png',
                '24x24': 'https://example.com/avatar.png',
                '16x16': 'https://example.com/avatar.png',
                '32x32': 'https://example.com/avatar.png',
            },
            displayName: 'Test User',
            emailAddress: 'test@example.com',
            key: 'testuser',
            self: 'https://example.com/user/user-1',
            timeZone: 'UTC',
        },
        updated: '2023-01-01T10:00:00.000Z',
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Modal Structure', () => {
        it('should render ModalTransition wrapper', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            expect(screen.getByTestId('modal-transition')).toBeTruthy();
        });

        it('should render Modal with correct testId', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            expect(screen.getByTestId('worklog-modal-dialog')).toBeTruthy();
        });

        it('should render Modal with correct dimensions', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            const modal = screen.getByTestId('worklog-modal-dialog');
            expect(modal.getAttribute('data-width')).toBe('280');
            expect(modal.getAttribute('data-height')).toBe('372');
        });

        it('should render ModalBody', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            expect(screen.getByTestId('modal-body')).toBeTruthy();
        });

        it('should render WorklogForm inside ModalBody', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            const modalBody = screen.getByTestId('modal-body');
            const form = screen.getByTestId('worklog-form');
            expect(modalBody.contains(form)).toBeTruthy();
        });

        it('should pass onClose prop to Modal', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            const modal = screen.getByTestId('worklog-modal-dialog');
            expect(modal.getAttribute('data-on-close')).toBe('defined');
        });
    });

    describe('Props Passed to WorklogForm', () => {
        it('should pass default props', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            expect(screen.getByTestId('on-save').textContent).toBe('defined');
            expect(screen.getByTestId('on-cancel').textContent).toBe('defined');
            expect(screen.getByTestId('original-estimate').textContent).toBe('4h');
            expect(screen.getByTestId('worklog-id').textContent).toBe('undefined');
            expect(screen.getByTestId('editing-worklog').textContent).toBe('undefined');
        });

        it('should pass editingWorklog and worklogId when editing', () => {
            render(<WorklogFormDialog {...defaultProps} editingWorklog={mockEditingWorklog} worklogId="worklog-1" />);

            expect(screen.getByTestId('editing-worklog').textContent).toBe('defined');
            expect(screen.getByTestId('worklog-id').textContent).toBe('worklog-1');
        });
    });

    describe('should correctly work with triggerRef', () => {
        it('should pass triggerRef to Modal when provided', () => {
            const triggerRef = React.createRef<HTMLElement>();

            render(<WorklogFormDialog {...defaultProps} triggerRef={triggerRef} />);

            const modal = screen.getByTestId('worklog-modal-dialog');
            expect(modal.getAttribute('data-should-return-focus')).toBe('true');
        });

        it('should handle no triggerRef', () => {
            render(<WorklogFormDialog {...defaultProps} />);

            const modal = screen.getByTestId('worklog-modal-dialog');
            expect(modal.getAttribute('data-should-return-focus')).toBe('false');
        });
    });
});
