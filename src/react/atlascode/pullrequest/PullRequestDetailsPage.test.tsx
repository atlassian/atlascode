import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AnalyticsView } from 'src/analyticsTypes';
import { AtlascodeMentionProvider } from 'src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider';

import { ApprovalStatus, User } from '../../../bitbucket/model';
import {
    PullRequestDetailsControllerApi,
    PullRequestDetailsState,
    usePullRequestDetailsController,
} from './pullRequestDetailsController';
import { PullRequestDetailsPage } from './PullRequestDetailsPage';

// Mock the controller hook
jest.mock('./pullRequestDetailsController', () => ({
    usePullRequestDetailsController: jest.fn(),
    PullRequestDetailsControllerContext: React.createContext({}),
}));

// Mock dependent components
jest.mock('./PullRequestHeader', () => ({
    PullRequestHeader: ({ state }: any) => (
        <div data-testid="pull-request-header">
            <div data-testid="pr-id">{state.pr.data.id}</div>
            <div data-testid="pr-title">{state.pr.data.title}</div>
        </div>
    ),
}));

jest.mock('./PullRequestMainContent', () => ({
    PullRequestMainContent: ({ handleFetchUsers, mentionsProvider }: any) => (
        <div data-testid="pull-request-main-content">
            <div data-testid="has-fetch-users">{handleFetchUsers ? 'yes' : 'no'}</div>
            <div data-testid="has-mentions-provider">{mentionsProvider ? 'yes' : 'no'}</div>
        </div>
    ),
}));

jest.mock('./PullRequestSideBar', () => ({
    PullRequestSidebar: ({ state }: any) => (
        <div data-testid="pull-request-sidebar">
            <div data-testid="approval-status">{state.pr.data.approvalStatus}</div>
        </div>
    ),
}));

jest.mock('./BranchInfo', () => ({
    BranchInfo: ({ source, destination, author, isLoading }: any) => (
        <div data-testid="branch-info">
            <div data-testid="source-branch">{source.branchName}</div>
            <div data-testid="destination-branch">{destination.branchName}</div>
            <div data-testid="author-name">{author.displayName}</div>
            <div data-testid="is-loading">{isLoading ? 'yes' : 'no'}</div>
        </div>
    ),
}));

