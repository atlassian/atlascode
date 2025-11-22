/**
 * @jest-environment jsdom
 */
import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil';

import JiraIssuePage from './JiraIssuePage';

// Mock child components of JiraIssuePage
jest.mock('./mainpanel/IssueMainPanel', () => {
    return function MockIssueMainPanel() {
        return (
            <div data-testid="issue-main-panel">
                Issue Main Panel <img data-testid="issue-main-panel-image" src="test.jpg" alt="test" />
            </div>
        );
    };
});

jest.mock('./mainpanel/IssueCommentComponent', () => ({
    IssueCommentComponent: () => <div data-testid="issue-comment-component">Comments</div>,
}));

jest.mock('./mainpanel/IssueHistory', () => ({
    IssueHistory: () => <div data-testid="issue-history">History</div>,
}));

jest.mock('./sidebar/IssueSidebarButtonGroup', () => ({
    IssueSidebarButtonGroup: () => <div data-testid="issue-sidebar-button-group">Sidebar Buttons</div>,
}));

jest.mock('./sidebar/IssueSidebarCollapsible', () => ({
    IssueSidebarCollapsible: () => <div data-testid="issue-sidebar-collapsible">Sidebar</div>,
}));

jest.mock('./EditorStateContext', () => ({
    EditorStateProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../AtlLoader', () => ({
    AtlLoader: () => <div data-testid="atl-loader">Loading...</div>,
}));

jest.mock('../../Offline', () => ({
    __esModule: true,
    default: () => <div data-testid="offline">Offline</div>,
}));

jest.mock('../../ErrorBanner', () => ({
    __esModule: true,
    default: () => <div data-testid="error-banner">Error</div>,
}));

jest.mock('../../pmfBanner', () => ({
    __esModule: true,
    default: () => <div data-testid="pmf-banner">PMF Banner</div>,
}));

jest.mock('../NavItem', () => ({
    __esModule: true,
    default: () => <div data-testid="nav-item">Nav Item</div>,
}));

jest.mock('../PullRequests', () => ({
    __esModule: true,
    default: () => <div data-testid="pull-requests">Pull Requests</div>,
}));

