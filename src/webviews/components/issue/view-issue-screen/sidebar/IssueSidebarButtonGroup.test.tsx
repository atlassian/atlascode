import { Transition, User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUIs, FieldValues, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { IssueSidebarButtonGroup } from './IssueSidebarButtonGroup';

describe('IssueSidebarButtonGroup', () => {
    const mockHandleRefresh = jest.fn();
    const mockHandleAddWatcher = jest.fn();
    const mockHandleRemoveWatcher = jest.fn();
    const mockHandleAddVote = jest.fn();
    const mockHandleRemoveVote = jest.fn();
    const mockHandleInlineEdit = jest.fn();
    const mockFetchUsers = jest.fn();
    const mockHandleStatusChange = jest.fn();
    const mockHandleStartWork = jest.fn();

    const defaultProps = {
        handleRefresh: mockHandleRefresh,
        handleAddWatcher: mockHandleAddWatcher,
        handleRemoveWatcher: mockHandleRemoveWatcher,
        handleAddVote: mockHandleAddVote,
        handleRemoveVote: mockHandleRemoveVote,
        handleInlineEdit: mockHandleInlineEdit,
        currentUser: { accountId: 'user-1' } as User,
        fields: {} as FieldUIs,
        fieldValues: {} as FieldValues,
        loadingField: '',
        fetchUsers: mockFetchUsers,
        handleStatusChange: mockHandleStatusChange,
        handleStartWork: mockHandleStartWork,
        transitions: [] as Transition[],
    };

    it('renders without crashing', () => {
        const { getByText } = render(<IssueSidebarButtonGroup {...defaultProps} />);
        expect(getByText('Start work')).toBeTruthy();
    });

    it('calls handleRefresh when the refresh button is clicked', () => {
        const { getByLabelText } = render(<IssueSidebarButtonGroup {...defaultProps} />);
        const refreshButton = getByLabelText('refresh');
        fireEvent.click(refreshButton);
        expect(mockHandleRefresh).toHaveBeenCalled();
    });

    it('calls handleStartWork when the start work button is clicked', () => {
        const { getByText } = render(<IssueSidebarButtonGroup {...defaultProps} />);
        const startWorkButton = getByText('Start work');
        fireEvent.click(startWorkButton);
        expect(mockHandleStartWork).toHaveBeenCalled();
    });

    it('work log button is visible', () => {
        const { getByLabelText } = render(
            <IssueSidebarButtonGroup
                {...defaultProps}
                fields={{
                    worklog: {
                        required: false,
                        name: '',
                        key: '',
                        uiType: UIType.Select,
                        advanced: false,
                        valueType: ValueType.String,
                        displayOrder: 0,
                        isArray: false,
                        schema: '',
                    },
                }}
                fieldValues={{ timetracking: { originalEstimate: '1h' } }}
            />,
        );
        expect(getByLabelText('Log Work')).toBeTruthy();
    });

    it('watches button is visible', () => {
        const { getByLabelText } = render(
            <IssueSidebarButtonGroup
                {...defaultProps}
                fields={{
                    watches: {
                        required: false,
                        name: '',
                        key: '',
                        uiType: UIType.Select,
                        advanced: false,
                        valueType: ValueType.String,
                        displayOrder: 0,
                        isArray: false,
                        schema: '',
                    },
                }}
                fieldValues={{ watches: { watchCount: 5, isWatching: false } }}
            />,
        );
        expect(getByLabelText('Watches')).toBeTruthy();
    });

    it('votes button is visible', () => {
        const { getByLabelText } = render(
            <IssueSidebarButtonGroup
                {...defaultProps}
                fields={{
                    votes: {
                        required: false,
                        name: '',
                        key: '',
                        uiType: UIType.Select,
                        advanced: false,
                        valueType: ValueType.String,
                        displayOrder: 0,
                        isArray: false,
                        schema: '',
                    },
                }}
                fieldValues={{ votes: { votes: 3, hasVoted: false } }}
            />,
        );
        expect(getByLabelText('Votes')).toBeTruthy();
    });
});