// Mock ErrorBoundary
jest.mock('../common/ErrorBoundary', () => ({
    AtlascodeErrorBoundary: ({ children, context }: any) => (
        <div data-testid="error-boundary" data-context={context?.view}>
            {children}
        </div>
    ),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
    Container: ({ children }: any) => <div data-testid="container">{children}</div>,
    Box: ({ children }: any) => <div data-testid="box">{children}</div>,
    Grid: ({ children, container, item, xs, md }: any) => (
        <div data-testid={container ? 'grid-container' : item ? 'grid-item' : 'grid'} data-xs={xs} data-md={md}>
            {children}
        </div>
    ),
    Divider: () => <div data-testid="divider" />,
    Button: ({ children, disabled, onClick }: any) => (
        <button data-testid="button" disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
    Typography: ({ children }: any) => <span data-testid="typography">{children}</span>,
    useTheme: jest.fn(() => ({ breakpoints: { up: jest.fn(() => true) } })),
    useMediaQuery: jest.fn(() => true),
    Paper: ({ children }: any) => <div data-testid="paper">{children}</div>,
}));

jest.mock('@mui/styles', () => ({
    makeStyles: jest.fn(() => () => ({})),
}));

jest.mock('@atlassianlabs/guipi-core-components', () => ({
    InlineTextEditor: ({ defaultValue, onSave }: any) => (
        <div data-testid="inline-text-editor" data-default-value={defaultValue}>
            <button onClick={() => onSave && onSave('Updated Title')} data-testid="save-title">
                Save
            </button>
        </div>
    ),
}));

// jest.mock('@atlaskit/tokens', () => ({ setGlobalTheme: jest.fn() }));
jest.mock('src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider', () => ({
    AtlascodeMentionProvider: {
        init: jest.fn(() => ({ filter: jest.fn(), recordMentionSelection: jest.fn() })),
    },
}));
jest.mock('awesome-debounce-promise', () => jest.fn((fn) => fn));

describe('PullRequestDetailsPage', () => {
    const mockUser: User = {
        accountId: 'user1',
        displayName: 'Test User',
        avatarUrl: 'avatar.jpg',
        url: 'https://user1.com',
        mention: '@testuser',
    };

    const createMockState = (): PullRequestDetailsState =>
        ({
            pr: {
                site: {
                    details: { isCloud: true, baseApiUrl: 'https://api.bitbucket.org' },
                    ownerSlug: 'owner',
                    repoSlug: 'repo',
                },
                data: {
                    id: '123',
                    title: 'Test Pull Request',
                    url: 'https://bitbucket.org/owner/repo/pull-requests/123',
                    author: mockUser,
                    source: { branchName: 'feature-branch', repo: { displayName: 'Test Repo' } },
                    destination: { branchName: 'main', repo: { displayName: 'Test Repo' } },
                    approvalStatus: 'UNAPPROVED' as ApprovalStatus,
                    state: 'OPEN',
                },
            },
            loadState: { basicData: false },
            currentBranchName: 'main',
            workspaceRepo: { mainSiteRemote: { remote: { name: 'origin' } }, siteRemotes: [] },
            isCheckingOutBranch: false,
        }) as any;

    const createMockController = (): PullRequestDetailsControllerApi =>
        ({
            postMessage: jest.fn(),
            refresh: jest.fn(),
            fetchUsers: jest.fn().mockResolvedValue([mockUser]),
            updateTitle: jest.fn(),
            checkoutBranch: jest.fn(),
        }) as any;

    beforeEach(() => {
        jest.clearAllMocks();
        (usePullRequestDetailsController as jest.Mock).mockReturnValue([createMockState(), createMockController()]);
    });

    describe('Component Rendering', () => {
        it('renders the main structure correctly', () => {
            render(<PullRequestDetailsPage />);

            expect(screen.getByTestId('error-boundary')).toBeTruthy();
            expect(screen.getByTestId('container')).toBeTruthy();
            expect(screen.getByTestId('pull-request-header')).toBeTruthy();
            expect(screen.getByTestId('pull-request-main-content')).toBeTruthy();
            expect(screen.getByTestId('pull-request-sidebar')).toBeTruthy();
        });

        it('renders error boundary with correct context', () => {
            render(<PullRequestDetailsPage />);

            const errorBoundary = screen.getByTestId('error-boundary');
            expect(errorBoundary.getAttribute('data-context')).toBe(AnalyticsView.PullRequestPage);
        });

        it('renders title editor', () => {
            render(<PullRequestDetailsPage />);

            const titleEditor = screen.getByTestId('inline-text-editor');
            expect(titleEditor).toBeTruthy();
            expect(titleEditor.getAttribute('data-default-value')).toBe('Test Pull Request');
        });

        it('renders branch info', () => {
            render(<PullRequestDetailsPage />);

            expect(screen.getByTestId('branch-info')).toBeTruthy();
            expect(screen.getByTestId('source-branch').textContent).toBe('feature-branch');
            expect(screen.getByTestId('destination-branch').textContent).toBe('main');
            expect(screen.getByTestId('author-name').textContent).toBe('Test User');
        });
    });

    describe('Props Passing', () => {
        it('passes correct props to child components', () => {
            render(<PullRequestDetailsPage />);

            expect(screen.getByTestId('pr-id').textContent).toBe('123');
            expect(screen.getByTestId('pr-title').textContent).toBe('Test Pull Request');
            expect(screen.getByTestId('has-fetch-users').textContent).toBe('yes');
            expect(screen.getByTestId('has-mentions-provider').textContent).toBe('yes');
            expect(screen.getByTestId('approval-status').textContent).toBe('UNAPPROVED');
        });
    });

    describe('Title Editing', () => {
        it('calls updateTitle when title is saved', async () => {
            const user = userEvent.setup();
            const mockController = createMockController();
            (usePullRequestDetailsController as jest.Mock).mockReturnValue([createMockState(), mockController]);

            render(<PullRequestDetailsPage />);

            const saveButton = screen.getByTestId('save-title');
            await user.click(saveButton);

            expect(mockController.updateTitle).toHaveBeenCalledWith('Updated Title');
        });
    });

    describe('User Mentions Provider', () => {
        it('initializes mentions provider when site details are available', () => {
            render(<PullRequestDetailsPage />);

            expect(AtlascodeMentionProvider.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '',
                    isBitbucketCloud: true,
                    mentionNameResolver: expect.any(Object),
                }),
                expect.any(Function),
            );
        });
    });

    describe('Loading States', () => {
        it('passes loading state to branch info', () => {
            const state = createMockState();
            state.loadState.basicData = true;
            (usePullRequestDetailsController as jest.Mock).mockReturnValue([state, createMockController()]);

            render(<PullRequestDetailsPage />);

            expect(screen.getByTestId('is-loading').textContent).toBe('yes');
        });
    });

    describe('Theme Integration', () => {
        it('sets up theme observer on mount', () => {
            const mockObserver = {
                observe: jest.fn(),
                disconnect: jest.fn(),
                takeRecords: jest.fn().mockReturnValue([]),
            };
            (global as any).MutationObserver = jest.fn(() => mockObserver);

            render(<PullRequestDetailsPage />);

            expect(MutationObserver).toHaveBeenCalled();
            expect(mockObserver.observe).toHaveBeenCalledWith(document.body, {
                attributes: true,
                attributeFilter: ['class'],
            });
        });
    });

    describe('Error Handling', () => {
        it('handles missing PR data gracefully', () => {
            const state = createMockState();
            state.pr.data.id = '';
            state.pr.data.title = '';
            (usePullRequestDetailsController as jest.Mock).mockReturnValue([state, createMockController()]);

            expect(() => render(<PullRequestDetailsPage />)).not.toThrow();
        });
    });
});
