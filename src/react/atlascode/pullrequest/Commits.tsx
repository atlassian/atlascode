import { Link, Table, TableBody, TableCell, TableContainer, TableRow, Theme, Tooltip, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { differenceInWeeks, format, formatDistanceToNow } from 'date-fns';
import React, { useMemo } from 'react';

import { Commit } from '../../../bitbucket/model';

const useStyles = makeStyles((theme: Theme) => ({
    monospace: {
        fontFamily: 'monospace',
    },
}));

export const Commits: React.FunctionComponent<{ commits: Commit[] }> = (props) => {
    const classes = useStyles();

    const commitsData = useMemo(
        () =>
            props.commits
                .map((commit) => {
                    return {
                        hash: commit.hash,
                        message: commit.message,
                        href: commit.url,
                        ts: new Date(commit.ts),
                    };
                })
                .map((row) => (
                    <TableRow key={row.hash}>
                        <TableCell>
                            <Link href={row.href}>
                                <Typography className={classes.monospace}>{row.hash.substring(0, 8)}</Typography>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Tooltip title={row.message} placement="bottom-start">
                                <Typography>{row.message.trim().split('\n')[0]}</Typography>
                            </Tooltip>
                        </TableCell>
                        <TableCell>
                            <Tooltip title={row.ts.toLocaleString()}>
                                <Typography>
                                    {differenceInWeeks(row.ts, new Date()) === 0
                                        ? formatDistanceToNow(row.ts, { addSuffix: true })
                                        : format(row.ts, 'yyyy-MM-dd')}
                                </Typography>
                            </Tooltip>
                        </TableCell>
                    </TableRow>
                )),
        [classes.monospace, props.commits],
    );

    return (
        <TableContainer>
            <Table size="small" aria-label="commits list">
                <TableBody>{commitsData}</TableBody>
            </Table>
        </TableContainer>
    );
};