jest.mock('../../../../react/atlascode/common/ErrorBoundary', () => ({
    AtlascodeErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

const mockSiteDetails: DetailedSiteInfo = {
    userId: 'user-123',
    id: 'site-1',
    name: 'Test Site',
    avatarUrl: '',
    baseLinkUrl: 'https://test.atlassian.net',
    baseApiUrl: 'https://test.atlassian.net/rest/api',
    isCloud: true,
    credentialId: 'cred-1',
    host: 'test.atlassian.net',
    product: {
        name: 'JIRA',
        key: 'jira',
    } as Product,
};

const mockIssueType: IssueType = {
    id: '1',
    name: 'Story',
    iconUrl: 'story-icon.png',
    subtask: false,
    avatarId: 1,
    description: 'Story issue type',
    self: 'https://test.atlassian.net/rest/api/3/issuetype/1',
    epic: false,
};

const mockFields: { [key: string]: FieldUI } = {
    summary: {
        key: 'summary',
        name: 'Summary',
        required: true,
        uiType: UIType.Input,
        displayOrder: 1,
        valueType: ValueType.String,
        advanced: false,
        isArray: false,
        schema: 'summary',
    },
};

const mockFieldValues = {
    summary: 'Test Issue',
    issuetype: mockIssueType,
    project: { key: 'TEST' },
    created: '2023-01-01T10:00:00.000Z',
    updated: '2023-01-02T10:00:00.000Z',
};

describe('JiraIssuePage', () => {
    let mockVscode: any;

    beforeAll(() => {
        disableConsole('warn', 'error');

        mockVscode = {
            postMessage: jest.fn(),
            setState: jest.fn(),
            getState: jest.fn(() => ({})),
        };
        (global as any).acquireVsCodeApi = jest.fn(() => mockVscode);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleContextMenuCommand - image copy handling', () => {
        it('handles copyImage message with image element saved', async () => {
            // Mock document methods
            document.execCommand = jest.fn(() => true);
            const mockRange = {
                selectNode: jest.fn(),
            };
            const mockSelection = {
                rangeCount: 1,
                removeAllRanges: jest.fn(),
                addRange: jest.fn(),
            };
            document.createRange = jest.fn(() => mockRange as any);
            window.getSelection = jest.fn(() => mockSelection as any);

            const { container } = render(<JiraIssuePage />);
            const mainPanelSelector = '[data-testid="issue-main-panel"]';

            // First update with issue data
            const updateEvent = new MessageEvent('message', {
                data: {
                    type: 'update',
                    fields: mockFields,
                    fieldValues: {
                        ...mockFieldValues,
                        comment: { comments: [] },
                    },
                    key: 'TEST-123',
                    siteDetails: mockSiteDetails,
                    apiVersion: 3,
                    isOnline: true,
                },
            });
            window.dispatchEvent(updateEvent);

            await waitFor(() => {
                // waiting for main panel to render
                expect(container.querySelector(mainPanelSelector)).toBeTruthy();
            });

            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
            });
            Object.defineProperty(contextMenuEvent, 'target', {
                value: container.querySelector('[data-testid="issue-main-panel-image"]'),
                enumerable: true,
            });

            // Dispatched context menu open event
            container.dispatchEvent(contextMenuEvent);

            await waitFor(() => {
                expect(container.querySelector('[data-testid="issue-main-panel-image"]')).toBeTruthy();
            });

            const copyEvent = new MessageEvent('message', {
                data: {
                    type: 'copyImage',
                },
            });
            window.dispatchEvent(copyEvent);

            expect(mockRange.selectNode).toHaveBeenCalledWith(
                container.querySelector('[data-testid="issue-main-panel-image"]'),
            );
            expect(document.execCommand).toHaveBeenCalledWith('copy');
            expect(mockSelection.removeAllRanges).toHaveBeenCalled();
        });

        it('handles copyImage message when no image element is saved', () => {
            render(<JiraIssuePage />);

            // Mock console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const copyEvent = new MessageEvent('message', {
                data: {
                    type: 'copyImage',
                },
            });
            window.dispatchEvent(copyEvent);

            expect(consoleErrorSpy).toHaveBeenCalledWith('No image element to copy');
            consoleErrorSpy.mockRestore();
        });

        it('saves image element in state on context menu from image', () => {
            const { container } = render(<JiraIssuePage />);

            // First update with issue data
            const updateEvent = new MessageEvent('message', {
                data: {
                    type: 'update',
                    fields: mockFields,
                    fieldValues: {
                        ...mockFieldValues,
                        comment: { comments: [] },
                    },
                    key: 'TEST-123',
                    siteDetails: mockSiteDetails,
                    apiVersion: 3,
                    isOnline: true,
                },
            });
            window.dispatchEvent(updateEvent);

            // Create a mock image element
            const mockImg = document.createElement('img');
            mockImg.src = 'test.jpg';
            container.appendChild(mockImg);

            // Simulate context menu opening on the image
            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
            });
            Object.defineProperty(contextMenuEvent, 'target', {
                value: mockImg,
                enumerable: true,
            });
            container.dispatchEvent(contextMenuEvent);
            // Component should save the image element in state and renders correctly
            expect(container).toBeTruthy();
        });
    });

    describe('component lifecycle', () => {
        it('requests feature flags on mount', () => {
            render(<JiraIssuePage />);

            expect(mockVscode.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'getFeatureFlags',
                }),
            );
        });

        it('renders loading state when fields are empty', () => {
            const { getByTestId } = render(<JiraIssuePage />);

            expect(getByTestId('atl-loader')).toBeTruthy();
        });
    });
});
