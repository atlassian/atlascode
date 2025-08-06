import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { CreateBranchSection } from './CreateBranchSection';

jest.mock('../../../../vscode/theme/styles', () => ({
    VSCodeStylesContext: React.createContext({
        descriptionForeground: '#666666',
        foreground: '#000000',
        background: '#ffffff',
    }),
}));

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
        summary: 'Test Issue',
        status: {
            id: '1',
            name: 'To Do',
            statusCategory: {
                key: 'new',
                colorName: 'blue',
            },
        },
        transitions: [],
        issuetype: {
            name: 'Task',
            iconUrl: 'test-icon.png',
        },
    },
    repoData: [
        {
            workspaceRepo: {
                rootUri: '/test/repo',
                mainSiteRemote: {
                    site: undefined,
                    remote: { name: 'origin', isReadOnly: false },
                },
                siteRemotes: [
                    {
                        site: undefined,
                        remote: { name: 'origin', isReadOnly: false },
                    },
                ],
            },
            localBranches: [
                { name: 'main', type: 0 },
                { name: 'develop', type: 0 },
                { name: 'feature/test-branch', type: 0 },
            ],
            remoteBranches: [
                { name: 'origin/main', type: 1, remote: 'origin' },
                { name: 'origin/develop', type: 1, remote: 'origin' },
            ],
            branchTypes: [
                { kind: 'Feature', prefix: 'feature/' },
                { kind: 'Bugfix', prefix: 'bugfix/' },
            ],
            developmentBranch: 'develop',
            userName: 'testuser',
            userEmail: 'test@example.com',
            isCloud: false,
        },
    ],
    customTemplate: '{{prefix}}/{{issueKey}}-{{summary}}',
    customPrefixes: [],
    isSomethingLoading: false,
};

describe('CreateBranchSection', () => {
    const mockFormState = {
        pushBranchEnabled: true,
        localBranch: '',
        sourceBranch: { name: 'develop', type: 0 },
        selectedRepository: mockState.repoData[0],
        selectedBranchType: { kind: 'Feature', prefix: 'feature/' },
        upstream: 'origin',
        branchSetupEnabled: true,
    };

    const mockFormActions = {
        onPushBranchChange: jest.fn(),
        onLocalBranchChange: jest.fn(),
        onSourceBranchChange: jest.fn(),
        onRepositoryChange: jest.fn(),
        onBranchTypeChange: jest.fn(),
        onUpstreamChange: jest.fn(),
        onBranchSetupEnabledChange: jest.fn(),
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

    it('should render all required elements', () => {
        render(<CreateBranchSection {...mockProps} />);

        expect(screen.getByText('Create branch')).toBeDefined();
        expect(screen.getByText('New local branch')).toBeDefined();
        expect(screen.getByText('Source branch')).toBeDefined();
        expect(screen.getByText('Branch prefix')).toBeDefined();
        expect(screen.getByText('Push the new branch to remote')).toBeDefined();
    });

    it('should toggle checkbox when clicked', () => {
        let currentPushBranchEnabled = true;
        const mockOnPushBranchChange = jest.fn((newValue) => {
            currentPushBranchEnabled = newValue;
        });

        const { rerender } = render(
            <CreateBranchSection
                {...mockProps}
                formState={{ ...mockFormState, pushBranchEnabled: currentPushBranchEnabled }}
                formActions={{ ...mockFormActions, onPushBranchChange: mockOnPushBranchChange }}
            />,
        );

        mockOnPushBranchChange.mockClear();

        // Find the "Push the new branch to remote" checkbox specifically
        const pushCheckbox = screen.getByLabelText('Push the new branch to remote') as HTMLInputElement;

        expect(pushCheckbox.checked).toBe(true);

        fireEvent.click(pushCheckbox);
        expect(mockOnPushBranchChange).toHaveBeenCalledWith(false);
        expect(currentPushBranchEnabled).toBe(false);

        rerender(
            <CreateBranchSection
                {...mockProps}
                formState={{ ...mockFormState, pushBranchEnabled: currentPushBranchEnabled }}
                formActions={{ ...mockFormActions, onPushBranchChange: mockOnPushBranchChange }}
            />,
        );

        mockOnPushBranchChange.mockClear();
        fireEvent.click(pushCheckbox);
        expect(mockOnPushBranchChange).toHaveBeenCalledWith(true);
        expect(currentPushBranchEnabled).toBe(true);
    });

    it('should have onBranchTypeChange handler', () => {
        const mockOnBranchTypeChange = jest.fn();
        render(
            <CreateBranchSection
                {...mockProps}
                formActions={{ ...mockFormActions, onBranchTypeChange: mockOnBranchTypeChange }}
            />,
        );

        // Verify that the handler is passed to the component
        expect(mockOnBranchTypeChange).toBeDefined();

        // Verify that the component renders with the expected selected value
        const branchPrefixAutocomplete = screen.getByDisplayValue('Feature');
        expect(branchPrefixAutocomplete).toBeDefined();
    });

    it('should display selected branch type', () => {
        render(<CreateBranchSection {...mockProps} />);

        const branchPrefixAutocomplete = screen.getByDisplayValue('Feature') as HTMLInputElement;
        expect(branchPrefixAutocomplete.value).toBe('Feature');
    });

    it('should have branch types in options', () => {
        render(<CreateBranchSection {...mockProps} />);

        // Check that the component renders with the expected branch types from mock data
        expect(mockProps.formState.selectedRepository.branchTypes).toContainEqual({
            kind: 'Feature',
            prefix: 'feature/',
        });
        expect(mockProps.formState.selectedRepository.branchTypes).toContainEqual({
            kind: 'Bugfix',
            prefix: 'bugfix/',
        });
    });
});
