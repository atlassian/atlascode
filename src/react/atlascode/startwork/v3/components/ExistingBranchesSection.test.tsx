import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { ExistingBranchesSection } from './ExistingBranchesSection';

describe('ExistingBranchesSection', () => {
    const mockRepoData: RepoData = {
        workspaceRepo: {
            rootUri: '/test/repo',
            mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
            siteRemotes: [{ site: undefined, remote: { name: 'origin', isReadOnly: false } }],
        },
        localBranches: [
            { name: 'feature/TEST-123-test-issue', type: 0 },
            { name: 'bugfix/TEST-123-fix', type: 0 },
        ],
        remoteBranches: [{ name: 'origin/feature/TEST-123-old', type: 1, remote: 'origin' }],
        branchTypes: [],
        developmentBranch: 'main',
        userName: 'test',
        userEmail: 'test@example.com',
        isCloud: false,
    };

    it('should not render when no existing branches', () => {
        const repoWithoutBranches = {
            ...mockRepoData,
            localBranches: [],
            remoteBranches: [],
        };

        const { container } = render(
            <ExistingBranchesSection
                selectedRepository={repoWithoutBranches}
                issueKey="TEST-123"
                onExistingBranchClick={jest.fn()}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('should handle existing branch click', () => {
        const onExistingBranchClick = jest.fn();
        render(
            <ExistingBranchesSection
                selectedRepository={mockRepoData}
                issueKey="TEST-123"
                onExistingBranchClick={onExistingBranchClick}
            />,
        );

        const branchLink = screen.getByText('feature/TEST-123-test-issue');
        fireEvent.click(branchLink);

        expect(onExistingBranchClick).toHaveBeenCalledWith('feature/TEST-123-test-issue');
    });
});
