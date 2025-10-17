import { render, screen } from '@testing-library/react';
import React from 'react';

import StartWorkPageV3 from './StartWorkPageV3';

jest.mock('../startWorkController', () => ({
    useStartWorkController: jest.fn(),
    StartWorkControllerContext: React.createContext({}),
}));

jest.mock('./hooks/useStartWorkFormState', () => ({
    useStartWorkFormState: jest.fn(),
}));

jest.mock('../../common/errorController', () => ({
    ErrorStateContext: React.createContext({ isErrorBannerOpen: false }),
    ErrorControllerContext: React.createContext({}),
}));

jest.mock('src/analyticsTypes', () => ({
    AnalyticsView: {
        StartWorkPageV3: 'StartWorkPageV3',
    },
}));

jest.mock('../../common/ErrorBoundary', () => ({
    AtlascodeErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

jest.mock('../../common/ErrorDisplay', () => ({
    ErrorDisplay: () => <div data-testid="error-display">Error Display</div>,
}));

// Mock all components used in StartWorkPageV3
jest.mock('./components', () => ({
    CreateBranchSection: () => <div data-testid="create-branch-section">Create Branch Section</div>,
    RovoDevToggle: () => <div data-testid="rovo-dev-toggle">Rovo Dev Toggle</div>,
    SnackbarNotification: () => <div data-testid="snackbar-notification">Snackbar</div>,
    SuccessAlert: () => <div data-testid="success-alert">Success Alert</div>,
    TaskInfoSection: () => <div data-testid="task-info-section">Task Info Section</div>,
    UpdateStatusSection: () => <div data-testid="update-status-section">Update Status Section</div>,
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

const mockState = {
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
    isRovoDevEnabled: true,
    rovoDevPreference: false,
};

describe('StartWorkPageV3', () => {
    const mockUseStartWorkController = require('../startWorkController').useStartWorkController;
    const mockUseStartWorkFormState = require('./hooks/useStartWorkFormState').useStartWorkFormState;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUseStartWorkController.mockReturnValue([mockState, mockController]);
    });

    it('should display "Create branch" button text when branchSetupEnabled is true', () => {
        mockUseStartWorkFormState.mockReturnValue({
            formState: {
                branchSetupEnabled: true,
                startWithRovoDev: false,
            },
            formActions: {},
            updateStatusFormState: {},
            updateStatusFormActions: {},
            handleCreateBranch: jest.fn(),
            handleSnackbarClose: jest.fn(),
            submitState: 'initial',
            submitResponse: {},
            snackbarOpen: false,
        });

        render(<StartWorkPageV3 />);

        const button = screen.getByRole('button', { name: 'Create branch' });
        expect(button).toBeDefined();
    });

    it('should display "Start work" button text when branchSetupEnabled is false', () => {
        mockUseStartWorkFormState.mockReturnValue({
            formState: {
                branchSetupEnabled: false,
                startWithRovoDev: false,
            },
            formActions: {},
            updateStatusFormState: {},
            updateStatusFormActions: {},
            handleCreateBranch: jest.fn(),
            handleSnackbarClose: jest.fn(),
            submitState: 'initial',
            submitResponse: {},
            snackbarOpen: false,
        });

        render(<StartWorkPageV3 />);

        const button = screen.getByRole('button', { name: 'Start work' });
        expect(button).toBeDefined();
    });
});
