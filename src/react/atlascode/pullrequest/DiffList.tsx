import {
    Box,
    Chip,
    Link,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import clsx from 'clsx';
import React from 'react';

import { FileDiff, FileStatus } from '../../../bitbucket/model';

const useStyles = makeStyles((theme: Theme) => ({
    monospace: {
        fontFamily: 'monospace',
    },
    chip: {
        borderRadius: '3px',
        fontWeight: 'bold',
        width: '100%',
    },
    table: {
        width: 'unset',
    },
    tableCell: {
        borderBottom: 'none',
        padding: '3px',
    },
    linesAdded: {
        backgroundColor: '#cfc',
        color: '#399839',
    },
    linesRemoved: {
        backgroundColor: '#fdd',
        color: '#c33',
    },
    fileStatusAdded: { backgroundColor: '#fff', borderColor: '#60b070', color: '#14892c' },
    fileStatusModified: { backgroundColor: '#fff', borderColor: '#a5b3c2', color: '#4a6785' },
    fileStatusDeleted: { backgroundColor: '#fff', borderColor: '#e8a29b', color: '#d04437' },
    fileStatusRenamed: { backgroundColor: '#fff', borderColor: '#c0ad9d', color: '#815b3a' },
    fileStatusCopied: { backgroundColor: '#fff', borderColor: '#f2ae00', color: '#f29900' },
    fileStatusConflict: { backgroundColor: '#f6c342', borderColor: '#f6c342', color: '#594300' },
    fileStatusDefault: { backgroundColor: '#fff', borderColor: '#881be0', color: '#7a44a6' },
}));

export const DiffList: React.FunctionComponent<{
    fileDiffs: FileDiff[];
    openDiffHandler: (filediff: FileDiff) => void;
    conflictedFiles: string[];
}> = (props) => {
    const classes = useStyles();

    const fileStatusToString = (status: FileStatus) => {
        switch (status) {
            case FileStatus.ADDED:
                return 'ADDED';
            case FileStatus.MODIFIED:
                return 'MODIFIED';
            case FileStatus.DELETED:
                return 'DELETED';
            case FileStatus.RENAMED:
                return 'RENAMED';
            case FileStatus.COPIED:
                return 'COPIED';
            case FileStatus.CONFLICT:
                return 'CONFLICT';
            default:
                return 'UNKNOWN';
        }
    };

    const fileStatusClassName = (status: FileStatus) => {
        switch (status) {
            case FileStatus.ADDED:
                return classes.fileStatusAdded;
            case FileStatus.MODIFIED:
                return classes.fileStatusModified;
            case FileStatus.DELETED:
                return classes.fileStatusDeleted;
            case FileStatus.RENAMED:
                return classes.fileStatusRenamed;
            case FileStatus.COPIED:
                return classes.fileStatusCopied;
            case FileStatus.CONFLICT:
                return classes.fileStatusConflict;
            default:
                return classes.fileStatusDefault;
        }
    };

    const ConflictChip = (fileDiff: FileDiff, conflictedFiles: string[]) => {
        // Is fileDiff's old or new path doesn't exists in conflictedFiles
        const newPath = fileDiff.newPath || '';
        const oldPath = fileDiff.oldPath || '';
        if (!conflictedFiles.includes(newPath) || !conflictedFiles.includes(oldPath)) {
            return <div></div>;
        }
        return (
            <Tooltip title={fileStatusToString(FileStatus.CONFLICT)}>
                <Chip
                    className={clsx(classes.chip, fileStatusClassName(FileStatus.CONFLICT))}
                    label={
                        <Typography className={classes.monospace}>
                            {fileStatusToString(FileStatus.CONFLICT).substring(0, 1)}
                        </Typography>
                    }
                    size="small"
                    variant="outlined"
                />
            </Tooltip>
        );
    };
    return (
        <TableContainer>
            <Table size="small" className={classes.table} aria-label="commits list">
                <TableBody>
                    {props.fileDiffs.map((row) => (
                        <TableRow key={row.file}>
                            <TableCell className={classes.tableCell} />
                            <TableCell className={classes.tableCell} align="center">
                                <Chip
                                    className={clsx(classes.chip, classes.linesAdded)}
                                    label={`+${row.linesAdded}`}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell className={classes.tableCell} align="center">
                                <Chip
                                    className={clsx(classes.chip, classes.linesRemoved)}
                                    label={`-${row.linesRemoved}`}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell className={classes.tableCell}>
                                <Tooltip
                                    title={`${fileStatusToString(row.status)} ${
                                        row.similarity ? `(${row.similarity}% similar)` : ''
                                    }`}
                                >
                                    <Chip
                                        className={clsx(classes.chip, fileStatusClassName(row.status))}
                                        label={
                                            <Typography className={classes.monospace}>
                                                {row.status.substring(0, 1)}
                                            </Typography>
                                        }
                                        size="small"
                                        variant="outlined"
                                    />
                                </Tooltip>
                            </TableCell>
                            <TableCell className={classes.tableCell}>
                                {ConflictChip(row, props.conflictedFiles)}
                            </TableCell>
                            <TableCell className={classes.tableCell}>
                                <Link component="button" onClick={() => props.openDiffHandler(row)}>
                                    <Typography>{row.file}</Typography>
                                </Link>
                            </TableCell>
                            <TableCell className={classes.tableCell}>
                                <Box hidden={!row.hasComments}>
                                    <Tooltip title={'contains comments'}>
                                        <Typography>💬</Typography>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
