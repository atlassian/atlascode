import { emptyTransition, MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Box, Checkbox, MenuItem, TableCell, TableRow, TextField, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useCallback, useEffect, useState } from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { colorToLozengeAppearanceMap } from '../../vscode/theme/colors';
import Lozenge from '../common/Lozenge';

const useStyles = makeStyles((theme: Theme) => ({
    tableCell: {
        borderBottom: 'none',
        align: 'align',
    },
}));

type JiraTransitionMenuProps = {
    issue: MinimalIssue<DetailedSiteInfo>;
    handleIssueTransition: (issueToTransition: MinimalIssue<DetailedSiteInfo>, transition: Transition) => void;
    onShouldTransitionChange: (issueId: string, shouldChange: boolean) => void;
};

export const JiraTransitionMenu: React.FC<JiraTransitionMenuProps> = ({
    issue,
    handleIssueTransition,
    onShouldTransitionChange,
}) => {
    const classes = useStyles();
    const [transition, setTransition] = useState<Transition>(emptyTransition);
    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(false);

    const toggleTransitionIssueEnabled = useCallback(() => {
        setTransitionIssueEnabled(!transitionIssueEnabled);
    }, [transitionIssueEnabled]);

    const handleIssueTransitionChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setTransition(event.target.value);
            handleIssueTransition(issue, event.target.value);
            setTransitionIssueEnabled(true);
        },
        [setTransition, handleIssueTransition, issue],
    );

    useEffect(() => {
        if (issue.transitions?.length > 0) {
            setTransition(issue.transitions.find((t) => t.to.id === issue.status.id) || issue.transitions[0]);
        } else {
            setTransition(emptyTransition);
        }
    }, [issue]);

    useEffect(() => {
        onShouldTransitionChange(issue.id, transitionIssueEnabled);
    }, [issue.id, transitionIssueEnabled, onShouldTransitionChange]);

    return issue.transitions?.length < 1 ? (
        <Box />
    ) : (
        <TableRow key={issue.id}>
            <TableCell className={classes.tableCell}>
                <Checkbox color={'primary'} checked={transitionIssueEnabled} onChange={toggleTransitionIssueEnabled} />
            </TableCell>
            <TableCell className={classes.tableCell}>
                <Typography>
                    <strong>{issue.key}</strong>: {issue.summary}
                </Typography>
            </TableCell>
            <TableCell className={classes.tableCell}>
                <TextField select value={transition} onChange={handleIssueTransitionChange}>
                    {(issue.transitions || [emptyTransition]).map((transition) => (
                        //@ts-ignore
                        <MenuItem key={transition.id} value={transition}>
                            <Lozenge
                                appearance={colorToLozengeAppearanceMap[transition.to.statusCategory.colorName]}
                                label={transition.to.name}
                            />
                        </MenuItem>
                    ))}
                </TextField>
            </TableCell>
        </TableRow>
    );
};
