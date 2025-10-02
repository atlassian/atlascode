import { render, screen } from '@testing-library/react';
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

    it('should render even when no branch types or custom prefixes', () => {
        const repoWithoutBranchTypes = {
            ...mockRepoData,
            branchTypes: [],
        };

        render(
            <BranchPrefixSelector
                selectedRepository={repoWithoutBranchTypes}
                selectedBranchType={{ kind: '', prefix: '' }}
                customPrefixes={[]}
                onBranchTypeChange={jest.fn()}
            />,
        );

        expect(screen.getByText('Branch prefix')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter prefix (optional)')).toBeTruthy();
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
});
