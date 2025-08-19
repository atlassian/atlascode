import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { UpstreamSelector } from './UpstreamSelector';

describe('UpstreamSelector', () => {
    const mockRepoData: RepoData = {
        workspaceRepo: {
            rootUri: '/test/repo',
            mainSiteRemote: { site: undefined, remote: { name: 'origin', isReadOnly: false } },
            siteRemotes: [
                { site: undefined, remote: { name: 'origin', isReadOnly: false } },
                { site: undefined, remote: { name: 'upstream', isReadOnly: false } },
            ],
        },
        localBranches: [],
        remoteBranches: [],
        branchTypes: [],
        developmentBranch: 'main',
        userName: 'test',
        userEmail: 'test@example.com',
        isCloud: false,
    };

    it('should not render when only one remote', () => {
        const repoWithOneRemote = {
            ...mockRepoData,
            workspaceRepo: {
                ...mockRepoData.workspaceRepo,
                siteRemotes: [{ site: undefined, remote: { name: 'origin', isReadOnly: false } }],
            },
        };

        const { container } = render(
            <UpstreamSelector selectedRepository={repoWithOneRemote} upstream="origin" onUpstreamChange={jest.fn()} />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('should handle upstream change', () => {
        const onUpstreamChange = jest.fn();
        render(
            <UpstreamSelector
                selectedRepository={mockRepoData}
                upstream="origin"
                onUpstreamChange={onUpstreamChange}
            />,
        );

        const select = screen.getByDisplayValue('origin');
        fireEvent.change(select, { target: { value: 'upstream' } });

        expect(onUpstreamChange).toHaveBeenCalledWith('upstream');
    });
});
