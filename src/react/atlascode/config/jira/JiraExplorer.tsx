import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, Link, makeStyles, Switch, Theme, Tooltip, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../config/model';
import { ConfigSection } from '../../../../lib/ipc/models/config';
import { IntervalInput } from '../../common/IntervalInput';
import { PrepareCommitTip } from '../../common/PrepareCommitTip';
import { useBorderBoxStyles } from '../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../configController';
import { JQLListEditor } from './jql/JQLListEditor';
import * as l10n from '@vscode/l10n';

type JiraExplorerProps = {
    enabled: boolean;
    nestSubtasks: boolean;
    fetchAllQueryResults: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
    jqlList: JQLEntry[];
    sites: DetailedSiteInfo[];
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            indent: {
                marginLeft: theme.spacing(3),
            },
        }) as const,
);

export const JiraExplorer: React.FunctionComponent<JiraExplorerProps> = memo(
    ({ enabled, nestSubtasks, fetchAllQueryResults, monitorEnabled, refreshInterval, sites, jqlList }) => {
        const classes = useStyles();
        const boxClass = useBorderBoxStyles();
        const controller = useContext(ConfigControllerContext);

        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Jira}.${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        const handleInterval = useCallback((n: number) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Jira}.explorer.refreshInterval`] = n;
            setChanges(changes);
        }, []);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, controller]);

        return (
            <Grid container direction="column" spacing={2}>
                <Grid item>
                    <PrepareCommitTip />
                </Grid>

                <Grid item>
                    <Grid container direction="row" spacing={1}>
                        <Grid item>
                            <Tooltip title={l10n.t('Enable Jira Explorer')}>
                                <Switch
                                    size="small"
                                    color="primary"
                                    value="explorer.enabled"
                                    checked={enabled}
                                    onChange={handleChange}
                                />
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Typography variant="body1">{l10n.t('Enable Jira Explorer')}</Typography>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Tooltip title={l10n.t('Enable issue grouping')}>
                                <Switch
                                    className={classes.indent}
                                    disabled={!enabled}
                                    color="primary"
                                    size="small"
                                    value="explorer.nestSubtasks"
                                    checked={nestSubtasks}
                                    onChange={handleChange}
                                />
                            </Tooltip>
                        }
                        label={l10n.t('Group issues by epic')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>

                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Tooltip title={l10n.t('Fetch all Results')}>
                                <Switch
                                    className={classes.indent}
                                    disabled={!enabled}
                                    color="primary"
                                    size="small"
                                    checked={fetchAllQueryResults}
                                    value="explorer.fetchAllQueryResults"
                                    onChange={handleChange}
                                />
                            </Tooltip>
                        }
                        label={l10n.t(
                            'Fetch all JQL query results (default is 100, enabling this could cause performance issues)',
                        )}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>

                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Tooltip title={l10n.t('Enable Notifications')}>
                                <Switch
                                    className={classes.indent}
                                    disabled={!enabled}
                                    color="primary"
                                    size="small"
                                    checked={monitorEnabled}
                                    value="explorer.monitorEnabled"
                                    onChange={handleChange}
                                />
                            </Tooltip>
                        }
                        label={l10n.t('Show notifications when new issues are created matching the JQLs/Filters below')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>

                <Grid item>
                    <Grid container direction="row" spacing={1} alignItems="center">
                        <Grid item>
                            <IntervalInput
                                className={classes.indent}
                                interval={refreshInterval}
                                max={120}
                                label={l10n.t('Refresh interval:')}
                                enabled={enabled}
                                units="minutes"
                                onChange={handleInterval}
                            />
                        </Grid>
                        <Grid item>
                            <Typography variant="subtitle2">
                                {l10n.t('(setting to 0 disables auto-refresh)')}
                            </Typography>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item>
                    <Box marginTop={2}>
                        <Typography component="div" variant="h4">
                            <Box display="inline" fontWeight="fontWeightBold">
                                {l10n.t('Filters and Custom JQL')}
                            </Box>
                            <Box display="inline" marginLeft={3}>
                                <Link href="https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14">
                                    {l10n.t('What is JQL?')}
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
    },
);
