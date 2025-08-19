import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { RepositorySelector } from './RepositorySelector';

describe('RepositorySelector', () => {
    const mockRepoData: RepoData[] = [
        {
            workspaceRepo: {
                rootUri: '/test/repo1',
                mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
                siteRemotes: [{ site: undefined, remote: { name: 'origin', isReadOnly: false } }],
            },
            localBranches: [],
            remoteBranches: [],
            branchTypes: [],
            developmentBranch: 'main',
            userName: 'test',
            userEmail: 'test@example.com',
            isCloud: false,
        },
        {
            workspaceRepo: {
                rootUri: '/test/repo2',
                mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
                siteRemotes: [{ site: undefined, remote: { name: 'origin', isReadOnly: false } }],
            },
            localBranches: [],
            remoteBranches: [],
            branchTypes: [],
            developmentBranch: 'main',
            userName: 'test',
            userEmail: 'test@example.com',
            isCloud: false,
        },
    ];

    it('should not render when only one repository', () => {
        const onRepositoryChange = jest.fn();
        const { container } = render(
            <RepositorySelector
                repoData={[mockRepoData[0]]}
                selectedRepository={mockRepoData[0]}
                onRepositoryChange={onRepositoryChange}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('should handle repository change', () => {
        const onRepositoryChange = jest.fn();
        render(
            <RepositorySelector
                repoData={mockRepoData}
                selectedRepository={mockRepoData[0]}
                onRepositoryChange={onRepositoryChange}
            />,
        );

        const select = screen.getByDisplayValue('/test/repo1');
        fireEvent.change(select, { target: { value: '/test/repo2' } });

        expect(onRepositoryChange).toHaveBeenCalledWith(mockRepoData[1]);
    });
});
