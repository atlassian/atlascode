import { render, screen } from '@testing-library/react';
import React from 'react';

import { TaskInfoSection } from './TaskInfoSection';

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

describe('TaskInfoSection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render "For" label', () => {
        render(<TaskInfoSection state={mockState} controller={mockController} />);

        expect(screen.getByText('For')).toBeDefined();
    });

    it('should render issue key as link', () => {
        render(<TaskInfoSection state={mockState} controller={mockController} />);

        const link = screen.getByText('TEST-123');
        expect(link).toBeDefined();
    });

    it('should render issue summary', () => {
        render(<TaskInfoSection state={mockState} controller={mockController} />);

        expect(screen.getByText('Test Issue Summary')).toBeDefined();
    });

    it('should render issue type icon', () => {
        render(<TaskInfoSection state={mockState} controller={mockController} />);

        const icon = screen.getByTitle('Task');
        expect(icon).toBeDefined();
    });

    it('should call openJiraIssue when link is clicked', () => {
        render(<TaskInfoSection state={mockState} controller={mockController} />);

        const link = screen.getByText('TEST-123');
        link.click();

        expect(mockController.openJiraIssue).toHaveBeenCalledTimes(1);
    });

    it('should render with proper layout structure', () => {
        render(<TaskInfoSection state={mockState} controller={mockController} />);

        expect(screen.getByText('For')).toBeDefined();
        expect(screen.getByText('TEST-123')).toBeDefined();
        expect(screen.getByText('Test Issue Summary')).toBeDefined();
        expect(screen.getByTitle('Task')).toBeDefined();
    });
});
