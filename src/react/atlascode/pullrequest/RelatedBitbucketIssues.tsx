import {
    Link,
    makeStyles,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Theme,
    Tooltip,
    Typography,
} from '@material-ui/core';
import React from 'react';

import { BitbucketIssue } from '../../../bitbucket/model';
import Lozenge from '../common/Lozenge';

const StatusRenderer: Record<string, JSX.Element> = {
    new: <Lozenge appearance="new" label="new" />,
    open: <Lozenge appearance="inprogress" label="open" />,
    resolved: <Lozenge appearance="success" label="resolved" />,
    'on hold': <Lozenge appearance="default" label="on hold" />,
    invalid: <Lozenge appearance="moved" label="invalid" />,
    duplicate: <Lozenge appearance="default" label="duplicate" />,
    wontfix: <Lozenge appearance="removed" label="wontfix" />,
    closed: <Lozenge appearance="default" label="closed" />,
};

const useStyles = makeStyles((theme: Theme) => ({
    table: {
        width: 'unset',
    },
    tableCell: {
        borderBottom: 'none',
        align: 'left',
    },
}));

type RelatedBitbucketIssuesProps = {
    relatedIssues: BitbucketIssue[];
    openBitbucketIssue: (issue: BitbucketIssue) => void;
};
export const RelatedBitbucketIssues: React.FunctionComponent<RelatedBitbucketIssuesProps> = ({
    relatedIssues,
    openBitbucketIssue,
}) => {
    const classes = useStyles();
    return (
        <TableContainer>
            <Table size="small" aria-label="related jira issues" className={classes.table}>
                <TableBody>
                    {relatedIssues.map((issue) => (
                        <TableRow key={issue.data.id}>
                            <TableCell align={'left'}>
                                <Link href="#" onClick={() => openBitbucketIssue(issue)}>
                                    <Typography>#{issue.data.id}</Typography>
                                </Link>
                            </TableCell>
                            <TableCell align={'left'}>
                                <Typography>{issue.data.title}</Typography>
                            </TableCell>
                            <TableCell align={'left'}>
                                <Tooltip title={`Priority: ${issue.data.priority}`}>
                                    <Typography>{issue.data.priority}</Typography>
                                </Tooltip>
                            </TableCell>
                            <TableCell align={'left'}>{StatusRenderer[issue.data.state]}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
