import { render, screen } from '@testing-library/react';
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
    repoData: [],
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
});
