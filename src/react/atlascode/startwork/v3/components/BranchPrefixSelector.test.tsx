import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { BranchPrefixSelector } from './BranchPrefixSelector';

describe('BranchPrefixSelector', () => {
    const mockRepoData: RepoData = {
        workspaceRepo: {
            rootUri: '/test/repo',
            mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
            siteRemotes: [{ site: undefined, remote: { name: 'origin', isReadOnly: false } }],
        },
        localBranches: [],
        remoteBranches: [],
        branchTypes: [
            { kind: 'Feature', prefix: 'feature/' },
            { kind: 'Bugfix', prefix: 'bugfix/' },
        ],
        developmentBranch: 'main',
        userName: 'test',
        userEmail: 'test@example.com',
        isCloud: false,
    };

    it('should not render when no branch types or custom prefixes', () => {
        const repoWithoutBranchTypes = {
            ...mockRepoData,
            branchTypes: [],
        };

        const { container } = render(
            <BranchPrefixSelector
                selectedRepository={repoWithoutBranchTypes}
                selectedBranchType={{ kind: 'Feature', prefix: 'feature/' }}
                customPrefixes={[]}
                onBranchTypeChange={jest.fn()}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render with branch types', () => {
        render(
            <BranchPrefixSelector
                selectedRepository={mockRepoData}
                selectedBranchType={{ kind: 'Feature', prefix: 'feature/' }}
                customPrefixes={[]}
                onBranchTypeChange={jest.fn()}
            />,
        );

        expect(screen.getByText('Branch prefix')).toBeTruthy();
    });

    it('should render with custom prefixes when no branch types', () => {
        const repoWithoutBranchTypes = {
            ...mockRepoData,
            branchTypes: [],
        };

        render(
            <BranchPrefixSelector
                selectedRepository={repoWithoutBranchTypes}
                selectedBranchType={{ kind: 'hotfix', prefix: 'hotfix/' }}
                customPrefixes={['hotfix', 'chore']}
                onBranchTypeChange={jest.fn()}
            />,
        );

        expect(screen.getByText('Branch prefix')).toBeTruthy();
    });

    it('should render with both branch types and custom prefixes', () => {
        render(
            <BranchPrefixSelector
                selectedRepository={mockRepoData}
                selectedBranchType={{ kind: 'Feature', prefix: 'feature/' }}
                customPrefixes={['hotfix', 'chore']}
                onBranchTypeChange={jest.fn()}
            />,
        );

        expect(screen.getByText('Branch prefix')).toBeTruthy();
    });

    it('should clear selection when clear button is clicked', () => {
        const mockOnBranchTypeChange = jest.fn();

        render(
            <BranchPrefixSelector
                selectedRepository={mockRepoData}
                selectedBranchType={{ kind: 'Feature', prefix: 'feature/' }}
                customPrefixes={[]}
                onBranchTypeChange={mockOnBranchTypeChange}
            />,
        );

        const clearButton = screen.getByLabelText('Clear');

        fireEvent.click(clearButton);

        expect(mockOnBranchTypeChange).toHaveBeenCalledWith({ kind: '', prefix: '' });
    });
});
