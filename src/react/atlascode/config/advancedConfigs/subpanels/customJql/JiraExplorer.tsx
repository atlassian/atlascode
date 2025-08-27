import { Box, Grid, Link, Typography } from '@mui/material';
import React, { memo } from 'react';

import { DetailedSiteInfo } from '../../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../../config/model';
import { PrepareCommitTip } from '../../../../common/PrepareCommitTip';
import { useBorderBoxStyles } from '../../../../common/useBorderBoxStyles';
import { JQLListEditor } from './../../../jira/jql/JQLListEditor';

type JiraExplorerProps = {
    enabled: boolean;
    jqlList: JQLEntry[];
    sites: DetailedSiteInfo[];
};

export const JiraExplorer: React.FunctionComponent<JiraExplorerProps> = memo(({ enabled, sites, jqlList }) => {
    const boxClass = useBorderBoxStyles();

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                <PrepareCommitTip />
            </Grid>
            <Grid item>
                <Box marginTop={2}>
                    <Typography component="div" variant="h4">
                        <Box display="inline" marginLeft={3}>
                            <Link href="https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14">
                                What is JQL?
                            </Link>
                        </Box>
                    </Typography>
                </Box>
            </Grid>
            <Grid item>
                <Box className={boxClass.box} paddingBottom={2}>
                    <JQLListEditor sites={sites} jqlList={jqlList} />
                </Box>
            </Grid>
        </Grid>
    );
});
