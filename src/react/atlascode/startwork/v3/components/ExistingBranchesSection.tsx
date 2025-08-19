import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, Card, CardContent, Grid, Link, Typography } from '@mui/material';
import React, { useCallback } from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../../typings/git';

interface ExistingBranchesSectionProps {
    selectedRepository: RepoData | undefined;
    issueKey: string;
    onExistingBranchClick: (branchName: string) => void;
}

export const ExistingBranchesSection: React.FC<ExistingBranchesSectionProps> = ({
    selectedRepository,
    issueKey,
    onExistingBranchClick,
}) => {
    const handleExistingBranchClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            const existingBranchName = e.currentTarget.dataset.branchName || '';
            onExistingBranchClick(existingBranchName);
        },
        [onExistingBranchClick],
    );

    // Filter branches that contain the issue key
    const existingBranches = React.useMemo(() => {
        if (!selectedRepository) {
            return [];
        }

        return [
            ...selectedRepository.localBranches.filter((b) => b.name?.toLowerCase().includes(issueKey.toLowerCase())),
            ...selectedRepository.remoteBranches
                .filter((b) => b.name?.toLowerCase().includes(issueKey.toLowerCase()))
                .filter(
                    (remoteBranch) =>
                        !selectedRepository.localBranches.some((localBranch) =>
                            remoteBranch.name!.endsWith(localBranch.name!),
                        ),
                ),
        ];
    }, [selectedRepository, issueKey]);

    if (existingBranches.length === 0) {
        return null;
    }

    return (
        <Grid item>
            <Card raised>
                <CardContent>
                    <Grid container spacing={1}>
                        <Grid item>
                            <HelpOutlineIcon />
                        </Grid>
                        <Grid item>
                            <Typography>Use an existing branch?</Typography>
                            <Typography variant="subtitle2">Click to use an existing branch for this issue</Typography>
                        </Grid>
                    </Grid>
                    <Box component="ul" marginTop={1} marginBottom={1}>
                        {existingBranches.map((b: Branch) => (
                            <Box component="li" key={b.name!} marginBottom={0.5}>
                                <Link
                                    href="#"
                                    data-branch-name={b.name}
                                    onClick={handleExistingBranchClick}
                                    color="primary"
                                >
                                    {b.type === 0 ? b.name : b.name?.substring(b.remote!.length + 1)}
                                </Link>
                            </Box>
                        ))}
                    </Box>
                    <Typography variant="subtitle2" color="textSecondary">
                        * source branch selection is ignored for existing branches
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    );
};
