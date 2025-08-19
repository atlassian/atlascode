import { Box, Checkbox, FormControlLabel, Grid, Typography } from '@mui/material';
import React, { useCallback } from 'react';

import { CreateBranchSectionProps } from '../types';
import { BranchPrefixSelector } from './BranchPrefixSelector';
import { ExistingBranchesSection } from './ExistingBranchesSection';
import { LocalBranchInput } from './LocalBranchInput';
import { PushBranchToggle } from './PushBranchToggle';
import { RepositorySelector } from './RepositorySelector';
import { SourceBranchSelector } from './SourceBranchSelector';
import { UpstreamSelector } from './UpstreamSelector';

export const CreateBranchSection: React.FC<CreateBranchSectionProps> = ({
    state,
    controller,
    formState,
    formActions,
}) => {
    const {
        pushBranchEnabled,
        localBranch,
        sourceBranch,
        selectedRepository,
        selectedBranchType,
        upstream,
        branchSetupEnabled,
    } = formState;
    const {
        onPushBranchChange,
        onLocalBranchChange,
        onSourceBranchChange,
        onRepositoryChange,
        onBranchTypeChange,
        onUpstreamChange,
        onBranchSetupEnabledChange,
    } = formActions;

    const handleExistingBranchClick = useCallback(
        (existingBranchName: string) => {
            if (!selectedRepository) {
                return;
            }

            const sourceBranchOption = [...selectedRepository.localBranches, ...selectedRepository.remoteBranches].find(
                (branch) => branch.name === existingBranchName,
            )!;

            const updatedLocalBranch =
                sourceBranchOption.type === 0
                    ? sourceBranchOption.name!
                    : sourceBranchOption.name!.substring(sourceBranchOption.remote!.length + 1);

            // Convert custom prefixes to branch types format for finding the branch type
            const convertedCustomPrefixes = state.customPrefixes.map((prefix) => {
                const normalizedCustomPrefix = prefix.endsWith('/') ? prefix : prefix + '/';
                return { prefix: normalizedCustomPrefix, kind: prefix };
            });

            const bt = [...selectedRepository.branchTypes, ...convertedCustomPrefixes].find((branchType) =>
                existingBranchName.startsWith(branchType.prefix),
            )!;

            onBranchTypeChange(bt);

            // HACK: without this wait, the update to local branch gets overwritten by buildBranchName since that function is called
            // every time branchType is changed. This is a quick fix, but a better solution would be to create two state variables
            // for prefixes: one for the autocomplete and the other the "real" prefix. Then, set the "real" prefix to "ExistingBranch" here
            // and don't call buildBranchName if the "real" prefix is "ExistingBranch".
            setTimeout(() => {
                onLocalBranchChange(updatedLocalBranch.substring(bt.prefix.length));
            }, 100);

            onSourceBranchChange(sourceBranchOption);
        },
        [selectedRepository, state.customPrefixes, onBranchTypeChange, onLocalBranchChange, onSourceBranchChange],
    );

    return (
        <Box
            border={1}
            borderRadius="3px"
            borderColor="var(--vscode-list-inactiveSelectionBackground)"
            padding={3}
            marginBottom={2}
        >
            <FormControlLabel
                control={
                    <Checkbox
                        checked={branchSetupEnabled}
                        onChange={(e) => onBranchSetupEnabledChange(e.target.checked)}
                    />
                }
                label={
                    <Typography variant="h5" style={{ fontWeight: 700 }}>
                        Create branch
                    </Typography>
                }
            />

            {branchSetupEnabled && (
                <Grid container spacing={2} direction="column">
                    <RepositorySelector
                        repoData={state.repoData}
                        selectedRepository={selectedRepository}
                        onRepositoryChange={onRepositoryChange}
                    />

                    <BranchPrefixSelector
                        selectedRepository={selectedRepository}
                        selectedBranchType={selectedBranchType}
                        customPrefixes={state.customPrefixes}
                        onBranchTypeChange={onBranchTypeChange}
                    />

                    <LocalBranchInput localBranch={localBranch} onLocalBranchChange={onLocalBranchChange} />

                    <SourceBranchSelector
                        selectedRepository={selectedRepository}
                        sourceBranch={sourceBranch}
                        onSourceBranchChange={onSourceBranchChange}
                    />

                    <UpstreamSelector
                        selectedRepository={selectedRepository}
                        upstream={upstream}
                        onUpstreamChange={onUpstreamChange}
                    />

                    <ExistingBranchesSection
                        selectedRepository={selectedRepository}
                        issueKey={state.issue.key}
                        onExistingBranchClick={handleExistingBranchClick}
                    />

                    <PushBranchToggle pushBranchEnabled={pushBranchEnabled} onPushBranchChange={onPushBranchChange} />
                </Grid>
            )}
        </Box>
    );
};
