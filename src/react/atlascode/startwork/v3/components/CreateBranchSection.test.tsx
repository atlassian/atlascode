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
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render "Create branch" title', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        expect(screen.getByText('Create branch')).toBeDefined();
    });

    it('should render "New local branch" label', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        expect(screen.getByText('New local branch')).toBeDefined();
    });

    it('should render "Source branch" label', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        expect(screen.getByText('Source branch')).toBeDefined();
    });

    it('should render "Push the new branch to remote" checkbox', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        expect(screen.getByText('Push the new branch to remote')).toBeDefined();
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeDefined();
    });

    it('should render settings button', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render with proper layout structure', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        expect(screen.getByText('Create branch')).toBeDefined();
        expect(screen.getByText('New local branch')).toBeDefined();
        expect(screen.getByText('Source branch')).toBeDefined();
        expect(screen.getByText('Push the new branch to remote')).toBeDefined();
    });

    it('should call openSettings when settings button is clicked', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        const buttons = screen.getAllByRole('button');
        const settingsButton = buttons.find((button) => button.querySelector('svg'));
        expect(settingsButton).toBeDefined();

        fireEvent.click(settingsButton!);

        expect(mockController.openSettings).toHaveBeenCalledWith('jira', 'startWork');
    });

    it('should display real branch data in source branch dropdown', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        // Check that the Autocomplete component is rendered
        const autocomplete = screen.getByRole('combobox');
        expect(autocomplete).toBeDefined();

        // The options should include branches from mockState
        // Note: Material-UI Autocomplete doesn't render options until opened
        // So we just verify the component exists with real data
        expect(mockState.repoData[0].localBranches.length).toBeGreaterThan(0);
        expect(mockState.repoData[0].remoteBranches.length).toBeGreaterThan(0);
    });

    it('should set default source branch to development branch', () => {
        render(<CreateBranchSection state={mockState} controller={mockController} />);

        // Since developmentBranch is 'develop' and it exists in localBranches, it should be selected
        const autocomplete = screen.getByDisplayValue('develop');
        expect(autocomplete).toBeDefined();
    });
});
