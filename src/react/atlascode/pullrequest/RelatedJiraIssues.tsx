import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import {
    Box,
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
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { colorToLozengeAppearanceMap } from '../../vscode/theme/colors';
import Lozenge from '../common/Lozenge';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme: Theme) => ({
    table: {
        width: 'unset',
    },
    tableCell: {
        borderBottom: 'none',
    },
}));

type RelatedJiraIssuesProps = {
    relatedIssues: MinimalIssue<DetailedSiteInfo>[];
    openJiraIssue: (issue: MinimalIssue<DetailedSiteInfo>) => void;
};
export const RelatedJiraIssues: React.FunctionComponent<RelatedJiraIssuesProps> = ({
    relatedIssues,
    openJiraIssue,
}) => {
    const classes = useStyles();
    return (
        <TableContainer>
            <Table size="small" aria-label={l10n.t('related jira issues')} className={classes.table}>
                <TableBody>
                    {relatedIssues.map((issue) => (
                        <TableRow key={issue.id}>
                            <TableCell align={'left'} className={classes.tableCell}>
                                <Box width={16} height={16}>
                                    <Tooltip title={issue.issuetype.name}>
                                        <img style={{ width: '100%' }} src={issue.issuetype.iconUrl} />
                                    </Tooltip>
                                </Box>
                            </TableCell>
                            <TableCell align={'left'} className={classes.tableCell}>
                                <Link href="#" onClick={() => openJiraIssue(issue)}>
                                    <Typography>{issue.key}</Typography>
                                </Link>
                            </TableCell>
                            <TableCell align={'left'} className={classes.tableCell}>
                                <Typography>{issue.summary}</Typography>
                            </TableCell>
                            <TableCell align={'left'} className={classes.tableCell}>
                                <Box width={16} height={16}>
                                    <Tooltip title={`Priority: ${issue.priority.name}`}>
                                        <img style={{ width: '100%' }} src={issue.priority.iconUrl} />
                                    </Tooltip>
                                </Box>
                            </TableCell>
                            <TableCell align={'left'} className={classes.tableCell}>
                                <Lozenge
                                    appearance={colorToLozengeAppearanceMap[issue.status.statusCategory.colorName]}
                                    label={issue.status.name}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
