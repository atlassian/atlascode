import { Status, Transition } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { StatusTransitionMenu } from './StatusTransitionMenu';

describe('StatusTransitionMenu', () => {
    const mockTransitions: Transition[] = [
        {
            name: 'In Progress',
            to: {
                name: 'In Progress',
                statusCategory: {
                    colorName: 'yellow',
                    id: 0,
                    key: '',
                    name: '',
                    self: '',
                },
                description: '',
                iconUrl: '',
                id: '',
                self: '',
            },
            hasScreen: false,
            id: '0',
            isConditional: false,
            isGlobal: false,
            isInitial: false,
        },
        {
            name: 'Done',
            to: {
                name: 'Done',
                statusCategory: {
                    colorName: 'green',
                    id: 0,
                    key: '',
                    name: '',
                    self: '',
                },
                description: '',
                iconUrl: '',
                id: '',
                self: '',
            },
            hasScreen: false,
            id: '1',
            isConditional: false,
            isGlobal: false,
            isInitial: false,
        },
    ];

    const mockCurrentStatus: Status = {
        name: 'To Do',
        statusCategory: {
            colorName: 'blue-gray',
            id: 0,
            key: '',
            name: '',
            self: '',
        },
        description: '',
        iconUrl: '',
        id: '2',
        self: '',
    };

    const mockOnStatusChange = jest.fn();

    it('renders the current status name', () => {
        const { getByText } = render(
            <StatusTransitionMenu
                transitions={mockTransitions}
                currentStatus={mockCurrentStatus}
                isStatusButtonLoading={false}
                onStatusChange={mockOnStatusChange}
            />,
        );

        expect(getByText('To Do')).toBeTruthy();
    });

    it('displays the dropdown menu when clicked', () => {
        const { getByText, queryByText } = render(
            <StatusTransitionMenu
                transitions={mockTransitions}
                currentStatus={mockCurrentStatus}
                isStatusButtonLoading={false}
                onStatusChange={mockOnStatusChange}
            />,
        );

        fireEvent.click(getByText('To Do'));
        expect(queryByText('In Progress')).toBeTruthy();
        expect(queryByText('Done')).toBeTruthy();
    });

    it('calls onStatusChange when a transition is selected', () => {
        const { getByText } = render(
            <StatusTransitionMenu
                transitions={mockTransitions}
                currentStatus={mockCurrentStatus}
                isStatusButtonLoading={false}
                onStatusChange={mockOnStatusChange}
            />,
        );

        fireEvent.click(getByText('To Do'));
        fireEvent.click(getByText('In Progress'));

        expect(mockOnStatusChange).toHaveBeenCalledWith(mockTransitions[0]);
    });

    it('displays the transition name if it differs from the target status name', () => {
        const transitionsWithDifferentNames: Transition[] = [
            {
                name: 'Start Progress',
                to: {
                    name: 'In Progress',
                    statusCategory: {
                        colorName: 'yellow',
                        id: 0,
                        key: '',
                        name: '',
                        self: '',
                    },
                    description: '',
                    iconUrl: '',
                    id: '',
                    self: '',
                },
                hasScreen: false,
                id: '',
                isConditional: false,
                isGlobal: false,
                isInitial: false,
            },
        ];

        const { getByText } = render(
            <StatusTransitionMenu
                transitions={transitionsWithDifferentNames}
                currentStatus={mockCurrentStatus}
                isStatusButtonLoading={false}
                onStatusChange={mockOnStatusChange}
            />,
        );

        fireEvent.click(getByText('To Do'));
        expect(getByText('Start Progress →')).toBeTruthy();
        expect(getByText('In Progress')).toBeTruthy();
    });

    it('Renders the dropdown arrow icon next to the current status', () => {
        const { getByRole } = render(
            <StatusTransitionMenu
                transitions={mockTransitions}
                currentStatus={mockCurrentStatus}
                isStatusButtonLoading={false}
                onStatusChange={mockOnStatusChange}
            />,
        );

        const statusButton = getByRole('button', { name: 'To Do Status' });
        expect(statusButton).toHaveProperty('disabled', false);
        expect(getByRole('img', { name: 'Status' })).toBeTruthy();
    });

    it('disables dropdown when there are no transitions', () => {
        const { getByRole } = render(
            <StatusTransitionMenu
                transitions={[]}
                currentStatus={mockCurrentStatus}
                isStatusButtonLoading={false}
                onStatusChange={mockOnStatusChange}
            />,
        );
        const statusButton = getByRole('button', { name: 'To Do' });
        expect(statusButton).toHaveProperty('disabled', true);
    });
});
