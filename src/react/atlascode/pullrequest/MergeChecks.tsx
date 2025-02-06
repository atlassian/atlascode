import { Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import * as React from 'react';
import { PullRequestData } from '../../../bitbucket/model';
import * as l10n from '@vscode/l10n';

type MergeChecksProps = {
    prData: PullRequestData;
};

export const MergeChecks: React.FC<MergeChecksProps> = ({ prData }) => {
    const { taskCount, participants, buildStatuses } = prData;
    const openTaskCount = taskCount;
    const approvalCount = participants.filter((p) => p.status === 'APPROVED').length;
    const needsWorkCount = participants.filter((p) => p.status === 'NEEDS_WORK').length;
    let unsuccessfulBuilds = false;
    if (Array.isArray(buildStatuses) && buildStatuses.length > 0) {
        const successes = buildStatuses.filter((status) => status.state === 'SUCCESSFUL');
        unsuccessfulBuilds = buildStatuses.length !== successes.length;
    }

    const allClear = approvalCount > 0 && openTaskCount === 0 && needsWorkCount === 0 && !unsuccessfulBuilds;

    return (
        <Alert variant="standard" severity={allClear ? 'success' : 'warning'}>
            <Typography>
                {approvalCount === 0
                    ? l10n.t('Pull request has no approvals')
                    : approvalCount === 1
                      ? l10n.t('Pull request has 1 approval')
                      : l10n.t('Pull request has {0} approvals', approvalCount)}
            </Typography>

            {openTaskCount > 0 && <Typography>{l10n.t('Pull request has unresolved tasks')}</Typography>}
            {needsWorkCount > 0 && <Typography>{l10n.t('Pull request has been marked as - Needs work')}</Typography>}
            {unsuccessfulBuilds && <Typography>{l10n.t('Pull request has unsuccessful builds')}</Typography>}
        </Alert>
    );
};
