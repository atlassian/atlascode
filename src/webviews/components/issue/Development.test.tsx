import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { Development, DevelopmentInfo } from './Development';

describe('Development Component', () => {
    const mockOnOpenPullRequest = jest.fn();
    const mockOnOpenExternalUrl = jest.fn();

    const mockDevelopmentInfo: DevelopmentInfo = {
        branches: [
            { name: 'feature-branch-1', url: 'https://bitbucket.org/repo/branch/feature-branch-1' },
            { name: 'feature-branch-2', url: 'https://bitbucket.org/repo/branch/feature-branch-2' },
        ],
        commits: [
            {
                hash: 'abc123',
                message: 'Fix: Update feature',
                authorName: 'John Doe',
                url: 'https://bitbucket.org/repo/commits/abc123',
            },
            {
                hash: 'def456',
                message: 'Add: New functionality',
                authorName: 'Jane Smith',
                url: 'https://bitbucket.org/repo/commits/def456',
            },
        ],
        pullRequests: [
            {
                id: '1',
                title: 'Feature implementation',
                url: 'https://bitbucket.org/repo/pull-requests/1',
                state: 'OPEN',
            },
        ],
        builds: [
            {
                name: 'Build #123',
                key: '123',
                state: 'SUCCESSFUL',
                url: 'https://bitbucket.org/repo/builds/123',
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should not render when there is no development data', () => {
            const emptyInfo: DevelopmentInfo = {
                branches: [],
                commits: [],
                pullRequests: [],
                builds: [],
            };

            const { container } = render(
                <Development
                    developmentInfo={emptyInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(container.firstChild).toBeNull();
        });

        it('should render summary text with correct counts', () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(screen.getByText('2 branches, 2 commits, 1 pull request, 1 build')).toBeTruthy();
        });

        it('should render singular labels for single items', () => {
            const singleItemInfo: DevelopmentInfo = {
                branches: [{ name: 'main', url: 'https://bitbucket.org/repo/branch/main' }],
                commits: [],
                pullRequests: [],
                builds: [],
            };

            render(
                <Development
                    developmentInfo={singleItemInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(screen.getByText('1 branch')).toBeTruthy();
        });

        it('should render plural labels for multiple items', () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(screen.getByText('2 branches, 2 commits, 1 pull request, 1 build')).toBeTruthy();
        });
    });

    describe('Expand/Collapse Behavior', () => {
        it('should start collapsed by default', () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(screen.queryByText('2 branches')).not.toBeTruthy();
            expect(screen.queryByText('2 commits')).not.toBeTruthy();
        });

        it('should expand when chevron is clicked', () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const buttons = screen.getAllByRole('button');
            const branchButton = buttons.find((btn) => btn.textContent?.includes('2 branches'));
            expect(branchButton).toBeTruthy();

            const commitButton = buttons.find((btn) => btn.textContent?.includes('2 commits'));
            expect(commitButton).toBeTruthy();

            const prButton = buttons.find((btn) => btn.textContent?.includes('1 pull request'));
            expect(prButton).toBeTruthy();

            const buildButton = buttons.find((btn) => btn.textContent?.includes('1 build'));
            expect(buildButton).toBeTruthy();
        });

        it('should expand when summary text is clicked', () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const summaryText = screen.getByText('2 branches, 2 commits, 1 pull request, 1 build');
            fireEvent.click(summaryText);

            const buttons = screen.getAllByRole('button');
            const branchButton = buttons.find((btn) => btn.textContent?.includes('2 branches'));
            expect(branchButton).toBeTruthy();
        });

        it('should collapse when clicked again', () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');

            fireEvent.click(chevronButton);
            const buttons = screen.getAllByRole('button');
            const branchButton = buttons.find((btn) => btn.textContent?.includes('2 branches'));
            expect(branchButton).toBeTruthy();

            fireEvent.click(chevronButton);
            const branchButtonsAfterCollapse = screen.queryAllByText((content, element) => {
                return element?.textContent === '2 branches' && element.tagName === 'BUTTON';
            });
            expect(branchButtonsAfterCollapse.length).toBe(0);
        });
    });

    describe('Modal Behavior', () => {
        it('should open branches modal when branches item is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const buttons = screen.getAllByRole('button');
            const branchesButton = buttons.find((btn) => btn.textContent?.includes('2 branches'))!;
            fireEvent.click(branchesButton);

            await waitFor(() => {
                expect(screen.getByText('Branches (2)')).toBeTruthy();
            });
        });

        it('should open commits modal when commits item is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const commitsButtons = screen.getAllByText((content, element) => {
                return element?.textContent === '2 commits';
            });
            const commitsButton = commitsButtons.find((el) => el.tagName === 'BUTTON')!;
            fireEvent.click(commitsButton);

            await waitFor(() => {
                expect(screen.getByText('Commits (2)')).toBeTruthy();
            });
        });

        it('should open pull requests modal when PR item is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const prButtons = screen.getAllByText((content, element) => {
                return element?.textContent === '1 pull request';
            });
            const prButton = prButtons.find((el) => el.tagName === 'BUTTON')!;
            fireEvent.click(prButton);

            await waitFor(() => {
                expect(screen.getByText('Pull Requests (1)')).toBeTruthy();
            });
        });

        it('should open builds modal when builds item is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const buildsButtons = screen.getAllByText((content, element) => {
                return element?.textContent === '1 build';
            });
            const buildsButton = buildsButtons.find((el) => el.tagName === 'BUTTON')!;
            fireEvent.click(buildsButton);

            await waitFor(() => {
                expect(screen.getByText('Builds (1)')).toBeTruthy();
            });
        });
    });

    describe('Interaction Handlers', () => {
        it('should call onOpenExternalUrl when branch is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const buttons = screen.getAllByRole('button');
            const branchesButton = buttons.find((btn) => btn.textContent?.includes('2 branches'))!;
            fireEvent.click(branchesButton);

            await waitFor(() => {
                expect(screen.getByText('Branches (2)')).toBeTruthy();
            });

            // Click on first branch
            const branchLink = screen.getByText('feature-branch-1');
            fireEvent.click(branchLink);

            expect(mockOnOpenExternalUrl).toHaveBeenCalledWith('https://bitbucket.org/repo/branch/feature-branch-1');
        });

        it('should call onOpenExternalUrl when commit is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            // Expand and open commits modal
            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const commitsButtons = screen.getAllByText((content, element) => {
                return element?.textContent === '2 commits';
            });
            const commitsButton = commitsButtons.find((el) => el.tagName === 'BUTTON')!;
            fireEvent.click(commitsButton);

            await waitFor(() => {
                expect(screen.getByText('Commits (2)')).toBeTruthy();
            });

            const commitLink = screen.getByText('Fix: Update feature');
            fireEvent.click(commitLink);

            expect(mockOnOpenExternalUrl).toHaveBeenCalledWith('https://bitbucket.org/repo/commits/abc123');
        });

        it('should call onOpenPullRequest when PR is clicked', async () => {
            render(
                <Development
                    developmentInfo={mockDevelopmentInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const prButton = screen.getByText('1 pull request');
            fireEvent.click(prButton);

            await waitFor(() => {
                expect(screen.getByText('Pull Requests (1)')).toBeTruthy();
            });

            const prLink = screen.getByText('#1 - Feature implementation');
            fireEvent.click(prLink);

            expect(mockOnOpenPullRequest).toHaveBeenCalledWith({
                id: '1',
                title: 'Feature implementation',
                url: 'https://bitbucket.org/repo/pull-requests/1',
                state: 'OPEN',
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle items without URLs gracefully', () => {
            const infoWithoutUrls: DevelopmentInfo = {
                branches: [{ name: 'local-branch', url: undefined }],
                commits: [{ hash: 'abc', message: 'Test', authorName: 'Dev', url: undefined }],
                pullRequests: [],
                builds: [],
            };

            render(
                <Development
                    developmentInfo={infoWithoutUrls}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(screen.getByText('1 branch, 1 commit')).toBeTruthy();
        });

        it('should handle missing optional fields', () => {
            const minimalInfo: DevelopmentInfo = {
                branches: [{ name: 'main' }],
                commits: [{ message: 'Update' }],
                pullRequests: [],
                builds: [],
            };

            render(
                <Development
                    developmentInfo={minimalInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            expect(screen.getByText('1 branch, 1 commit')).toBeTruthy();
        });

        it('should truncate long commit messages', async () => {
            const longCommitInfo: DevelopmentInfo = {
                branches: [],
                commits: [
                    {
                        hash: 'abc123',
                        message:
                            'This is a very long commit message\nWith multiple lines\nThat should be truncated to first line only',
                        authorName: 'Dev',
                        url: 'https://bitbucket.org/repo/commits/abc123',
                    },
                ],
                pullRequests: [],
                builds: [],
            };

            render(
                <Development
                    developmentInfo={longCommitInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const commitsButtons = screen.getAllByText((content, element) => {
                return element?.textContent === '1 commit';
            });
            const commitsButton = commitsButtons.find((el) => el.tagName === 'BUTTON')!;
            fireEvent.click(commitsButton);

            await waitFor(() => {
                expect(screen.getByText('This is a very long commit message')).toBeTruthy();
                expect(screen.queryByText('With multiple lines')).not.toBeTruthy();
            });
        });

        it('should limit commits display to 5 items', async () => {
            const manyCommitsInfo: DevelopmentInfo = {
                branches: [],
                commits: Array.from({ length: 10 }, (_, i) => ({
                    hash: `commit${i}`,
                    message: `Commit ${i}`,
                    authorName: 'Dev',
                    url: `https://bitbucket.org/repo/commits/commit${i}`,
                })),
                pullRequests: [],
                builds: [],
            };

            render(
                <Development
                    developmentInfo={manyCommitsInfo}
                    onOpenPullRequest={mockOnOpenPullRequest}
                    onOpenExternalUrl={mockOnOpenExternalUrl}
                />,
            );

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            const commitsButtons = screen.getAllByText((content, element) => {
                return element?.textContent === '10 commits';
            });
            const commitsButton = commitsButtons.find((el) => el.tagName === 'BUTTON')!;
            fireEvent.click(commitsButton);

            await waitFor(() => {
                expect(screen.getByText('And 5 more...')).toBeTruthy();
            });
        });
    });
});
