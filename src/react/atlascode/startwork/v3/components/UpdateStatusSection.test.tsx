import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { UpdateStatusSection } from './UpdateStatusSection';

const mockController = {
    postMessage: jest.fn(),
    refresh: jest.fn(),
    openLink: jest.fn(),
    startWork: jest.fn(),
    closePage: jest.fn(),
    openJiraIssue: jest.fn(),
    openSettings: jest.fn(),
};

const mockState: any = {
    issue: {
        key: 'TEST-123',
        summary: 'Test Issue Summary',
        status: {
            id: '1',
            name: 'To Do',
            statusCategory: {
                key: 'new',
                colorName: 'blue',
            },
        },
        transitions: [
            {
                id: 'transition-1',
                name: 'Start Progress',
                to: {
                    id: '2',
                    name: 'In Progress',
                    statusCategory: {
                        key: 'indeterminate',
                        colorName: 'yellow',
                    },
                },
                isInitial: false,
            },
            {
                id: 'transition-2',
                name: 'Done',
                to: {
                    id: '3',
                    name: 'Done',
                    statusCategory: {
                        key: 'done',
                        colorName: 'green',
                    },
                },
                isInitial: false,
            },
        ],
        issuetype: {
            name: 'Task',
            iconUrl: 'test-icon.png',
        },
    },
    repoData: [],
    customTemplate: '{{prefix}}/{{issueKey}}-{{summary}}',
    customPrefixes: [],
    isSomethingLoading: false,
};

describe('UpdateStatusSection', () => {
    const mockFormState = {
        transitionIssueEnabled: true,
        selectedTransition: mockState.issue.transitions[0],
    };

    const mockFormActions = {
        onTransitionIssueEnabledChange: jest.fn(),
        onSelectedTransitionChange: jest.fn(),
    };

    const mockProps = {
        state: mockState,
        controller: mockController,
        formState: mockFormState,
        formActions: mockFormActions,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render "Update work item status" title', () => {
        render(<UpdateStatusSection {...mockProps} />);

        expect(screen.getByText('Update work item status')).toBeDefined();
    });

    it('should render current status lozenge', () => {
        render(<UpdateStatusSection {...mockProps} />);

        expect(screen.getByText('To Do')).toBeDefined();
    });

    it('should render checkbox as checked by default', () => {
        render(<UpdateStatusSection {...mockProps} />);

        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    it('should toggle checkbox when clicked', () => {
        let transitionIssueEnabled = true;
        const mockOnTransitionIssueEnabledChange = jest.fn((enabled) => {
            transitionIssueEnabled = enabled;
        });

        const { rerender } = render(
            <UpdateStatusSection
                {...mockProps}
                formState={{ ...mockFormState, transitionIssueEnabled }}
                formActions={{ ...mockFormActions, onTransitionIssueEnabledChange: mockOnTransitionIssueEnabledChange }}
            />,
        );

        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;

        // Initially checked
        expect(checkbox.checked).toBe(true);

        // Click to uncheck
        fireEvent.click(checkbox);
        expect(mockOnTransitionIssueEnabledChange).toHaveBeenCalledWith(false);

        // Rerender with updated state
        rerender(
            <UpdateStatusSection
                {...mockProps}
                formState={{ ...mockFormState, transitionIssueEnabled: false }}
                formActions={{ ...mockFormActions, onTransitionIssueEnabledChange: mockOnTransitionIssueEnabledChange }}
            />,
        );

        // Click to check again
        fireEvent.click(checkbox);
        expect(mockOnTransitionIssueEnabledChange).toHaveBeenCalledWith(true);
    });

    it('should render transition dropdown', () => {
        render(<UpdateStatusSection {...mockProps} />);

        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeDefined();
    });

    it('should select in-progress transition by default', () => {
        render(<UpdateStatusSection {...mockProps} />);

        // The component should select the "In Progress" transition by default
        // because it contains "progress" in the name
        expect(screen.getByDisplayValue('transition-1')).toBeDefined();
    });

    it('should handle transition change', () => {
        render(<UpdateStatusSection {...mockProps} />);

        const dropdown = screen.getByRole('combobox');
        fireEvent.mouseDown(dropdown);

        expect(screen.getByText('Done')).toBeDefined();
    });

    it('should render with proper layout structure', () => {
        render(<UpdateStatusSection {...mockProps} />);

        expect(screen.getByText('Update work item status')).toBeDefined();
        expect(screen.getByText('To Do')).toBeDefined();
        expect(screen.getByRole('checkbox')).toBeDefined();
        expect(screen.getByRole('combobox')).toBeDefined();
    });
});
